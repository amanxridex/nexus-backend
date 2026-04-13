const { getClient, isConnected } = require('../utils/redisClient');

// --- CIRCUIT BREAKER ARCHITECTURE ---
let requestWindow = []; // Stores outcomes: true (success) or false (failure/timeout)
let circuitOpenSince = 0;
const OPEN_DURATION_MS = 30000; // Strict 30s open lock
const MAX_FAILURES = 5;
const WINDOW_SIZE = 10;

const recordOutcome = (isSuccess) => {
    requestWindow.push(isSuccess);
    if (requestWindow.length > WINDOW_SIZE) requestWindow.shift();
};

const isCircuitOpen = () => {
    if (Date.now() - circuitOpenSince < OPEN_DURATION_MS) return true;
    
    // Check failure rate
    const failures = requestWindow.filter(status => status === false).length;
    if (requestWindow.length >= WINDOW_SIZE && failures >= MAX_FAILURES) {
        console.warn(`[⚡ CIRCUIT BREAKER TRIPPED] >${failures} failures in last ${WINDOW_SIZE} requests. Locking DB access for 30s.`);
        circuitOpenSince = Date.now();
        requestWindow = []; // Reset window to prevent flapping
        return true;
    }
    return false;
};
// ------------------------------------

const cacheMiddleware = (options = { EX: 300 }) => {
    return async (req, res, next) => {
        if (!isConnected()) return next();

        const client = getClient();
        const key = `cache:${req.originalUrl || req.url}`;
        const startTime = Date.now();

        try {
            const cachedData = await client.get(key);
            
            // 1. Check Circuit Breaker BEFORE hitting DB
            if (isCircuitOpen()) {
                if (cachedData) {
                    console.log(`[🛡️ BREAKER OPEN] Bypassing DB -> Serving Stale Cache: ${key}`);
                    return res.status(200).json({ status: 'degraded', data: JSON.parse(cachedData).data || JSON.parse(cachedData) });
                } else {
                    console.error(`[🚨 BREAKER OPEN] Cache Empty. Enforcing degraded empty response for ${key}`);
                    return res.status(200).json({ status: 'degraded', data: [] });
                }
            }

            if (cachedData) {
                console.log(`[Cache HIT] ${key}`);
                return res.json(JSON.parse(cachedData));
            }

            console.log(`[Cache MISS - Route Open] ${key}`);
            const originalJson = res.json.bind(res);

            // Intercept outgoing response to monitor DB Health
            res.json = (body) => {
                const duration = Date.now() - startTime;
                
                try {
                    // Record Failure if 500 error OR took longer than 3000ms (Database struggling)
                    if (res.statusCode >= 500 || duration > 3000) {
                        recordOutcome(false); 
                    } else if (res.statusCode >= 200 && res.statusCode < 400) {
                        recordOutcome(true);
                        // Save to Cache
                        client.set(key, JSON.stringify(body), options);
                    }
                } catch(e) {
                    console.error('[Redis] Sync Error:', e.message);
                }
                
                originalJson(body);
            };

            next();
        } catch (error) {
            console.error('[Redis Cache Exception]', error.message);
            next();
        }
    };
};

module.exports = cacheMiddleware;
