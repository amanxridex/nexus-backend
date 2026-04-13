// nexus-backend/utils/timeoutWrapper.js

/**
 * Wraps a database promise with a strict timeout.
 * 
 * @param {Promise} dbPromise - The Supabase or DB query
 * @param {number} timeoutMs - Max wait time in ms before throwing
 * @returns {Promise} The resolved DB payload or a Timeout Error
 */
const withTimeout = (dbPromise, timeoutMs = 3000) => {
    let timeoutHandle;
    
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            const err = new Error(`Database query exceeded strict tolerance of ${timeoutMs}ms.`);
            err.code = 'DB_TIMEOUT';
            reject(err);
        }, timeoutMs);
    });

    return Promise.race([
        dbPromise,
        timeoutPromise
    ]).finally(() => {
        clearTimeout(timeoutHandle);
    });
};

module.exports = { withTimeout };
