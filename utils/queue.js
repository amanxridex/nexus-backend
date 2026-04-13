const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Parse Upstash URL properly for ioredis (handling the rediss:// standard)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // BullMQ absolutely requires null retries explicitly
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

// Primary Queues
const ticketQueue = new Queue('ticketQueue', {
    connection,
    defaultJobOptions: {
        attempts: 4, // 1 Init + 3 Retries over Backoff
        backoff: {
            type: 'exponential',
            delay: 1000 // 1s, 2s, 4s
        },
        removeOnComplete: true, // Keep memory clean
        removeOnFail: 100 // Keep last 100 dead letters for forensic analysis manually
    }
});

// Backpressure control manually (Don't enqueue if queue is fatally backed up)
const MAX_QUEUE_SIZE = 10000;

/**
 * Safe enqueue method matching CTO Backpressure mandate.
 */
const safeAddTicketJob = async (jobName, data) => {
    const jobCount = await ticketQueue.count();
    
    if (jobCount >= MAX_QUEUE_SIZE) {
        throw new Error('QUEUE_OVERFLOW', 'The ticket rendering queue is severely overloaded (> 10000 jobs). Rejecting request physically to protect Redis Heap.');
    }
    
    return await ticketQueue.add(jobName, data);
};

module.exports = { ticketQueue, connection, safeAddTicketJob };
