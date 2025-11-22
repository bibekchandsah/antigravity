const rateLimit = new Map();

const MAX_ATTEMPTS = process.env.MAX_ATTEMPT || 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const checkRateLimit = (ip) => {
    const record = rateLimit.get(ip);

    if (!record) return { allowed: true };

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
        return { allowed: false, lockedUntil: record.lockedUntil };
    }

    if (record.lockedUntil && Date.now() > record.lockedUntil) {
        rateLimit.delete(ip); // Reset after lockout expires
        return { allowed: true };
    }

    return { allowed: true };
};

const recordFailedAttempt = (ip) => {
    const record = rateLimit.get(ip) || { attempts: 0 };
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_TIME;
    }

    rateLimit.set(ip, record);
    return record.attempts;
};

const resetAttempts = (ip) => {
    rateLimit.delete(ip);
};

const getLockedUsers = () => {
    const lockedUsers = [];
    const now = Date.now();
    for (const [ip, record] of rateLimit.entries()) {
        if (record.lockedUntil && record.lockedUntil > now) {
            lockedUsers.push({ ip, lockedUntil: record.lockedUntil });
        }
    }
    return lockedUsers;
};

module.exports = { checkRateLimit, recordFailedAttempt, resetAttempts, getLockedUsers };
