/**
 * Data Logger for Nintendo Switch 2 Stock Monitor
 * Handles JSON file operations for storing stock check results and activity logs
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE_PATH = path.join(__dirname, '..', 'data', 'stock-checks.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Initialize the log file and data directory if they don't exist
 * @returns {Object} Result object with success status
 */
function initializeLogFile() {
    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log('📁 Created data directory:', DATA_DIR);
        }

        // Create log file if it doesn't exist
        if (!fs.existsSync(LOG_FILE_PATH)) {
            const initialData = [];
            fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
            console.log('📄 Created log file:', LOG_FILE_PATH);
        }

        // Verify file is readable and writable
        fs.accessSync(LOG_FILE_PATH, fs.constants.R_OK | fs.constants.W_OK);
        
        return {
            success: true,
            message: 'Log file initialized successfully',
            filePath: LOG_FILE_PATH,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to initialize log file: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            filePath: LOG_FILE_PATH,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Log a stock check result to the JSON file
 * @param {Object} stockResult - Stock check result object
 * @param {boolean} stockResult.inStock - Whether the product is in stock
 * @param {string} stockResult.timestamp - ISO timestamp of the check
 * @param {string} stockResult.error - Error message if check failed (optional)
 * @param {string} stockResult.url - Product URL that was checked (optional)
 * @returns {Object} Result object with success status
 */
function logStockCheck(stockResult) {
    try {
        // Validate input parameters
        if (!stockResult || typeof stockResult !== 'object') {
            throw new Error('Stock result is required and must be an object');
        }

        if (typeof stockResult.inStock !== 'boolean') {
            throw new Error('inStock field is required and must be a boolean');
        }

        // Initialize log file if needed
        const initResult = initializeLogFile();
        if (!initResult.success) {
            throw new Error(`Log file initialization failed: ${initResult.error}`);
        }

        // Create log entry with required fields
        const logEntry = {
            timestamp: stockResult.timestamp || new Date().toISOString(),
            inStock: stockResult.inStock,
            error: stockResult.error || null,
            url: stockResult.url || null
        };

        // Validate timestamp format
        try {
            new Date(logEntry.timestamp);
        } catch (timestampError) {
            logEntry.timestamp = new Date().toISOString();
            console.warn('⚠️ Invalid timestamp provided, using current time');
        }

        // Read existing logs
        let existingLogs = [];
        try {
            const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
            existingLogs = JSON.parse(fileContent);
            
            // Validate that existing data is an array
            if (!Array.isArray(existingLogs)) {
                console.warn('⚠️ Log file contains invalid data structure, reinitializing...');
                existingLogs = [];
            }
        } catch (readError) {
            console.warn('⚠️ Could not read existing logs, starting fresh:', readError.message);
            existingLogs = [];
        }

        // Add new log entry
        existingLogs.push(logEntry);

        // Write updated logs back to file
        fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(existingLogs, null, 2), 'utf8');

        console.log(`📝 Logged stock check: ${logEntry.inStock ? '✅ In Stock' : '❌ Out of Stock'} at ${logEntry.timestamp}`);

        return {
            success: true,
            message: 'Stock check logged successfully',
            logEntry: logEntry,
            totalLogs: existingLogs.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to log stock check: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Read and return all logged data from the JSON file
 * @returns {Object} Result object with logs array or error
 */
function getAllLogs() {
    try {
        // Initialize log file if needed
        const initResult = initializeLogFile();
        if (!initResult.success) {
            throw new Error(`Log file initialization failed: ${initResult.error}`);
        }

        // Read log file
        const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
        const logs = JSON.parse(fileContent);

        // Validate data structure
        if (!Array.isArray(logs)) {
            throw new Error('Log file contains invalid data structure (not an array)');
        }

        // Validate log entries
        const validLogs = logs.filter(log => {
            if (!log || typeof log !== 'object') return false;
            if (typeof log.inStock !== 'boolean') return false;
            if (!log.timestamp) return false;
            return true;
        });

        if (validLogs.length !== logs.length) {
            console.warn(`⚠️ Filtered out ${logs.length - validLogs.length} invalid log entries`);
        }

        console.log(`📊 Retrieved ${validLogs.length} log entries`);

        return {
            success: true,
            logs: validLogs,
            totalCount: validLogs.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to read logs: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            logs: [],
            totalCount: 0,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get logs from a specific date forward
 * @param {string|Date} date - Start date (ISO string or Date object)
 * @returns {Object} Result object with filtered logs array or error
 */
function getLogsSince(date) {
    try {
        // Validate and parse date parameter
        let startDate;
        try {
            startDate = new Date(date);
            if (isNaN(startDate.getTime())) {
                throw new Error('Invalid date format');
            }
        } catch (dateError) {
            throw new Error(`Invalid date parameter: ${dateError.message}`);
        }

        // Get all logs first
        const allLogsResult = getAllLogs();
        if (!allLogsResult.success) {
            throw new Error(`Failed to read logs: ${allLogsResult.error}`);
        }

        // Filter logs from the specified date forward
        const filteredLogs = allLogsResult.logs.filter(log => {
            try {
                const logDate = new Date(log.timestamp);
                return logDate >= startDate;
            } catch (parseError) {
                console.warn(`⚠️ Skipping log with invalid timestamp: ${log.timestamp}`);
                return false;
            }
        });

        // Sort logs by timestamp (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`📅 Retrieved ${filteredLogs.length} logs since ${startDate.toISOString()}`);

        return {
            success: true,
            logs: filteredLogs,
            totalCount: filteredLogs.length,
            filterDate: startDate.toISOString(),
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to get logs since date: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            logs: [],
            totalCount: 0,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get basic statistics about the log file (utility function)
 * @returns {Object} Basic file statistics
 */
function getLogFileStats() {
    try {
        const initResult = initializeLogFile();
        if (!initResult.success) {
            throw new Error(`Log file initialization failed: ${initResult.error}`);
        }

        const stats = fs.statSync(LOG_FILE_PATH);
        const allLogsResult = getAllLogs();
        
        return {
            success: true,
            filePath: LOG_FILE_PATH,
            fileSize: stats.size,
            lastModified: stats.mtime.toISOString(),
            totalEntries: allLogsResult.success ? allLogsResult.totalCount : 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    logStockCheck,
    getAllLogs,
    getLogsSince,
    initializeLogFile,
    getLogFileStats
}; 