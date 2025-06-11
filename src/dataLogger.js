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

        // Create log entry with required fields and clear status
        const logEntry = {
            timestamp: stockResult.timestamp || new Date().toISOString(),
            inStock: stockResult.inStock,
            error: stockResult.error || null,
            url: stockResult.url || null,
            status: stockResult.error ? 'CHECK_FAILED' : (stockResult.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK')
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

        // Create clear status message using the explicit status field
        let statusMessage;
        switch (logEntry.status) {
            case 'IN_STOCK':
                statusMessage = '✅ In Stock';
                break;
            case 'OUT_OF_STOCK':
                statusMessage = '❌ Out of Stock';
                break;
            case 'CHECK_FAILED':
                statusMessage = `⚠️ Check Failed (${logEntry.error})`;
                break;
            default:
                statusMessage = `❓ Unknown Status (${logEntry.status})`;
        }
        
        console.log(`📝 Logged stock check: ${statusMessage} at ${logEntry.timestamp}`);

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

/**
 * Calculate statistics for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Statistics object for the specified date
 */
function calculateDailyStats(date) {
    try {
        // Validate date parameter
        if (!date || typeof date !== 'string') {
            throw new Error('Date is required and must be a string in YYYY-MM-DD format');
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw new Error('Date must be in YYYY-MM-DD format');
        }

        // Parse and validate the date
        const targetDate = new Date(date + 'T00:00:00.000Z');
        if (isNaN(targetDate.getTime())) {
            throw new Error('Invalid date provided');
        }

        // Get date boundaries (start and end of day in UTC)
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        console.log(`📊 Calculating daily stats for ${date}...`);

        // Get all logs and filter for the specific date
        const allLogsResult = getAllLogs();
        if (!allLogsResult.success) {
            throw new Error(`Failed to read logs: ${allLogsResult.error}`);
        }

        // Filter logs for the specific date
        const dayLogs = allLogsResult.logs.filter(log => {
            try {
                const logDate = new Date(log.timestamp);
                return logDate >= startOfDay && logDate <= endOfDay;
            } catch (parseError) {
                console.warn(`⚠️ Skipping log with invalid timestamp: ${log.timestamp}`);
                return false;
            }
        });

        // Sort logs by timestamp (oldest first for accurate status change detection)
        dayLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Calculate basic statistics with clear status distinction
        const totalChecks = dayLogs.length;
        const inStockCount = dayLogs.filter(log => log.status === 'IN_STOCK' || (log.inStock === true && !log.error)).length;
        const outOfStockCount = dayLogs.filter(log => log.status === 'OUT_OF_STOCK' || (log.inStock === false && !log.error)).length;
        const checkFailedCount = dayLogs.filter(log => log.status === 'CHECK_FAILED' || (log.error !== null)).length;

        // Find status changes
        const statusChanges = [];
        let lastStatus = null;

        dayLogs.forEach(log => {
            // Use the explicit status field if available, otherwise determine from inStock/error
            let currentStatus;
            if (log.status) {
                currentStatus = log.status.toLowerCase().replace('_', '-');
            } else {
                currentStatus = log.error ? 'check-failed' : (log.inStock ? 'in-stock' : 'out-of-stock');
            }
            
            if (lastStatus !== null && lastStatus !== currentStatus) {
                statusChanges.push({
                    timestamp: log.timestamp,
                    from: lastStatus,
                    to: currentStatus
                });
            }
            
            lastStatus = currentStatus;
        });

        // Get first and last check timestamps
        const firstCheck = dayLogs.length > 0 ? dayLogs[0].timestamp : null;
        const lastCheck = dayLogs.length > 0 ? dayLogs[dayLogs.length - 1].timestamp : null;

        const stats = {
            date: date,
            totalChecks: totalChecks,
            inStockCount: inStockCount,
            outOfStockCount: outOfStockCount,
            checkFailedCount: checkFailedCount,
            statusChanges: statusChanges,
            firstCheck: firstCheck,
            lastCheck: lastCheck
        };

        console.log(`✅ Daily stats calculated: ${totalChecks} checks, ${statusChanges.length} status changes`);

        return {
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to calculate daily stats: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            stats: null,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get statistics for the last 24 hours from now
 * @returns {Object} Statistics object for the last 24 hours
 */
function getLast24HourStats() {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        console.log(`📊 Calculating last 24 hour stats from ${twentyFourHoursAgo.toISOString()}...`);

        // Get all logs and filter for the last 24 hours
        const allLogsResult = getAllLogs();
        if (!allLogsResult.success) {
            throw new Error(`Failed to read logs: ${allLogsResult.error}`);
        }

        // Filter logs for the last 24 hours
        const recentLogs = allLogsResult.logs.filter(log => {
            try {
                const logDate = new Date(log.timestamp);
                return logDate >= twentyFourHoursAgo && logDate <= now;
            } catch (parseError) {
                console.warn(`⚠️ Skipping log with invalid timestamp: ${log.timestamp}`);
                return false;
            }
        });

        // Sort logs by timestamp (oldest first for accurate status change detection)
        recentLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Calculate basic statistics with clear status distinction
        const totalChecks = recentLogs.length;
        const inStockCount = recentLogs.filter(log => log.status === 'IN_STOCK' || (log.inStock === true && !log.error)).length;
        const outOfStockCount = recentLogs.filter(log => log.status === 'OUT_OF_STOCK' || (log.inStock === false && !log.error)).length;
        const checkFailedCount = recentLogs.filter(log => log.status === 'CHECK_FAILED' || (log.error !== null)).length;

        // Find status changes in the last 24 hours
        const statusChanges = [];
        let lastStatus = null;

        recentLogs.forEach(log => {
            // Use the explicit status field if available, otherwise determine from inStock/error
            let currentStatus;
            if (log.status) {
                currentStatus = log.status.toLowerCase().replace('_', '-');
            } else {
                currentStatus = log.error ? 'check-failed' : (log.inStock ? 'in-stock' : 'out-of-stock');
            }
            
            if (lastStatus !== null && lastStatus !== currentStatus) {
                statusChanges.push({
                    timestamp: log.timestamp,
                    from: lastStatus,
                    to: currentStatus
                });
            }
            
            lastStatus = currentStatus;
        });

        // Get first and last check timestamps
        const firstCheck = recentLogs.length > 0 ? recentLogs[0].timestamp : null;
        const lastCheck = recentLogs.length > 0 ? recentLogs[recentLogs.length - 1].timestamp : null;

        // Format the date range for display
        const dateRange = `${twentyFourHoursAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`;

        const stats = {
            date: dateRange,
            totalChecks: totalChecks,
            inStockCount: inStockCount,
            outOfStockCount: outOfStockCount,
            checkFailedCount: checkFailedCount,
            statusChanges: statusChanges,
            firstCheck: firstCheck,
            lastCheck: lastCheck,
            periodStart: twentyFourHoursAgo.toISOString(),
            periodEnd: now.toISOString()
        };

        console.log(`✅ Last 24h stats calculated: ${totalChecks} checks, ${statusChanges.length} status changes`);

        return {
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to calculate last 24 hour stats: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            stats: null,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get stock status changes for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Array of status changes for the specified date
 */
function getStatusChanges(date) {
    try {
        // Validate date parameter
        if (!date || typeof date !== 'string') {
            throw new Error('Date is required and must be a string in YYYY-MM-DD format');
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw new Error('Date must be in YYYY-MM-DD format');
        }

        // Parse and validate the date
        const targetDate = new Date(date + 'T00:00:00.000Z');
        if (isNaN(targetDate.getTime())) {
            throw new Error('Invalid date provided');
        }

        console.log(`🔄 Finding status changes for ${date}...`);

        // Get date boundaries (start and end of day in UTC)
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        // Get all logs and filter for the specific date
        const allLogsResult = getAllLogs();
        if (!allLogsResult.success) {
            throw new Error(`Failed to read logs: ${allLogsResult.error}`);
        }

        // Filter logs for the specific date
        const dayLogs = allLogsResult.logs.filter(log => {
            try {
                const logDate = new Date(log.timestamp);
                return logDate >= startOfDay && logDate <= endOfDay;
            } catch (parseError) {
                console.warn(`⚠️ Skipping log with invalid timestamp: ${log.timestamp}`);
                return false;
            }
        });

        // Sort logs by timestamp (oldest first for accurate status change detection)
        dayLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Find status changes with detailed information
        const statusChanges = [];
        let lastStatus = null;
        let lastLog = null;

        dayLogs.forEach((log, index) => {
            // Use the explicit status field if available, otherwise determine from inStock/error
            let currentStatus;
            if (log.status) {
                currentStatus = log.status.toLowerCase().replace('_', '-');
            } else {
                currentStatus = log.error ? 'check-failed' : (log.inStock ? 'in-stock' : 'out-of-stock');
            }
            
            if (lastStatus !== null && lastStatus !== currentStatus) {
                const change = {
                    timestamp: log.timestamp,
                    from: lastStatus,
                    to: currentStatus,
                    formattedTime: new Date(log.timestamp).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    }),
                    sequenceNumber: statusChanges.length + 1,
                    previousLogTimestamp: lastLog ? lastLog.timestamp : null
                };
                
                statusChanges.push(change);
            }
            
            lastStatus = currentStatus;
            lastLog = log;
        });

        // Add summary information with clear status handling
        const getLogStatus = (log) => {
            if (log.status) {
                return log.status.toLowerCase().replace('_', '-');
            } else {
                return log.error ? 'check-failed' : (log.inStock ? 'in-stock' : 'out-of-stock');
            }
        };

        const summary = {
            date: date,
            totalChanges: statusChanges.length,
            totalLogs: dayLogs.length,
            firstLogStatus: dayLogs.length > 0 ? getLogStatus(dayLogs[0]) : null,
            lastLogStatus: dayLogs.length > 0 ? getLogStatus(dayLogs[dayLogs.length - 1]) : null
        };

        console.log(`✅ Found ${statusChanges.length} status changes on ${date}`);

        return {
            success: true,
            statusChanges: statusChanges,
            summary: summary,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = `Failed to get status changes: ${error.message}`;
        console.error('❌', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            statusChanges: [],
            summary: null,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    logStockCheck,
    getAllLogs,
    getLogsSince,
    initializeLogFile,
    getLogFileStats,
    calculateDailyStats,
    getLast24HourStats,
    getStatusChanges
}; 