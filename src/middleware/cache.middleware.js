const redis = require('../config/redis');

const CACHE_TTL = 60; // seconds

function cacheKey(prefix, id) {
    return `${prefix}:${id}`;
}

const cacheMiddleware = (prefix, keyFn) => async (req, res, next) => {
    const key = cacheKey(prefix, keyFn(req));
    try {
        const cached = await redis.get(key);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cached));
        }
    } catch (_) {}

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (data) => {
        if (res.statusCode < 400) {
            redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL).catch(() => {});
        }
        return originalJson(data);
    };
    next();
};

// Exact key invalidation — for single keys like account:details, account:balance
const invalidateCache = async (...keys) => {
    try {
        await redis.del(...keys);
    } catch (_) {}
};

// Pattern invalidation — deletes ALL keys matching prefix*
// Used for paginated caches like txn:history:accountId:1, :2, :3 ...
const invalidateCachePattern = async (pattern) => {
    try {
        const keys = await redis.keys(`${pattern}*`);
        if (keys.length > 0) await redis.del(...keys);
    } catch (_) {}
};

module.exports = { cacheMiddleware, invalidateCache, invalidateCachePattern, cacheKey };
