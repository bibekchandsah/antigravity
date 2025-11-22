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

module.exports = { checkRateLimit, recordFailedAttempt, resetAttempts };
