// src/utils/logger.js
const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, '..', '..', 'app.log');

/**
 * Custom simplified logger utility.
 */
const logger = {
    log: (level, message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        
        // Output to console
        if (level === 'error') {
            console.error(logMessage.trim());
        } else {
            console.log(logMessage.trim());
        }

        // Output to file (as requested by the user)
        fs.appendFile(LOG_FILE, logMessage, (err) => {
            if (err) console.error("Logger failed to write to file:", err);
        });
    },

    info: (message) => logger.log('info', message),
    error: (message) => logger.log('error', message),
};

module.exports = logger;