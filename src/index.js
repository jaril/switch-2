/**
 * Nintendo Switch 2 Stock Monitor - Main Application Entry Point
 * Initializes all modules and manages application lifecycle
 */

const config = require('./config.js');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck, getLast24HourStats, initializeDataLogger, getAllLogs } = require('./dataLogger.js');
const { sendStockAlert, sendDailySummary } = require('./emailService.js');
const { startStockMonitoring, stopStockMonitoring, startDailySummary, stopDailySummary } = require('./scheduler.js');

/**
 * Main Application Class
 */
class StockMonitorApp {
    constructor() {
        this.isInitialized = false;
        this.isShuttingDown = false;
        this.startTime = null;
        
        // Application state for cross-module coordination
        this.applicationState = {
            lastStockStatus: null,           // boolean or null
            lastCheckTime: null,             // timestamp
            isCheckInProgress: false,        // prevent overlapping checks
            dailySummaryLastSent: null,      // date string (YYYY-MM-DD)
            checkCount: 0,                   // total checks performed
            lastStateUpdate: null            // when state was last modified
        };
        
        // State lock for atomic operations
        this.stateLock = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🎮 Nintendo Switch 2 Stock Monitor');
            console.log('==================================');
            console.log(`🚀 Starting application at ${new Date().toISOString()}`);
            console.log('');

            // Step 1: Verify configuration
            console.log('⚙️  Verifying configuration...');
            this.verifyConfiguration();
            console.log('✅ Configuration loaded successfully');
            console.log(`📍 Product URL: ${config.PRODUCT_URL}`);
            console.log(`📧 Email configured: ${config.FROM_EMAIL} → ${config.TO_EMAIL}`);
            console.log('');

            // Step 2: Initialize data logger
            console.log('📊 Initializing data logger...');
            const loggerResult = initializeDataLogger();
            if (loggerResult.success) {
                console.log('✅ Data logger initialized successfully');
                console.log(`📁 Log directory: ${loggerResult.logDir}`);
            } else {
                console.warn('⚠️  Data logger initialization warning:', loggerResult.error);
            }
            console.log('');

            // Step 3: Verify module imports
            console.log('🔧 Verifying module imports...');
            this.verifyModules();
            console.log('✅ All modules loaded successfully');
            console.log('');

            // Step 4: Set up shutdown handlers
            console.log('🛡️  Setting up shutdown handlers...');
            this.setupShutdownHandlers();
            console.log('✅ Shutdown handlers configured');
            console.log('');

            this.isInitialized = true;
            this.startTime = new Date();
            
            console.log('🎯 Application initialized successfully!');
            console.log('📋 Available modules:');
            console.log('   • Stock Checker - Ready for stock monitoring');
            console.log('   • Email Service - Ready for notifications');
            console.log('   • Data Logger - Ready for logging operations');
            console.log('   • Scheduler - Ready for automated tasks');
            console.log('');
            console.log('⏳ Application ready and waiting for instructions...');
            console.log('💡 Use scheduler functions to start monitoring and daily summaries');
            console.log('');

        } catch (error) {
            console.error('❌ Application initialization failed:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            throw error;
        }
    }

    /**
     * Verify that all required configuration is present
     */
    verifyConfiguration() {
        const requiredConfig = ['PRODUCT_URL', 'FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
        const missing = requiredConfig.filter(key => !config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
    }

    /**
     * Verify that all modules are properly loaded
     */
    verifyModules() {
        // Verify functions exist
        if (typeof checkStock !== 'function') {
            throw new Error('Stock checker module not loaded properly');
        }
        if (typeof sendStockAlert !== 'function' || typeof sendDailySummary !== 'function') {
            throw new Error('Email service module not loaded properly');
        }
        if (typeof logStockCheck !== 'function' || typeof getLast24HourStats !== 'function') {
            throw new Error('Data logger module not loaded properly');
        }
        if (typeof startStockMonitoring !== 'function' || typeof startDailySummary !== 'function') {
            throw new Error('Scheduler module not loaded properly');
        }
    }

    /**
     * Wait for state lock to be available (prevents race conditions)
     * @param {number} timeout - Maximum wait time in milliseconds
     * @returns {Promise<boolean>} True if lock acquired, false if timeout
     */
    async waitForStateLock(timeout = 5000) {
        const start = Date.now();
        while (this.stateLock && (Date.now() - start) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return !this.stateLock;
    }

    /**
     * Acquire state lock for atomic operations
     * @returns {boolean} True if lock acquired successfully
     */
    async acquireStateLock() {
        if (this.stateLock) {
            return false;
        }
        this.stateLock = true;
        return true;
    }

    /**
     * Release state lock
     */
    releaseStateLock() {
        this.stateLock = false;
    }

    /**
     * Get current application state (read-only copy)
     * @returns {Object} Copy of current application state
     */
    getApplicationState() {
        return {
            ...this.applicationState,
            stateLocked: this.stateLock
        };
    }

    /**
     * Update stock status in application state atomically
     * @param {boolean} newStatus - New stock status
     * @param {string} timestamp - Timestamp of the check
     * @returns {Object} Result object with success status
     */
    async updateStockStatus(newStatus, timestamp) {
        try {
            // Wait for state lock
            const lockAcquired = await this.waitForStateLock();
            if (!lockAcquired) {
                return {
                    success: false,
                    error: 'Failed to acquire state lock for stock status update'
                };
            }

            await this.acquireStateLock();
            
            // Update state atomically
            this.applicationState.lastStockStatus = newStatus;
            this.applicationState.lastCheckTime = timestamp;
            this.applicationState.checkCount++;
            this.applicationState.lastStateUpdate = new Date().toISOString();
            
            this.releaseStateLock();
            
            return {
                success: true,
                previousStatus: this.applicationState.lastStockStatus,
                newStatus: newStatus,
                checkCount: this.applicationState.checkCount
            };
            
        } catch (error) {
            this.releaseStateLock();
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set check in progress status (prevents overlapping checks)
     * @param {boolean} inProgress - Whether check is in progress
     * @returns {Object} Result object with success status
     */
    async setCheckInProgress(inProgress) {
        try {
            const lockAcquired = await this.waitForStateLock();
            if (!lockAcquired) {
                return {
                    success: false,
                    error: 'Failed to acquire state lock for check status update'
                };
            }

            await this.acquireStateLock();
            
            // Prevent setting in progress if already in progress
            if (inProgress && this.applicationState.isCheckInProgress) {
                this.releaseStateLock();
                return {
                    success: false,
                    error: 'Stock check already in progress'
                };
            }
            
            this.applicationState.isCheckInProgress = inProgress;
            this.applicationState.lastStateUpdate = new Date().toISOString();
            
            this.releaseStateLock();
            
            return {
                success: true,
                isCheckInProgress: inProgress
            };
            
        } catch (error) {
            this.releaseStateLock();
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get last stock status for change detection
     * @returns {boolean|null} Last known stock status
     */
    getLastStockStatus() {
        return this.applicationState.lastStockStatus;
    }

    /**
     * Check if daily summary was already sent today
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {boolean} True if summary already sent for this date
     */
    isDailySummarySent(date) {
        return this.applicationState.dailySummaryLastSent === date;
    }

    /**
     * Update daily summary sent status
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Object} Result object with success status
     */
    async updateDailySummarySent(date) {
        try {
            const lockAcquired = await this.waitForStateLock();
            if (!lockAcquired) {
                return {
                    success: false,
                    error: 'Failed to acquire state lock for daily summary update'
                };
            }

            await this.acquireStateLock();
            
            this.applicationState.dailySummaryLastSent = date;
            this.applicationState.lastStateUpdate = new Date().toISOString();
            
            this.releaseStateLock();
            
            return {
                success: true,
                date: date
            };
            
        } catch (error) {
            this.releaseStateLock();
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set up graceful shutdown handling
     */
    setupShutdownHandlers() {
        const shutdownHandler = (signal) => {
            if (this.isShuttingDown) {
                console.log('⚠️  Force shutdown requested');
                process.exit(1);
            }

            console.log('');
            console.log(`🛑 Received ${signal} - Initiating graceful shutdown...`);
            this.shutdown(signal);
        };

        process.on('SIGINT', () => shutdownHandler('SIGINT'));
        process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            this.shutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            this.shutdown('UNHANDLED_REJECTION');
        });
    }

    /**
     * Graceful shutdown
     */
    async shutdown(reason) {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        const shutdownStart = new Date();

        try {
            console.log('📊 Shutdown initiated');
            console.log(`⏱️  Uptime: ${this.getUptime()}`);
            console.log(`🔍 Reason: ${reason}`);
            console.log('');

            // Future: Stop schedulers (Task 13.3)
            console.log('🔄 Preparing for scheduler cleanup...');
            console.log('ℹ️  (Scheduler cleanup will be implemented in Task 13.3)');
            
            // Future: Cleanup resources (Task 13.4)
            console.log('🧹 Preparing for resource cleanup...');
            console.log('ℹ️  (Resource cleanup will be implemented in Task 13.4)');

            const shutdownTime = Date.now() - shutdownStart.getTime();
            console.log('');
            console.log(`✅ Graceful shutdown completed in ${shutdownTime}ms`);
            console.log('👋 Nintendo Switch 2 Stock Monitor stopped');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
        } finally {
            process.exit(0);
        }
    }

    /**
     * Perform integrated stock check with logging and email alerts
     * This function orchestrates the complete check workflow with state management
     * @returns {Object} Summary of the stock check operation
     */
    async performStockCheck() {
        const checkStart = new Date();
        const result = {
            timestamp: checkStart.toISOString(),
            success: false,
            stockStatus: null,
            previousStatus: null,
            statusChanged: false,
            alertSent: false,
            errors: [],
            summary: '',
            wasBlocked: false
        };

        try {
            console.log('🔍 Performing integrated stock check...');

            // Step 1: Check if another check is in progress (prevent race conditions)
            console.log('🔒 Checking for concurrent operations...');
            const lockResult = await this.setCheckInProgress(true);
            if (!lockResult.success) {
                result.wasBlocked = true;
                result.errors.push('Check blocked: ' + lockResult.error);
                result.summary = 'Stock check blocked - another check in progress';
                console.warn('⚠️ Stock check blocked:', lockResult.error);
                return result;
            }

            try {
                // Step 2: Get previous status from application state
                const previousStatus = this.getLastStockStatus();
                result.previousStatus = previousStatus;
                console.log(`📊 Previous status: ${previousStatus === null ? 'None' : (previousStatus ? 'In Stock' : 'Out of Stock')}`);

                // Step 3: Check current stock status
                console.log('📡 Checking stock status...');
                const stockResult = await checkStock(config.PRODUCT_URL);
                
                if (stockResult.error) {
                    result.errors.push(`Stock check failed: ${stockResult.error}`);
                    console.warn('⚠️ Stock check had errors:', stockResult.error);
                }
                
                result.stockStatus = stockResult.inStock;
                console.log(`📊 Current status: ${stockResult.inStock ? 'In Stock' : 'Out of Stock'}`);

                // Step 4: Update application state with new status
                console.log('🔄 Updating application state...');
                const stateResult = await this.updateStockStatus(stockResult.inStock, stockResult.timestamp);
                if (!stateResult.success) {
                    result.errors.push(`State update failed: ${stateResult.error}`);
                    console.warn('⚠️ Failed to update application state:', stateResult.error);
                }

                // Step 5: Log the stock check result
                console.log('📝 Logging stock check result...');
                const logData = {
                    inStock: stockResult.inStock,
                    timestamp: stockResult.timestamp,
                    error: stockResult.error,
                    url: config.PRODUCT_URL
                };

                const logResult = logStockCheck(logData);
                if (!logResult.success) {
                    result.errors.push(`Logging failed: ${logResult.error}`);
                    console.warn('⚠️ Failed to log stock check:', logResult.error);
                } else {
                    console.log('✅ Stock check logged successfully');
                }

                // Step 6: Detect status changes using state
                if (previousStatus !== null) {
                    result.statusChanged = previousStatus !== stockResult.inStock;
                    
                    if (result.statusChanged) {
                        const changeDesc = previousStatus 
                            ? 'In Stock → Out of Stock' 
                            : 'Out of Stock → In Stock';
                        console.log(`🔄 Status changed: ${changeDesc}`);
                    } else {
                        console.log('📊 Status unchanged');
                    }
                } else {
                    console.log('🆕 First stock check - no previous status to compare');
                }

                // Step 7: Send email alert if stock became available
                const shouldSendAlert = result.statusChanged && !previousStatus && stockResult.inStock;
                
                if (shouldSendAlert) {
                    console.log('🚨 Stock became available! Sending alert email...');
                    
                    try {
                        const alertResult = await sendStockAlert(config.PRODUCT_URL, 'Nintendo Switch 2');
                        
                        if (alertResult.success) {
                            result.alertSent = true;
                            console.log('📧 Stock alert email sent successfully');
                        } else {
                            result.errors.push(`Email alert failed: ${alertResult.error}`);
                            console.error('❌ Failed to send stock alert:', alertResult.error);
                        }
                    } catch (emailError) {
                        result.errors.push(`Email alert error: ${emailError.message}`);
                        console.error('❌ Error sending stock alert:', emailError.message);
                    }
                } else if (result.statusChanged) {
                    console.log('ℹ️ Status changed but no alert needed (stock went out of stock)');
                } else {
                    console.log('ℹ️ No alert needed (status unchanged)');
                }

            } finally {
                // Always release the check lock
                const unlockResult = await this.setCheckInProgress(false);
                if (!unlockResult.success) {
                    result.errors.push(`Failed to release check lock: ${unlockResult.error}`);
                    console.warn('⚠️ Failed to release check lock:', unlockResult.error);
                }
            }

            // Step 8: Generate summary
            result.success = result.errors.length === 0;
            const duration = Date.now() - checkStart.getTime();
            
            result.summary = this.generateCheckSummary(result, duration);
            console.log('📋 ' + result.summary);

            return result;

        } catch (error) {
            // Ensure lock is released on error
            try {
                await this.setCheckInProgress(false);
            } catch (unlockError) {
                console.error('❌ Failed to release lock on error:', unlockError.message);
            }
            
            result.errors.push(`Unexpected error: ${error.message}`);
            result.summary = `Stock check failed: ${error.message}`;
            console.error('❌ Stock check failed with unexpected error:', error.message);
            return result;
        }
    }



    /**
     * Generate a summary message for the stock check operation
     */
    generateCheckSummary(result, duration) {
        if (result.wasBlocked) {
            return `Stock check blocked in ${duration}ms - concurrent check in progress`;
        }
        
        const status = result.stockStatus ? 'In Stock' : 'Out of Stock';
        const errorCount = result.errors.length;
        
        let summary = `Stock check completed in ${duration}ms - Status: ${status}`;
        
        if (result.statusChanged) {
            summary += ', Status Changed';
        }
        
        if (result.alertSent) {
            summary += ', Alert Sent';
        }
        
        if (errorCount > 0) {
            summary += `, ${errorCount} Error${errorCount > 1 ? 's' : ''}`;
        }
        
        return summary;
    }

    /**
     * Perform daily summary calculation and email sending
     * This function orchestrates the complete daily summary workflow with state management
     * @returns {Object} Summary of the daily summary operation
     */
    async performDailySummary() {
        const summaryStart = new Date();
        const result = {
            timestamp: summaryStart.toISOString(),
            success: false,
            date: null,
            statsRetrieved: false,
            emailSent: false,
            alreadySent: false,
            errors: [],
            summary: ''
        };

        try {
            console.log('📊 Performing daily summary...');

            // Step 1: Calculate yesterday's date
            const yesterdayDate = this.getYesterdayDate();
            result.date = yesterdayDate;
            console.log(`📅 Generating summary for ${yesterdayDate}`);

            // Step 2: Check if summary was already sent for this date
            console.log('🔍 Checking if summary already sent...');
            if (this.isDailySummarySent(yesterdayDate)) {
                result.alreadySent = true;
                result.summary = `Daily summary already sent for ${yesterdayDate}`;
                console.log('ℹ️ Daily summary already sent for this date, skipping');
                return result;
            }

            // Step 3: Get 24-hour statistics
            console.log('📈 Retrieving 24-hour statistics...');
            const statsResult = getLast24HourStats(yesterdayDate);
            
            if (!statsResult.success) {
                result.errors.push(`Statistics retrieval failed: ${statsResult.error}`);
                console.error('❌ Failed to get daily statistics:', statsResult.error);
                return result;
            }

            result.statsRetrieved = true;
            const stats = statsResult.data;
            console.log(`📊 Stats retrieved: ${stats.totalChecks} checks, ${stats.inStockCount} in stock, ${stats.statusChanges} changes`);

            // Step 4: Send daily summary email
            console.log('📧 Sending daily summary email...');
            try {
                const summaryResult = await sendDailySummary(stats, yesterdayDate, 'Nintendo Switch 2');
                
                if (summaryResult.success) {
                    result.emailSent = true;
                    console.log('✅ Daily summary email sent successfully');

                    // Step 5: Update state to prevent duplicate sends
                    console.log('🔄 Updating daily summary state...');
                    const stateResult = await this.updateDailySummarySent(yesterdayDate);
                    if (!stateResult.success) {
                        result.errors.push(`State update failed: ${stateResult.error}`);
                        console.warn('⚠️ Failed to update daily summary state:', stateResult.error);
                    }
                } else {
                    result.errors.push(`Email sending failed: ${summaryResult.error}`);
                    console.error('❌ Failed to send daily summary:', summaryResult.error);
                }
            } catch (emailError) {
                result.errors.push(`Email error: ${emailError.message}`);
                console.error('❌ Error sending daily summary:', emailError.message);
            }

            // Step 6: Generate summary
            result.success = result.errors.length === 0;
            const duration = Date.now() - summaryStart.getTime();
            
            result.summary = this.generateDailySummary(result, duration);
            console.log('📋 ' + result.summary);

            return result;

        } catch (error) {
            result.errors.push(`Unexpected error: ${error.message}`);
            result.summary = `Daily summary failed: ${error.message}`;
            console.error('❌ Daily summary failed with unexpected error:', error.message);
            return result;
        }
    }

    /**
     * Calculate yesterday's date in YYYY-MM-DD format
     * @returns {string} Yesterday's date
     */
    getYesterdayDate() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    /**
     * Generate a summary message for the daily summary operation
     */
    generateDailySummary(result, duration) {
        const errorCount = result.errors.length;
        
        if (result.alreadySent) {
            return `Daily summary skipped - already sent for ${result.date}`;
        }
        
        let summary = `Daily summary completed in ${duration}ms for ${result.date}`;
        
        if (result.statsRetrieved) {
            summary += ', Stats Retrieved';
        }
        
        if (result.emailSent) {
            summary += ', Email Sent';
        }
        
        if (errorCount > 0) {
            summary += `, ${errorCount} Error${errorCount > 1 ? 's' : ''}`;
        }
        
        return summary;
    }

    /**
     * Get application uptime
     */
    getUptime() {
        if (!this.startTime) {
            return 'Unknown';
        }
        
        const uptime = Date.now() - this.startTime.getTime();
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            shuttingDown: this.isShuttingDown,
            uptime: this.getUptime(),
            startTime: this.startTime
        };
    }
}

/**
 * Main application instance
 */
const app = new StockMonitorApp();

/**
 * Start the application if run directly
 */
async function main() {
    try {
        await app.initialize();
    } catch (error) {
        console.error('💥 Failed to start application:', error.message);
        process.exit(1);
    }
}

// Export for testing and external use
module.exports = {
    StockMonitorApp,
    app,
    main,
    performStockCheck: () => app.performStockCheck(),
    performDailySummary: () => app.performDailySummary(),
    getApplicationState: () => app.getApplicationState()
};

// Start application if this file is run directly
if (require.main === module) {
    main();
} 