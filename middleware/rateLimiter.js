const rateLimit = require('express-rate-limit');

// Dual-Layer Key Generator (Prevents blocking 50 users on Jio/Airtel NAT)
const dualLayerKeyGen = (req) => {
    return req.user?.uid || req.ip;
};

// 1. Global Safety Net (Protects against generic DDOS scraping)
exports.globalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 300, // Allow high burst for home feeds
    keyGenerator: dualLayerKeyGen,
    message: { success: false, status: 'busy', message: 'Rate limit reached. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Strict Auth & Payment Nodes (Prevents brute force & duplicate charges)
exports.strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 financial transactions per minute per UID
    keyGenerator: dualLayerKeyGen,
    message: { success: false, status: 'busy', message: 'Too many payment requests. Slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Asset Query Limiter (For heavy endpoints like fests/gyms)
exports.queryLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 150, // 150 queries per 5 min
    keyGenerator: dualLayerKeyGen,
    message: { success: false, status: 'busy', message: 'Database throttling active.' },
    standardHeaders: true,
    legacyHeaders: false,
});
