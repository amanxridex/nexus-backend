const { Worker } = require('bullmq');
const Redis = require('ioredis');

// Ensure isolated process connection so the API event loop is 100% immune
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

const ticketWorker = new Worker('ticketQueue', async (job) => {
    console.log(`[🔨 WORKER] Processing Ticket Job ${job.id} - Type: ${job.name}`);
    
    const { ticketId, buyerId, timestamp } = job.data;
    
    try {
        // [PHYSICAL DB WRITES GO HERE]
        // Example: supabase.from('bookings').insert({ ... })
        // Example: Generate PDF natively using PDFkit and push to S3
        
        console.log(`[⏳ GENERATING] Creating PDF for ticket ${ticketId} / buyer ${buyerId}`);
        await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate Heavy PDF Generation
        
        console.log(`[✅ COMPLETED] Ticket ${ticketId} generated flawlessly.`);
        return { success: true, url: 'https://nexus.com/ticket.pdf' };
        
    } catch (error) {
        console.error(`[❌ ERROR] Job ${job.id} failed:`, error.message);
        throw error; // Triggers BullMQ retry backoff Sequence natively
    }

}, { 
    connection,
    concurrency: 50 // Can safely generate 50 tickets simultaneously per worker core without blocking since it's an isolated process!
});

ticketWorker.on('completed', (job) => {
    console.log(`[🎯 SUCCESS] Job ${job.id} removed from queue successfully.`);
});

ticketWorker.on('failed', (job, err) => {
    console.error(`[☠️ DEAD] Job ${job.id} completely failed after all retries:`, err.message);
});

console.log('[🚀 QUEUE ENGINE] Ticket Worker initialized and listening for jobs...');
