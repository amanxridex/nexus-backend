const { createClient } = require('redis');

let redisClient;
let isRedisConnected = false;

async function connectRedis() {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        redisClient.on('error', (err) => {
            console.error('[Redis Client Error]', err.message);
            isRedisConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected to Database');
            isRedisConnected = true;
        });

        await redisClient.connect();
    } catch (error) {
        console.error('[Redis] Failed to initialize connection:', error.message);
        isRedisConnected = false;
    }
}

connectRedis();

module.exports = {
    getClient: () => redisClient,
    isConnected: () => isRedisConnected
};
