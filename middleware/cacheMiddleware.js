const { getClient, isConnected } = require('../utils/redisClient');

const cacheMiddleware = (options = { EX: 300 }) => {
    return async (req, res, next) => {
        // Bypass if Redis is dead
        if (!isConnected()) {
            return next();
        }

        const client = getClient();
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await client.get(key);
            if (cachedData) {
                // HIT
                console.log(`[Cache HIT] Returning from Redis: ${key}`);
                return res.json(JSON.parse(cachedData));
            }

            // MISS
            console.log(`[Cache MISS] Fetching from Supabase: ${key}`);
            const originalJson = res.json.bind(res);

            res.json = (body) => {
                try {
                    // Only cache successful requests
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        client.set(key, JSON.stringify(body), options);
                    }
                } catch(e) {
                    console.error('[Redis] Error saving to cache:', e.message);
                }
                
                // Send response natively
                originalJson(body);
            };

            next();
        } catch (error) {
            console.error('[Redis Cache Exception]', error.message);
            // Bypass gracefully on error
            next();
        }
    };
};

module.exports = cacheMiddleware;
