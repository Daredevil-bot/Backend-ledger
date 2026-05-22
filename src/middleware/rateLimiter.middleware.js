const redis = require('../config/redis');

/**
 * Sliding window rate limiter using Redis sorted sets.
 *
 * How it works:
 * - Every request is stored as a scored entry in a Redis sorted set
 *   where score = timestamp (ms)
 * - On each request we:
 *   1. Remove entries older than the window
 *   2. Count remaining entries
 *   3. Block if count >= limit, else add current request
 * - All steps run atomically in a Redis pipeline (no race conditions)
 *
 * Key format: ratelimit:<identifier>:<route>
 */

const slidingWindowLimiter = ({ windowMs, max, keyFn, message }) => {
    return async (req, res, next) => {
        const now = Date.now();
        const windowStart = now - windowMs;
        const identifier = keyFn(req);
        const key = `ratelimit:${identifier}`;

        try {
            const pipeline = redis.pipeline();

            // 1. Remove requests outside the current window
            pipeline.zremrangebyscore(key, 0, windowStart);

            // 2. Count requests inside the current window
            pipeline.zcard(key);

            // 3. Add current request with timestamp as score
            pipeline.zadd(key, now, `${now}-${Math.random()}`);

            // 4. Set expiry so keys self-clean from Redis
            pipeline.pexpire(key, windowMs);

            const results = await pipeline.exec();
            const requestCount = results[1][1]; // zcard result

            const remaining = Math.max(0, max - requestCount - 1);
            const resetAt = new Date(now + windowMs).toISOString();

            // Set standard rate limit headers on every response
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', remaining);
            res.setHeader('RateLimit-Reset', resetAt);

            if (requestCount >= max) {
                const retryAfter = Math.ceil(windowMs / 1000);
                res.setHeader('Retry-After', retryAfter);
                return res.status(429).json({
                    error: 'rate_limit_exceeded',
                    message: message || 'Too many requests, please slow down.',
                    limit: max,
                    remaining: 0,
                    reset_at: resetAt,
                    retry_after_seconds: retryAfter,
                });
            }

            next();
        } catch (err) {
            // If Redis is down, fail open (don't block requests)
            console.warn('Rate limiter Redis error, failing open:', err.message);
            next();
        }
    };
};

// ── Pre-built limiters ──────────────────────────────────────

// Global — all routes, keyed by IP
const globalLimiter = slidingWindowLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyFn: (req) => `ip:${req.ip}`,
    message: 'Too many requests from this IP, please try again later.',
});

// Auth — login/register, strict to prevent brute force
const authLimiter = slidingWindowLimiter({
    windowMs: 15 * 60 * 1000 , // 30 seconds (use 15 * 60 * 1000 in production)
    max: 10,
    keyFn: (req) => `auth:${req.ip}`,
    message: 'Too many auth attempts, please try again in 15 minutes.',
});

// Transactions — per authenticated user, not just IP
const transactionLimiter = slidingWindowLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    keyFn: (req) => `txn:${req.user?._id || req.ip}`,
    message: 'Too many transactions, please slow down.',
});

module.exports = { globalLimiter, authLimiter, transactionLimiter };
