const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.warn('Redis error (caching disabled):', err.message));

module.exports = redis;
