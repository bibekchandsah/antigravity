const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

let dbType = 'sqlite';
let sqliteDb;
let pgPool;

// Check for DATABASE_URL (Render provides this)
if (process.env.DATABASE_URL) {
    dbType = 'postgres';
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Render's self-signed certs
        }
    });
    console.log('Connected to PostgreSQL');
    initPg();
} else {
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening SQLite database:', err.message);
        } else {
            console.log('Connected to SQLite database.');
            initSqlite();
        }
    });
}

function initSqlite() {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        ip TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        org TEXT,
        browser TEXT,
        os TEXT,
        device TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS active_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        user_id TEXT,
        ip TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initPg() {
    pgPool.query(`CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        type TEXT,
        ip TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        org TEXT,
        browser TEXT,
        os TEXT,
        device TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating PG table:', err.message);
    });
    pgPool.query(`CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT UNIQUE,
        user_id TEXT,
        ip TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating PG session table:', err.message);
    });
}

const logLogin = (details) => {
    const { type, ip, city, region, country, org, browser, os, device } = details;

    if (dbType === 'postgres') {
        const query = `INSERT INTO login_logs (type, ip, city, region, country, org, browser, os, device) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        pgPool.query(query, [type, ip, city, region, country, org, browser, os, device], (err) => {
            if (err) console.error('Error logging to PG:', err.message);
        });
    } else {
        const stmt = sqliteDb.prepare(`INSERT INTO login_logs (type, ip, city, region, country, org, browser, os, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(type, ip, city, region, country, org, browser, os, device, (err) => {
            if (err) console.error('Error logging to SQLite:', err.message);
        });
        stmt.finalize();
    }
};

const getStats = (callback) => {
    const stats = {};

    if (dbType === 'postgres') {
        // PostgreSQL Queries
        const successfulQuery = `SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= NOW() - INTERVAL '7 days' AND type LIKE 'Successful%' GROUP BY date(timestamp)`;
        const failedQuery = `SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= NOW() - INTERVAL '7 days' AND (type LIKE 'Failed%' OR type LIKE 'Unauthorized%') GROUP BY date(timestamp)`;
        const hourlyQuery = `SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count FROM login_logs GROUP BY hour ORDER BY hour`;

        const browserQuery = `SELECT browser, COUNT(*) as count FROM login_logs GROUP BY browser`;
        const osQuery = `SELECT os, COUNT(*) as count FROM login_logs GROUP BY os`;
        const cityQuery = `SELECT city, COUNT(*) as count FROM login_logs GROUP BY city`;
        const regionQuery = `SELECT region, COUNT(*) as count FROM login_logs GROUP BY region`;
        const countryQuery = `SELECT country, COUNT(*) as count FROM login_logs GROUP BY country`;
        const deviceQuery = `SELECT device, COUNT(*) as count FROM login_logs GROUP BY device`;
        const logsQuery = `SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 20`;

        pgPool.query(successfulQuery, (err, resSuccess) => {
            if (err) return callback(err);
            stats.successfulLogins = resSuccess.rows;

            pgPool.query(failedQuery, (err, resFailed) => {
                if (err) return callback(err);
                stats.failedLogins = resFailed.rows;

                pgPool.query(hourlyQuery, (err, resHourly) => {
                    if (err) return callback(err);
                    stats.hourlyActivity = resHourly.rows;

                    pgPool.query(browserQuery, (err, resBrowser) => {
                        if (err) return callback(err);
                        stats.browserDistribution = resBrowser.rows;

                        pgPool.query(osQuery, (err, resOs) => {
                            if (err) return callback(err);
                            stats.osDistribution = resOs.rows;

                            pgPool.query(cityQuery, (err, resCity) => {
                                if (err) return callback(err);
                                stats.cityDistribution = resCity.rows;

                                pgPool.query(regionQuery, (err, resRegion) => {
                                    if (err) return callback(err);
                                    stats.regionDistribution = resRegion.rows;

                                    pgPool.query(countryQuery, (err, resCountry) => {
                                        if (err) return callback(err);
                                        stats.countryDistribution = resCountry.rows;

                                        pgPool.query(deviceQuery, (err, resDevice) => {
                                            if (err) return callback(err);
                                            stats.deviceDistribution = resDevice.rows;

                                            pgPool.query(logsQuery, (err, resLogs) => {
                                                if (err) return callback(err);
                                                stats.recentLogs = resLogs.rows;
                                                callback(null, stats);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

    } else {
        // SQLite Queries
        sqliteDb.serialize(() => {
            sqliteDb.all(`SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= date('now', '-7 days') AND type LIKE 'Successful%' GROUP BY date(timestamp)`, (err, rows) => {
                if (err) return callback(err);
                stats.successfulLogins = rows;

                sqliteDb.all(`SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= date('now', '-7 days') AND (type LIKE 'Failed%' OR type LIKE 'Unauthorized%') GROUP BY date(timestamp)`, (err, rows) => {
                    if (err) return callback(err);
                    stats.failedLogins = rows;

                    sqliteDb.all(`SELECT strftime('%H', timestamp) as hour, COUNT(*) as count FROM login_logs GROUP BY hour ORDER BY hour`, (err, rows) => {
                        if (err) return callback(err);
                        stats.hourlyActivity = rows;

                        sqliteDb.all(`SELECT browser, COUNT(*) as count FROM login_logs GROUP BY browser`, (err, rows) => {
                            if (err) return callback(err);
                            stats.browserDistribution = rows;

                            sqliteDb.all(`SELECT os, COUNT(*) as count FROM login_logs GROUP BY os`, (err, rows) => {
                                if (err) return callback(err);
                                stats.osDistribution = rows;

                                sqliteDb.all(`SELECT city, COUNT(*) as count FROM login_logs GROUP BY city`, (err, rows) => {
                                    if (err) return callback(err);
                                    stats.cityDistribution = rows;

                                    sqliteDb.all(`SELECT region, COUNT(*) as count FROM login_logs GROUP BY region`, (err, rows) => {
                                        if (err) return callback(err);
                                        stats.regionDistribution = rows;

                                        sqliteDb.all(`SELECT country, COUNT(*) as count FROM login_logs GROUP BY country`, (err, rows) => {
                                            if (err) return callback(err);
                                            stats.countryDistribution = rows;

                                            sqliteDb.all(`SELECT device, COUNT(*) as count FROM login_logs GROUP BY device`, (err, rows) => {
                                                if (err) return callback(err);
                                                stats.deviceDistribution = rows;

                                                sqliteDb.all(`SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 20`, (err, rows) => {
                                                    if (err) return callback(err);
                                                    stats.recentLogs = rows;
                                                    callback(null, stats);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
};

// Get activity logs with pagination
const getActivityLogs = (offset = 0, limit = 10, callback) => {
    if (dbType === 'postgres') {
        const query = `SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`;
        pgPool.query(query, [limit, offset], (err, res) => {
            if (err) return callback(err);
            callback(null, res.rows);
        });
    } else {
        const query = `SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        sqliteDb.all(query, [limit, offset], (err, rows) => {
            if (err) return callback(err);
            callback(null, rows);
        });
    }
};



// Session Management
const createSession = (session) => {
    const { id, user_id, ip, device, browser, os } = session;
    if (dbType === 'postgres') {
        const query = `INSERT INTO active_sessions (session_id, user_id, ip, device, browser, os) VALUES ($1, $2, $3, $4, $5, $6)`;
        pgPool.query(query, [id, user_id, ip, device, browser, os], (err) => {
            if (err) console.error('Error creating session PG:', err.message);
        });
    } else {
        const stmt = sqliteDb.prepare(`INSERT INTO active_sessions (session_id, user_id, ip, device, browser, os) VALUES (?, ?, ?, ?, ?, ?)`);
        stmt.run(id, user_id, ip, device, browser, os, (err) => {
            if (err) console.error('Error creating session SQLite:', err.message);
        });
        stmt.finalize();
    }
};

const getSession = (sessionId, callback) => {
    if (dbType === 'postgres') {
        pgPool.query(`SELECT * FROM active_sessions WHERE session_id = $1`, [sessionId], (err, res) => {
            if (err) return callback(err);
            callback(null, res.rows[0]);
        });
    } else {
        sqliteDb.get(`SELECT * FROM active_sessions WHERE session_id = ?`, [sessionId], (err, row) => {
            if (err) return callback(err);
            callback(null, row);
        });
    }
};

const updateSessionActivity = (sessionId) => {
    if (dbType === 'postgres') {
        pgPool.query(`UPDATE active_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = $1`, [sessionId]);
    } else {
        sqliteDb.run(`UPDATE active_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ?`, [sessionId]);
    }
};

const revokeSession = (sessionId, callback) => {
    if (dbType === 'postgres') {
        pgPool.query(`DELETE FROM active_sessions WHERE session_id = $1`, [sessionId], callback);
    } else {
        sqliteDb.run(`DELETE FROM active_sessions WHERE session_id = ?`, [sessionId], callback);
    }
};

const getUserSessions = (userId, callback) => {
    if (dbType === 'postgres') {
        pgPool.query(`SELECT * FROM active_sessions WHERE user_id = $1 ORDER BY last_active DESC`, [userId], (err, res) => {
            if (err) return callback(err);
            callback(null, res.rows);
        });
    } else {
        sqliteDb.all(`SELECT * FROM active_sessions WHERE user_id = ? ORDER BY last_active DESC`, [userId], (err, rows) => {
            if (err) return callback(err);
            callback(null, rows);
        });
    }
};

module.exports = { logLogin, getStats, getActivityLogs, createSession, getSession, updateSessionActivity, revokeSession, getUserSessions };
