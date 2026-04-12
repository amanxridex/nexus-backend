const rateLimit = require('express-rate-limit');

// 1. Global Safety Net (Protects against generic DDOS scraping)
exports.globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per `window`
    message: { success: false, message: 'Too many general requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Strict Auth & Payment Nodes (Prevents brute force & duplicate charges)
exports.strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 strict requests per minute
    message: { success: false, message: 'Too many sensitive requests (Auth/Payment), please calm down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Asset Query Limiter (For heavy endpoints like fests/gyms)
exports.queryLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 queries per 5 min
    message: { success: false, message: 'Too many database queries, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
