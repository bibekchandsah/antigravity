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
        const timeQuery = `SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= NOW() - INTERVAL '7 days' GROUP BY date(timestamp)`;
        const browserQuery = `SELECT browser, COUNT(*) as count FROM login_logs GROUP BY browser`;
        const osQuery = `SELECT os, COUNT(*) as count FROM login_logs GROUP BY os`;
        const logsQuery = `SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 10`;

        pgPool.query(timeQuery, (err, resTime) => {
            if (err) return callback(err);
            stats.loginsOverTime = resTime.rows;

            pgPool.query(browserQuery, (err, resBrowser) => {
                if (err) return callback(err);
                stats.browserDistribution = resBrowser.rows;

                pgPool.query(osQuery, (err, resOs) => {
                    if (err) return callback(err);
                    stats.osDistribution = resOs.rows;

                    pgPool.query(logsQuery, (err, resLogs) => {
                        if (err) return callback(err);
                        stats.recentLogs = resLogs.rows;
                        callback(null, stats);
                    });
                });
            });
        });

    } else {
        // SQLite Queries
        sqliteDb.serialize(() => {
            sqliteDb.all(`SELECT date(timestamp) as date, COUNT(*) as count FROM login_logs WHERE timestamp >= date('now', '-7 days') GROUP BY date(timestamp)`, (err, rows) => {
                if (err) return callback(err);
                stats.loginsOverTime = rows;

                sqliteDb.all(`SELECT browser, COUNT(*) as count FROM login_logs GROUP BY browser`, (err, rows) => {
                    if (err) return callback(err);
                    stats.browserDistribution = rows;

                    sqliteDb.all(`SELECT os, COUNT(*) as count FROM login_logs GROUP BY os`, (err, rows) => {
                        if (err) return callback(err);
                        stats.osDistribution = rows;

                        sqliteDb.all(`SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 10`, (err, rows) => {
                            if (err) return callback(err);
                            stats.recentLogs = rows;
                            callback(null, stats);
                        });
                    });
                });
            });
        });
    }
};

module.exports = { logLogin, getStats };
