const { getClient, isConnected } = require('../utils/redisClient');

// Dual-layer Idempotency: Redis Lock -> DB execution
const requireIdempotency = (options = { expireMs: 300000 }) => {
    return async (req, res, next) => {
        const idempotencyKey = req.headers['x-idempotency-key'];

        if (!idempotencyKey) {
            return res.status(400).json({ 
                success: false, 
                message: 'Fatal: x-idempotency-key missing from financial transaction header.' 
            });
        }

        if (!isConnected()) {
            console.warn('[⚠️ IDEMPOTENCY] Redis is down. Falling back to DB unique constraints only.');
            return next();
        }

        const client = getClient();
        const redisKey = `idempotency:${req.user?.uid || 'anon'}:${idempotencyKey}`;

        try {
            // Attempt to SET NX (Only set if it doesn't already exist)
            // This prevents race conditions where two identical requests arrive at the exact same millisecond
            const acquiredLock = await client.set(redisKey, 'pending', {
                NX: true,
                PX: options.expireMs // 5 min TTL
            });

            if (!acquiredLock) {
                // Key already exists! This is a duplicate!
                const currentStatus = await client.get(redisKey);
                
                if (currentStatus === 'completed') {
                    return res.status(200).json({ success: true, message: 'Transaction already completed.' });
                } else {
                    return res.status(409).json({ success: false, message: 'Transaction is actively processing. Please wait.' });
                }
            }

            // Lock acquired successfully, inject release method into response object
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Transaction completed successfully, mark as completed instead of deleting
                    // This ensures any delayed retry hits 'completed' instead of running again
                    client.set(redisKey, 'completed', { PX: options.expireMs }).catch(console.error);
                } else {
                    // Transaction failed, delete the lock so user can try again safely
                    client.del(redisKey).catch(console.error);
                }
                originalJson(body);
            };

            next();
        } catch (error) {
            console.error('[IDEMPOTENCY ERROR]', error);
            next();
        }
    };
};

module.exports = { requireIdempotency };
