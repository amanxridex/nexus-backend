const https = require('https');

const BASE_URL = process.env.LIVE_URL || 'https://nexus-api-hkfu.onrender.com/api';

const CRITICAL_ROUTES = [
    '/gyms',
    '/homes',
    '/restaurants',
    '/tickets'
];

// Helper to wrap native fetching since Node fetch might be unsupported natively in older Node versions
const fetchRoute = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
};

const executeWarmup = async (maxRetries = 3) => {
    console.log('\n[🔥 NEXUS CACHE WARMUP V2 🔥]');
    console.log(`Target Engine: ${BASE_URL}\n`);

    const promises = CRITICAL_ROUTES.map(async (route) => {
        let attempts = 0;
        const targetUrl = `${BASE_URL}${route}`;

        while (attempts < maxRetries) {
            try {
                const startTime = Date.now();
                const res = await fetchRoute(targetUrl);
                const latency = Date.now() - startTime;

                if (res.status === 200 || res.status === 304) {
                    console.log(`✅ [WARMED] ${route} (${latency}ms)`);
                    return; // Success, break retry loop
                } else {
                    console.log(`⚠️ [WARNING] ${route} returned HTTP ${res.status}`);
                    break;
                }
            } catch (err) {
                attempts++;
                console.error(`❌ [FAILED] ${route} (Attempt ${attempts}/${maxRetries}): ${err.message}`);
                
                if (attempts < maxRetries) {
                    // Exponential backoff before retry (1s, 2s, 4s)
                    const waitTime = Math.pow(2, attempts) * 500;
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
        }
        console.error(`☠️ [FATAL] Failed to warm ${route} after ${maxRetries} attempts.`);
    });

    await Promise.allSettled(promises);
    console.log('\n[🚀] Redis Warmup Sequence Complete.\n');
};

executeWarmup();
