// src/utils/logger.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables immediately
dotenv.config();

// --- Configuration ---
const LOG_FILE = path.join(__dirname, '..', '..', 'app.log');

// Environment Variable: Set the minimum level to log (e.g., 'warn' will log WARN and ERROR)
const MIN_LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toUpperCase() : 'INFO'; 
// Example: In .env, set LOG_LEVEL=debug

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// --- Logger Core Logic ---

// Get the numeric level of the current environment setting
const MIN_LEVEL_NUM = LOG_LEVELS[MIN_LOG_LEVEL] !== undefined 
    ? LOG_LEVELS[MIN_LOG_LEVEL] 
    : LOG_LEVELS.INFO; // Default to INFO

/**
 * Ensures the log file exists before writing.
 */
const ensureLogFileExists = (() => {
    let initialized = false;
    return () => {
        if (!initialized) {
            try {
                // Check if the directory exists, if not, create it
                const dir = path.dirname(LOG_FILE);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Ensure the file exists (creates it if it doesn't)
                if (!fs.existsSync(LOG_FILE)) {
                    fs.writeFileSync(LOG_FILE, `--- Log File Initialized: ${new Date().toISOString()} ---\n`);
                }
                initialized = true;
            } catch (err) {
                console.error(`Logger setup failed: ${err.message}`);
            }
        }
    };
})();

/**
 * Appends a log message to the console and the log file.
 * @param {string} level The log level (e.g., 'ERROR', 'INFO').
 * @param {string} msg The main log message.
 * @param {any} [meta=''] Optional metadata object or string.
 */
const log = (level, msg, meta = '') => {
    const levelName = level.toUpperCase();
    const levelNum = LOG_LEVELS[levelName];

    // 1. Check Log Level: Only proceed if the message level is >= the minimum required level
    if (levelNum === undefined || levelNum > MIN_LEVEL_NUM) {
        // Exclude logs higher than the configured level (e.g., exclude DEBUG if level is INFO)
        return; 
    }

    const timestamp = new Date().toISOString();
    let metaString = '';

    // Convert metadata object to JSON string for structured logging
    if (typeof meta === 'object' && meta !== null) {
        metaString = JSON.stringify(meta);
    } else if (meta) {
        metaString = String(meta);
    }

    const consolePrefix = {
        ERROR: '❌ [ERROR]',
        WARN: '⚠️ [WARN]',
        INFO: 'ℹ️ [INFO]',
        DEBUG: '🐞 [DEBUG]'
    }[levelName] || `[${levelName}]`;
    
    const logMessage = `${consolePrefix} ${msg} ${metaString}`;
    const fileMessage = `[${timestamp}] [${levelName}] ${msg} ${metaString}\n`;

    // 2. Console Output
    if (levelName === 'ERROR') {
        console.error(logMessage.trim());
    } else if (levelName === 'WARN') {
        console.warn(logMessage.trim());
    } else {
        console.log(logMessage.trim());
    }

    // 3. File Output (Asynchronous write for performance)
    ensureLogFileExists();
    fs.appendFile(LOG_FILE, fileMessage, (err) => {
        if (err) {
            // Fallback console log if file write fails
            console.error(`Logger file write failed: ${err.message}`);
        }
    });
};

// --- Exported Logger Interface ---
const logger = {
    // Expose log levels for external use (e.g., logger.LEVELS.ERROR)
    LEVELS: LOG_LEVELS,

    error: (msg, meta = '') => log('error', msg, meta),
    warn: (msg, meta = '') => log('warn', msg, meta),
    info: (msg, meta = '') => log('info', msg, meta),
    debug: (msg, meta = '') => {
        // Check NODE_ENV specifically for DEBUG, matching the original intent
        if (process.env.NODE_ENV !== 'production' || MIN_LEVEL_NUM >= LOG_LEVELS.DEBUG) {
            log('debug', msg, meta);
        }
    }
};

module.exports = logger;