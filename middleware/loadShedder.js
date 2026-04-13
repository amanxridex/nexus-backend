const { monitorEventLoopDelay } = require('perf_hooks');

const loopMonitor = monitorEventLoopDelay({ resolution: 10 });
loopMonitor.enable();

let currentCpuUsage = 0;
let previousCpuTime = process.cpuUsage();
let previousTime = process.uptime();
let activeRequests = 0;
const MAX_CONCURRENT = 800; // Strict Global Threshold

setInterval(() => {
    const currentCpu = process.cpuUsage(previousCpuTime);
    const currentTime = process.uptime();
    
    const timeDelta = currentTime - previousTime;
    const cpuTotal = (currentCpu.user + currentCpu.system) / 1000000;
    
    // Approximated CPU % calculation for the current Node thread
    currentCpuUsage = Math.min((cpuTotal / timeDelta) * 100, 100);
    
    previousCpuTime = process.cpuUsage();
    previousTime = currentTime;
}, 3000).unref(); // Runs independently of the Event Loop queue

const loadShedder = (req, res, next) => {
    const eventLoopLag = loopMonitor.mean / 1e6; // Convert ns -> ms

    // PRIORITY ROUTING PROTOCOL
    const isCritical = req.originalUrl.includes('/auth') || 
                       req.originalUrl.includes('/buy') || 
                       req.originalUrl.includes('/verify');

    // 0. Global Concurrency Cap (Prevent V8 Heap Crash)
    if (activeRequests >= MAX_CONCURRENT && !isCritical) {
        console.warn(`[🛑 CONCURRENCY CAP] Denied ${req.originalUrl}. Active connections: ${activeRequests}`);
        return res.status(503).json({ status: 'busy', retry: true, message: 'Server at maximum capacity.' });
    }

    // 1. Critical Level (Only shed if Docker container is literally about to crash)
    if (isCritical) {
        if (currentCpuUsage > 95 || eventLoopLag > 200) {
            console.warn(`[🔥 CRIT SHED] Blocking Financial API: CPU ${currentCpuUsage.toFixed(1)}% | Lag ${eventLoopLag.toFixed(1)}ms`);
            return res.status(503).json({ status: 'busy', retry: true, message: 'Payment gateway overloaded. Please try again in 30 seconds.' });
        }
        activeRequests++;
        res.on('finish', () => activeRequests--);
        return next();
    }

    // 2. Standard Level (Shed non-critical feeds to free resources instantly)
    if (currentCpuUsage > 75 || eventLoopLag > 80) {
        console.warn(`[🛡️ SHED] Dropping ${req.originalUrl} | CPU: ${currentCpuUsage.toFixed(1)}% | Lag: ${eventLoopLag.toFixed(1)}ms`);
        
        // Let caching layer potentially serve this if possible, otherwise hard 503
        return res.status(503).json({ 
            status: 'degraded', 
            retry: true,
            data: [] // Empty data so UI doesn't crash structurally, just shows empty state
        });
    }

    if (eventLoopLag > 40) {
        console.log(`[⚠️ WARNING] Event Loop lagging: ${eventLoopLag.toFixed(1)}ms`);
    }

    activeRequests++;
    res.on('finish', () => activeRequests--);
    next();
};

module.exports = { loadShedder };
