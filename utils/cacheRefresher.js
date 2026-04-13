const https = require('https');

const BASE_URL = process.env.LIVE_URL || 'https://nexus-api-hkfu.onrender.com/api';
const CRITICAL_ROUTES = ['/gyms', '/homes', '/restaurants', '/tickets'];
const REFRESH_INTERVAL_MS = 240000; // 4 minutes (Cache TTL is 5m, so this safely beats expiration)

const fetchRoute = (url) => {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            res.on('data', () => {}); // Drain stream blindly
            res.on('end', () => resolve(res.statusCode));
        }).on('error', () => resolve(500));
    });
};

const startContinuousWarmup = () => {
    console.log('[🔄 CACHE ENGINE] Background Auto-Refresher started.');
    
    // Unref allows the loop to run securely without stopping the server from shutting down if needed natively
    setInterval(async () => {
        for (const route of CRITICAL_ROUTES) {
            try {
                const url = `${BASE_URL}${route}`;
                await fetchRoute(url);
            } catch (err) {
                // Fails securely without crashing
            }
        }
        console.log(`[🔄 CACHE ENGINE] Background refresh successfully hit ${CRITICAL_ROUTES.length} routes.`);
    }, REFRESH_INTERVAL_MS).unref();
};

module.exports = { startContinuousWarmup };
