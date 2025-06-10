/**
 * Nintendo Switch 2 Stock Monitor - Main Application Entry Point
 * Initializes all modules and manages application lifecycle
 */

const config = require('./config.js');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck, getLast24HourStats, initializeLogFile, getAllLogs } = require('./dataLogger.js');
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
        
        // Application lifecycle state
        this.isRunning = false;
        this.isStarting = false;
        this.isStopping = false;
        this.schedulersStarted = false;
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
            const loggerResult = initializeLogFile();
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
     * Handle runtime errors that should not crash the application
     * @param {Error} error - The error to handle
     * @param {string} context - Context where the error occurred
     */
    handleRuntimeError(error, context) {
        const timestamp = new Date().toISOString();
        console.error(`⚠️ Runtime error in ${context} at ${timestamp}:`, error.message);
        
        // Log to console but don't crash the application
        if (error.stack) {
            console.error('🔍 Stack trace:', error.stack);
        }
        
        // Could be extended to log to file or send alerts in the future
        console.log('✅ Application continues running despite error');
    }

    /**
     * Set up enhanced graceful shutdown handling with timeout
     */
    setupShutdownHandlers() {
        let forceExitTimeout = null;

        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown) {
                console.log('⚠️ Force shutdown requested - terminating immediately');
                if (forceExitTimeout) clearTimeout(forceExitTimeout);
                process.exit(1);
            }

            console.log('');
            console.log(`🛑 Received ${signal} - Initiating graceful shutdown...`);
            
            // Set timeout to force exit if graceful shutdown takes too long
            forceExitTimeout = setTimeout(() => {
                console.error('❌ Graceful shutdown timeout (35s) - forcing exit');
                process.exit(1);
            }, 35000); // 35 seconds to allow 30s for stopApplication + 5s buffer
            
            try {
                await this.shutdown(signal);
                if (forceExitTimeout) clearTimeout(forceExitTimeout);
            } catch (error) {
                console.error('❌ Error during graceful shutdown:', error.message);
                if (forceExitTimeout) clearTimeout(forceExitTimeout);
                process.exit(1);
            }
        };

        // Handle termination signals
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
        // Handle runtime errors
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            
            if (this.isShuttingDown) {
                console.log('⚠️ Already shutting down - forcing exit');
                process.exit(1);
            }
            
            try {
                await this.shutdown('UNCAUGHT_EXCEPTION');
            } catch (shutdownError) {
                console.error('❌ Error during exception shutdown:', shutdownError.message);
                process.exit(1);
            }
        });

        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            
            if (this.isShuttingDown) {
                console.log('⚠️ Already shutting down - forcing exit');
                process.exit(1);
            }
            
            try {
                await this.shutdown('UNHANDLED_REJECTION');
            } catch (shutdownError) {
                console.error('❌ Error during rejection shutdown:', shutdownError.message);
                process.exit(1);
            }
        });
    }

    /**
     * Start the complete application with all schedulers
     * @returns {Object} Result object with success status
     */
    async startApplication() {
        if (this.isRunning || this.isStarting) {
            return {
                success: false,
                message: 'Application is already running or starting'
            };
        }

        this.isStarting = true;
        const startupStart = new Date();

        try {
            console.log('🚀 Starting Nintendo Switch 2 Stock Monitor Application...');
            console.log('========================================================');
            console.log(`⏰ Startup initiated at ${startupStart.toISOString()}`);
            console.log('');

            // Step 1: Ensure application is initialized
            if (!this.isInitialized) {
                console.log('📋 Initializing application...');
                await this.initialize();
            }

            // Step 2: Reset application state to clean starting values
            console.log('🔄 Resetting application state...');
            await this.resetApplicationState();

            // Step 3: Start stock monitoring scheduler
            console.log('📊 Starting stock monitoring scheduler...');
            const stockMonitorResult = startStockMonitoring(() => this.performStockCheck());
            
            if (!stockMonitorResult.success) {
                throw new Error(`Failed to start stock monitoring: ${stockMonitorResult.message || stockMonitorResult.error}`);
            }
            console.log('✅ Stock monitoring scheduler started');

            // Step 4: Start daily summary scheduler
            console.log('📈 Starting daily summary scheduler...');
            const dailySummaryResult = startDailySummary(() => this.performDailySummary());
            
            if (!dailySummaryResult.success) {
                throw new Error(`Failed to start daily summary: ${dailySummaryResult.message || dailySummaryResult.error}`);
            }
            console.log('✅ Daily summary scheduler started');

            // Step 5: Mark application as running
            this.schedulersStarted = true;
            this.isRunning = true;
            this.isStarting = false;

            const startupTime = Date.now() - startupStart.getTime();
            console.log('');
            console.log('🎯 Application startup completed successfully!');
            console.log(`⚡ Startup time: ${startupTime}ms`);
            console.log('📊 Stock monitoring: Every 30 minutes');
            console.log('📈 Daily summaries: Midnight daily');
            console.log('🔒 State management: Active');
            console.log('');
            console.log('🟢 Nintendo Switch 2 Stock Monitor is now running!');
            console.log('⏳ Waiting for scheduled operations...');
            console.log('');

            return {
                success: true,
                message: 'Application started successfully',
                startupTime: startupTime
            };

        } catch (error) {
            this.isStarting = false;
            console.error('❌ Application startup failed:', error.message);
            
            // Attempt cleanup on startup failure
            try {
                console.log('🧹 Attempting cleanup after startup failure...');
                await this.stopApplication();
            } catch (cleanupError) {
                console.error('❌ Cleanup after startup failure also failed:', cleanupError.message);
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop the complete application gracefully
     * @param {number} timeout - Maximum time to wait for graceful shutdown (ms)
     * @returns {Object} Result object with success status
     */
    async stopApplication(timeout = 30000) {
        if (!this.isRunning && !this.isStarting) {
            return {
                success: true,
                message: 'Application is not running'
            };
        }

        if (this.isStopping) {
            return {
                success: false,
                message: 'Application is already stopping'
            };
        }

        this.isStopping = true;
        const shutdownStart = new Date();

        try {
            console.log('🛑 Stopping Nintendo Switch 2 Stock Monitor Application...');
            console.log('========================================================');
            console.log(`⏰ Shutdown initiated at ${shutdownStart.toISOString()}`);
            console.log(`⏱️  Uptime: ${this.getUptime()}`);
            console.log('');

            // Step 1: Stop schedulers from accepting new operations
            if (this.schedulersStarted) {
                console.log('⏸️ Stopping schedulers...');
                
                try {
                    const stockStopResult = stopStockMonitoring();
                    if (stockStopResult.success) {
                        console.log('✅ Stock monitoring scheduler stopped');
                    } else {
                        console.warn('⚠️ Stock monitoring stop warning:', stockStopResult.message);
                    }
                } catch (error) {
                    console.error('❌ Error stopping stock monitoring:', error.message);
                }

                try {
                    const summaryStopResult = stopDailySummary();
                    if (summaryStopResult.success) {
                        console.log('✅ Daily summary scheduler stopped');
                    } else {
                        console.warn('⚠️ Daily summary stop warning:', summaryStopResult.message);
                    }
                } catch (error) {
                    console.error('❌ Error stopping daily summary:', error.message);
                }

                this.schedulersStarted = false;
            }

            // Step 2: Wait for any in-progress operations to complete
            console.log('⏳ Waiting for in-progress operations...');
            const waitResult = await this.waitForOperationsToComplete(timeout);
            
            if (waitResult.success) {
                console.log('✅ All operations completed');
            } else {
                console.warn('⚠️ Timeout waiting for operations:', waitResult.message);
            }

            // Step 3: Clean up application state
            console.log('🧹 Cleaning up application state...');
            await this.cleanupApplicationState();

            // Step 4: Mark application as stopped
            this.isRunning = false;
            this.isStarting = false;
            this.isStopping = false;

            const shutdownTime = Date.now() - shutdownStart.getTime();
            console.log('');
            console.log('🎯 Application shutdown completed successfully!');
            console.log(`⚡ Shutdown time: ${shutdownTime}ms`);
            console.log('🔴 Nintendo Switch 2 Stock Monitor stopped');
            console.log('');

            return {
                success: true,
                message: 'Application stopped successfully',
                shutdownTime: shutdownTime
            };

        } catch (error) {
            console.error('❌ Error during application shutdown:', error.message);
            
            // Force stop even on error
            this.isRunning = false;
            this.isStarting = false;
            this.isStopping = false;
            this.schedulersStarted = false;

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Reset application state to clean starting values
     */
    async resetApplicationState() {
        try {
            await this.waitForStateLock();
            await this.acquireStateLock();
            
            this.applicationState = {
                lastStockStatus: null,
                lastCheckTime: null,
                isCheckInProgress: false,
                dailySummaryLastSent: null,
                checkCount: 0,
                lastStateUpdate: new Date().toISOString()
            };
            
            this.releaseStateLock();
            console.log('✅ Application state reset');
            
        } catch (error) {
            this.releaseStateLock();
            console.warn('⚠️ Failed to reset application state:', error.message);
        }
    }

    /**
     * Wait for any in-progress operations to complete
     * @param {number} timeout - Maximum wait time in milliseconds
     * @returns {Object} Result object with success status
     */
    async waitForOperationsToComplete(timeout = 30000) {
        const start = Date.now();
        
        while (this.applicationState.isCheckInProgress && (Date.now() - start) < timeout) {
            console.log('⏳ Waiting for stock check to complete...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (this.applicationState.isCheckInProgress) {
            return {
                success: false,
                message: 'Timeout waiting for operations to complete'
            };
        }
        
        return {
            success: true,
            message: 'All operations completed'
        };
    }

    /**
     * Clean up application state on shutdown
     */
    async cleanupApplicationState() {
        try {
            await this.waitForStateLock();
            await this.acquireStateLock();
            
            // Force clear any stuck states
            this.applicationState.isCheckInProgress = false;
            this.applicationState.lastStateUpdate = new Date().toISOString();
            
            this.releaseStateLock();
            console.log('✅ Application state cleaned up');
            
        } catch (error) {
            this.releaseStateLock();
            console.warn('⚠️ Failed to cleanup application state:', error.message);
        }
    }

    /**
     * Graceful shutdown (updated to use application lifecycle)
     */
    async shutdown(reason) {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;

        try {
            console.log('');
            console.log('📊 Process shutdown initiated');
            console.log(`🔍 Reason: ${reason}`);
            console.log('');

            // Use the new stopApplication method
            const stopResult = await this.stopApplication(30000);
            
            if (stopResult.success) {
                console.log('✅ Graceful shutdown completed');
            } else {
                console.error('❌ Graceful shutdown failed:', stopResult.error);
                console.log('⚠️ Proceeding with forced shutdown');
            }
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
        } finally {
            console.log('👋 Process terminating...');
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
 * Initialize the application only (no automatic startup)
 */
async function main() {
    try {
        await app.initialize();
        console.log('💡 Application initialized but not started automatically');
        console.log('💡 Use app.startApplication() to begin monitoring');
        console.log('💡 Use app.stopApplication() to stop monitoring');
    } catch (error) {
        console.error('💥 Failed to initialize application:', error.message);
        process.exit(1);
    }
}

/**
 * Start the application with full lifecycle management
 */
async function startApp() {
    try {
        const result = await app.startApplication();
        if (!result.success) {
            console.error('💥 Failed to start application:', result.error || result.message);
            process.exit(1);
        }
        return result;
    } catch (error) {
        console.error('💥 Failed to start application:', error.message);
        process.exit(1);
    }
}

/**
 * Stop the application gracefully
 */
async function stopApp() {
    try {
        const result = await app.stopApplication();
        if (!result.success) {
            console.warn('⚠️ Application stop completed with warnings:', result.error || result.message);
        }
        return result;
    } catch (error) {
        console.error('❌ Error stopping application:', error.message);
        return { success: false, error: error.message };
    }
}

// Export for testing and external use
module.exports = {
    StockMonitorApp,
    app,
    main,
    startApp,
    stopApp,
    // Individual operations (for testing)
    performStockCheck: () => app.performStockCheck(),
    performDailySummary: () => app.performDailySummary(),
    getApplicationState: () => app.getApplicationState(),
    // Lifecycle methods (direct access)
    startApplication: () => app.startApplication(),
    stopApplication: (timeout) => app.stopApplication(timeout),
    // Status methods
    getUptime: () => app.getUptime(),
    getStatus: () => app.getStatus()
};

// Initialize application if this file is run directly (but don't start automatically)
if (require.main === module) {
    main();
} 