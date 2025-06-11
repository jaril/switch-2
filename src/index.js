/**
 * Nintendo Switch 2 Stock Monitor - Main Application Entry Point with Error Handling & Resilience
 * Initializes all modules and manages application lifecycle with comprehensive error handling
 */

const config = require('./config.js');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck, getLast24HourStats, initializeLogFile, getAllLogs } = require('./dataLogger.js');
const { sendStockAlert, sendDailySummary } = require('./emailService.js');
const { startStockMonitoring, stopStockMonitoring, startDailySummary, stopDailySummary } = require('./scheduler.js');

// Enhanced error handling and resilience
const {
    ERROR_CATEGORIES,
    logError,
    retryWithBackoff,
    CircuitBreaker,
    EmailQueue,
    HealthChecker,
    LogRotator,
    generateDailyErrorSummary,
    initializeErrorLogging
} = require('./errorHandler.js');

/**
 * Main Application Class with Enhanced Error Handling & Resilience
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
            lastStateUpdate: null,           // when state was last modified
            errorCount: 0,                   // total errors encountered
            lastErrorTime: null,             // timestamp of last error
            consecutiveFailures: 0           // consecutive stock check failures
        };
        
        // State lock for atomic operations
        this.stateLock = false;
        
        // Application lifecycle state
        this.isRunning = false;
        this.isStarting = false;
        this.isStopping = false;
        this.schedulersStarted = false;
        
        // Error handling and resilience components
        this.emailCircuitBreaker = new CircuitBreaker({
            name: 'email-service',
            failureThreshold: 5,
            timeout: 300000, // 5 minutes
            monitoringPeriod: 60000 // 1 minute
        });
        
        this.emailQueue = new EmailQueue({
            maxQueueSize: 50,
            retryDelay: 300000 // 5 minutes
        });
        
        this.healthChecker = new HealthChecker();
        
        this.logRotator = new LogRotator({
            maxDays: 30,
            maxFileSize: 10 * 1024 * 1024 // 10MB
        });
        
        // Error monitoring
        this.errorRates = {
            network: { count: 0, lastReset: Date.now() },
            email: { count: 0, lastReset: Date.now() },
            data: { count: 0, lastReset: Date.now() },
            application: { count: 0, lastReset: Date.now() }
        };
        
        // Setup unhandled error handlers
        this.setupGlobalErrorHandlers();
        
        console.log('🛡️ Enhanced error handling and resilience initialized');
    }

    /**
     * Initialize the application with enhanced error handling
     */
    async initialize() {
        try {
            console.log('🎮 Nintendo Switch 2 Stock Monitor with Enhanced Resilience');
            console.log('=========================================================');
            console.log(`🚀 Starting application at ${new Date().toISOString()}`);
            console.log('');

            // Step 1: Initialize error logging
            console.log('🚨 Initializing error logging system...');
            const errorLoggingResult = initializeErrorLogging();
            if (errorLoggingResult.success) {
                console.log('✅ Error logging system initialized');
            } else {
                console.warn('⚠️ Error logging initialization warning:', errorLoggingResult.error);
            }
            console.log('');

            // Step 2: Verify configuration
            console.log('⚙️  Verifying configuration...');
            this.verifyConfiguration();
            console.log('✅ Configuration loaded successfully');
            console.log(`📍 Product URL: ${config.PRODUCT_URL}`);
            console.log(`📧 Email configured: ${config.FROM_EMAIL} → ${config.TO_EMAIL}`);
            console.log('');

            // Step 3: Initialize data logger with resilience
            console.log('📊 Initializing data logger with backup mechanisms...');
            const loggerResult = await this.initializeDataLoggerWithResilience();
            if (loggerResult.success) {
                console.log('✅ Data logger initialized with resilience features');
                console.log(`📁 Log directory: ${loggerResult.logDir}`);
            } else {
                console.warn('⚠️ Data logger initialization warning:', loggerResult.error);
            }
            console.log('');

            // Step 4: Verify module imports
            console.log('🔧 Verifying module imports...');
            this.verifyModules();
            console.log('✅ All modules loaded successfully');
            console.log('');

            // Step 5: Set up health checks
            console.log('🏥 Setting up health checks...');
            this.setupHealthChecks();
            console.log('✅ Health checks configured');
            console.log('');

            // Step 6: Set up shutdown handlers
            console.log('🛡️  Setting up shutdown handlers...');
            this.setupShutdownHandlers();
            console.log('✅ Shutdown handlers configured');
            console.log('');

            // Step 7: Run initial health check
            console.log('🔍 Running initial health check...');
            const healthResult = await this.healthChecker.runChecks();
            console.log(`✅ Initial health check completed - Status: ${healthResult.overall}`);
            console.log('');

            this.isInitialized = true;
            this.startTime = new Date();
            
            console.log('🎯 Application initialized successfully with enhanced resilience!');
            console.log('📋 Available modules:');
            console.log('   • Stock Checker - Ready with retry logic and timeout handling');
            console.log('   • Email Service - Ready with circuit breaker and queue system');
            console.log('   • Data Logger - Ready with backup and corruption recovery');
            console.log('   • Scheduler - Ready with failure recovery');
            console.log('   • Error Handler - Active monitoring and logging');
            console.log('   • Health Checker - Continuous component monitoring');
            console.log('');
            console.log('⏳ Application ready with comprehensive error handling...');
            console.log('💡 Use scheduler functions to start monitoring and daily summaries');
            console.log('');

        } catch (error) {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'application-initialization', {
                step: 'initialization',
                isInitialized: this.isInitialized
            });
            console.error('❌ Application initialization failed:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            throw error;
        }
    }

    /**
     * Setup global error handlers for unhandled exceptions and rejections
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            logError(error, ERROR_CATEGORIES.APPLICATION, 'unhandled-promise-rejection', {
                promise: promise.toString(),
                isShuttingDown: this.isShuttingDown
            });
            
            console.error('🚨 Unhandled Promise Rejection:', error.message);
            
            // Don't exit immediately - try to continue operation
            if (!this.isShuttingDown) {
                console.log('🛡️ Application continuing despite unhandled rejection');
            }
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'uncaught-exception', {
                critical: true,
                willExit: true
            });
            
            console.error('💥 Uncaught Exception:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            console.error('🚨 Application will attempt graceful shutdown...');
            
            // Attempt graceful shutdown
            this.shutdown('uncaught-exception')
                .then(() => {
                    console.log('✅ Graceful shutdown completed');
                    process.exit(1);
                })
                .catch((shutdownError) => {
                    console.error('❌ Graceful shutdown failed:', shutdownError.message);
                    process.exit(1);
                });
        });
        
        // Handle memory warnings
        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning' || 
                warning.message.includes('memory')) {
                logError(warning, ERROR_CATEGORIES.APPLICATION, 'process-warning', {
                    warningName: warning.name,
                    warningCode: warning.code
                });
                console.warn('⚠️ Process warning:', warning.message);
            }
        });
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
     * Initialize data logger with resilience features
     */
    async initializeDataLoggerWithResilience() {
        try {
            // First attempt normal initialization
            const loggerResult = initializeLogFile();
            
            if (loggerResult.success) {
                // Setup backup mechanisms
                await this.setupDataBackups();
                
                // Check for and recover from corruption
                await this.checkAndRecoverCorruptedLogs();
                
                return {
                    success: true,
                    logDir: loggerResult.logDir,
                    message: 'Data logger initialized with resilience features'
                };
            } else {
                // Try recovery if initialization failed
                console.log('🔄 Attempting data logger recovery...');
                const recoveryResult = await this.recoverDataLogger();
                
                if (recoveryResult.success) {
                    return {
                        success: true,
                        logDir: recoveryResult.logDir,
                        message: 'Data logger recovered and initialized'
                    };
                } else {
                    throw new Error(recoveryResult.error);
                }
            }
        } catch (error) {
            logError(error, ERROR_CATEGORIES.DATA, 'data-logger-initialization');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Setup data backup mechanisms
     */
    async setupDataBackups() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const dataDir = path.join(__dirname, '..', 'data');
            const backupDir = path.join(dataDir, 'backups');
            
            // Create backup directory
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            console.log('💾 Data backup mechanisms initialized');
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.DATA, 'backup-setup');
            console.warn('⚠️ Backup setup failed:', error.message);
        }
    }

    /**
     * Check for and recover from corrupted log files
     */
    async checkAndRecoverCorruptedLogs() {
        try {
            const logs = getAllLogs();
            
            if (!logs.success && logs.error.includes('invalid')) {
                console.log('🔧 Corrupted log file detected, attempting recovery...');
                
                const fs = require('fs');
                const path = require('path');
                
                const logFile = path.join(__dirname, '..', 'data', 'stock-checks.json');
                const backupFile = logFile + '.backup.' + Date.now();
                
                // Backup corrupted file
                if (fs.existsSync(logFile)) {
                    fs.renameSync(logFile, backupFile);
                    console.log(`💾 Corrupted file backed up to: ${backupFile}`);
                }
                
                // Initialize fresh log file
                fs.writeFileSync(logFile, JSON.stringify([], null, 2));
                console.log('✅ Log file recovered');
                
                logError(new Error('Log file corruption recovered'), ERROR_CATEGORIES.DATA, 'corruption-recovery', {
                    backupFile,
                    recoveryTime: new Date().toISOString()
                });
            }
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.DATA, 'corruption-check');
            console.warn('⚠️ Log corruption check failed:', error.message);
        }
    }

    /**
     * Recover data logger from failure
     */
    async recoverDataLogger() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const dataDir = path.join(__dirname, '..', 'data');
            
            // Ensure data directory exists
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Try to initialize again
            const result = initializeLogFile();
            
            if (result.success) {
                console.log('✅ Data logger recovery successful');
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.DATA, 'data-logger-recovery');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Setup health checks for critical components
     */
    setupHealthChecks() {
        // Stock checker health check
        this.healthChecker.registerCheck('stock-checker', async () => {
            // Test with a simple request timeout
            const testUrl = 'https://httpbin.org/status/200';
            const axios = require('axios');
            
            try {
                const response = await axios.get(testUrl, { timeout: 3000 });
                return { status: 'healthy', responseTime: response.headers.date };
            } catch (error) {
                throw new Error(`Stock checker network test failed: ${error.message}`);
            }
        }, { timeout: 5000 });
        
        // Data logger health check
        this.healthChecker.registerCheck('data-logger', async () => {
            const logs = getAllLogs();
            if (logs.success) {
                return { status: 'healthy', totalLogs: logs.totalCount };
            } else {
                throw new Error(`Data logger unhealthy: ${logs.error}`);
            }
        });
        
        // Email circuit breaker health check
        this.healthChecker.registerCheck('email-circuit-breaker', async () => {
            const status = this.emailCircuitBreaker.getStatus();
            if (status.state === 'open') {
                throw new Error(`Email circuit breaker is open (${status.failureCount} failures)`);
            }
            return status;
        });
        
        // Application state health check
        this.healthChecker.registerCheck('application-state', async () => {
            const state = this.getApplicationState();
            
            // Check for excessive consecutive failures
            if (state.consecutiveFailures > 10) {
                throw new Error(`Too many consecutive failures: ${state.consecutiveFailures}`);
            }
            
            return {
                status: 'healthy',
                consecutiveFailures: state.consecutiveFailures,
                checkCount: state.checkCount,
                errorCount: state.errorCount
            };
        });
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

    /**
     * Update consecutive failures count
     */
    async updateConsecutiveFailures(failed) {
        try {
            await this.waitForStateLock();
            await this.acquireStateLock();
            
            if (failed) {
                this.applicationState.consecutiveFailures++;
            } else {
                this.applicationState.consecutiveFailures = 0;
            }
            
            this.applicationState.lastStateUpdate = new Date().toISOString();
            this.releaseStateLock();
            
        } catch (error) {
            this.releaseStateLock();
            logError(error, ERROR_CATEGORIES.APPLICATION, 'consecutive-failures-update');
        }
    }

    /**
     * Update error counts by category
     */
    async updateErrorCounts(category) {
        try {
            await this.waitForStateLock();
            await this.acquireStateLock();
            
            this.applicationState.errorCount++;
            this.applicationState.lastErrorTime = new Date().toISOString();
            this.applicationState.lastStateUpdate = new Date().toISOString();
            
            // Update category-specific error rates
            if (this.errorRates[category]) {
                this.errorRates[category].count++;
                
                // Reset hourly if needed
                const hourAgo = Date.now() - (60 * 60 * 1000);
                if (this.errorRates[category].lastReset < hourAgo) {
                    this.errorRates[category].count = 1;
                    this.errorRates[category].lastReset = Date.now();
                }
            }
            
            this.releaseStateLock();
            
        } catch (error) {
            this.releaseStateLock();
            logError(error, ERROR_CATEGORIES.APPLICATION, 'error-count-update');
        }
    }

    /**
     * Perform stock check with retry logic and exponential backoff
     */
    async performStockCheckWithRetry() {
        return await retryWithBackoff(
            async () => {
                const result = await checkStock(config.PRODUCT_URL);
                
                // If there's an error, throw it to trigger retry
                if (result.error) {
                    const error = new Error(result.error);
                    error.isNetworkError = result.error.includes('timeout') || 
                                          result.error.includes('network') ||
                                          result.error.includes('ENOTFOUND') ||
                                          result.error.includes('ECONNREFUSED');
                    throw error;
                }
                
                return result;
            },
            {
                maxAttempts: 3,
                baseDelay: 2000,
                maxDelay: 10000,
                backoffFactor: 2,
                context: 'stock-check',
                category: ERROR_CATEGORIES.NETWORK
            }
        );
    }

    /**
     * Update stock status with resilience
     */
    async updateStockStatusWithResilience(newStatus, timestamp) {
        try {
            return await this.updateStockStatus(newStatus, timestamp);
        } catch (error) {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'state-update-resilience');
            
            // Try once more after a short delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                return await this.updateStockStatus(newStatus, timestamp);
            } catch (retryError) {
                logError(retryError, ERROR_CATEGORIES.APPLICATION, 'state-update-retry-failed');
                return {
                    success: false,
                    error: `State update failed after retry: ${retryError.message}`
                };
            }
        }
    }

    /**
     * Log stock check with resilience and backup mechanisms
     */
    async logStockCheckWithResilience(logData) {
        try {
            // First attempt normal logging
            let result = logStockCheck(logData);
            
            if (result.success) {
                return result;
            }
            
            // If logging failed, try backup mechanisms
            console.log('🔄 Primary logging failed, attempting backup...');
            
            // Create backup log entry
            const backupDir = require('path').join(__dirname, '..', 'data', 'backups');
            const fs = require('fs');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = require('path').join(backupDir, `backup-${Date.now()}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(logData, null, 2));
            
            logError(new Error(result.error), ERROR_CATEGORIES.DATA, 'primary-logging-failed', {
                backupFile,
                logData
            });
            
            console.log(`💾 Stock check backed up to: ${backupFile}`);
            
            return {
                success: true,
                message: 'Logged to backup file',
                backupFile
            };
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.DATA, 'logging-resilience-failed');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send email with circuit breaker and resilience
     */
    async sendEmailWithResilience(emailFunction, emailType) {
        try {
            return await this.emailCircuitBreaker.execute(async () => {
                return await retryWithBackoff(
                    emailFunction,
                    {
                        maxAttempts: 2,
                        baseDelay: 1000,
                        maxDelay: 5000,
                        context: `email-${emailType}`,
                        category: ERROR_CATEGORIES.EMAIL
                    }
                );
            });
        } catch (error) {
            await this.updateErrorCounts('email');
            
            logError(error, ERROR_CATEGORIES.EMAIL, `email-resilience-${emailType}`, {
                circuitBreakerState: this.emailCircuitBreaker.getStatus().state
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Queue failed email for retry
     */
    queueFailedEmail(emailType, emailData) {
        try {
            console.log(`📬 Queueing failed email: ${emailType}`);
            this.emailQueue.enqueue(emailData);
        } catch (error) {
            logError(error, ERROR_CATEGORIES.EMAIL, 'email-queue-failed');
            console.error('❌ Failed to queue email:', error.message);
        }
    }

    /**
     * Perform maintenance tasks like log rotation and error summary
     */
    async performMaintenance() {
        try {
            console.log('🔧 Performing maintenance tasks...');
            
            // Rotate logs if needed
            await this.logRotator.rotateLogs();
            
            // Generate daily error summary
            await generateDailyErrorSummary();
            
            // Run health checks
            const healthResult = await this.healthChecker.runChecks();
            
            if (healthResult.overall !== 'healthy') {
                console.warn(`⚠️ Health check warning: ${healthResult.overall}`);
                logError(
                    new Error(`Health checks indicate ${healthResult.overall} status`),
                    ERROR_CATEGORIES.APPLICATION,
                    'health-check-warning',
                    healthResult
                );
            }
            
            console.log('✅ Maintenance tasks completed');
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'maintenance-failure');
            console.error('❌ Maintenance tasks failed:', error.message);
        }
    }

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

            // Perform final maintenance tasks
            await this.performMaintenance();

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
            logError(error, ERROR_CATEGORIES.APPLICATION, 'shutdown-error', { reason });
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

                // Step 3: Check current stock status with retry logic
                console.log('📡 Checking stock status with resilience...');
                let stockResult;
                
                try {
                    stockResult = await this.performStockCheckWithRetry();
                    console.log('✅ Stock check completed successfully');
                    
                    // Reset consecutive failures on success
                    await this.updateConsecutiveFailures(false);
                } catch (error) {
                    // Handle stock check failure with resilience
                    stockResult = {
                        inStock: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                    
                    result.errors.push(`Stock check failed after retries: ${error.message}`);
                    console.warn('⚠️ Stock check failed after all retries:', error.message);
                    
                    // Update consecutive failures
                    await this.updateConsecutiveFailures(true);
                    await this.updateErrorCounts('network');
                    
                    logError(error, ERROR_CATEGORIES.NETWORK, 'stock-check-final-failure', {
                        consecutiveFailures: this.applicationState.consecutiveFailures
                    });
                }
                
                result.stockStatus = stockResult.inStock;
                console.log(`📊 Current status: ${stockResult.inStock ? 'In Stock' : 'Out of Stock'}`);

                // Step 4: Update application state with resilience
                console.log('🔄 Updating application state with resilience...');
                const stateResult = await this.updateStockStatusWithResilience(stockResult.inStock, stockResult.timestamp);
                if (!stateResult.success) {
                    result.errors.push(`State update failed: ${stateResult.error}`);
                    console.warn('⚠️ Failed to update application state with resilience:', stateResult.error);
                    await this.updateErrorCounts('application');
                } else {
                    console.log('✅ Application state updated successfully');
                }

                // Step 5: Log the stock check result with backup mechanisms
                console.log('📝 Logging stock check result with resilience...');
                const logData = {
                    inStock: stockResult.inStock,
                    timestamp: stockResult.timestamp,
                    error: stockResult.error,
                    url: config.PRODUCT_URL,
                    retryAttempts: stockResult.retryAttempts || 0,
                    consecutiveFailures: this.applicationState.consecutiveFailures
                };

                const logResult = await this.logStockCheckWithResilience(logData);
                if (!logResult.success) {
                    result.errors.push(`Logging failed: ${logResult.error}`);
                    console.warn('⚠️ Failed to log stock check even with resilience:', logResult.error);
                    await this.updateErrorCounts('data');
                } else {
                    console.log('✅ Stock check logged successfully');
                    if (logResult.backupFile) {
                        console.log(`💾 Used backup logging: ${logResult.backupFile}`);
                    }
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

                // Step 7: Send email alert if stock became available with circuit breaker
                const shouldSendAlert = result.statusChanged && !previousStatus && stockResult.inStock;
                
                if (shouldSendAlert) {
                    console.log('🚨 Stock became available! Sending alert email with resilience...');
                    
                    const alertResult = await this.sendEmailWithResilience(
                        async () => await sendStockAlert(config.PRODUCT_URL, 'Nintendo Switch 2'),
                        'stock-alert'
                    );
                    
                    if (alertResult.success) {
                        result.alertSent = true;
                        console.log('📧 Stock alert email sent successfully');
                    } else {
                        result.errors.push(`Email alert failed: ${alertResult.error}`);
                        console.error('❌ Failed to send stock alert with resilience:', alertResult.error);
                        
                        // Queue email for retry if circuit breaker prevents immediate sending
                        this.queueFailedEmail('stock-alert', {
                            subject: '🎮 Nintendo Switch 2 is IN STOCK at Costco!',
                            productUrl: config.PRODUCT_URL,
                            productName: 'Nintendo Switch 2',
                            sendFunction: () => sendStockAlert(config.PRODUCT_URL, 'Nintendo Switch 2')
                        });
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
            // Enhanced error handling with comprehensive logging
            logError(error, ERROR_CATEGORIES.APPLICATION, 'stock-check-unexpected', {
                wasInProgress: this.applicationState.isCheckInProgress,
                previousStatus: result.previousStatus,
                errorCount: this.applicationState.errorCount
            });
            
            // Update error counts
            await this.updateErrorCounts('application');
            
            // Ensure lock is released on error
            try {
                await this.setCheckInProgress(false);
            } catch (unlockError) {
                console.error('❌ Failed to release lock on error:', unlockError.message);
                logError(unlockError, ERROR_CATEGORIES.APPLICATION, 'lock-release-failure');
            }
            
            result.errors.push(`Unexpected error: ${error.message}`);
            result.summary = `Stock check failed: ${error.message}`;
            console.error('❌ Stock check failed with unexpected error:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            
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
 * Initialize and start the application automatically
 */
async function main() {
    try {
        console.log('🚀 Starting Nintendo Switch 2 Stock Monitor...');
        const result = await app.startApplication();
        if (!result.success) {
            console.error('💥 Failed to start application:', result.error || result.message);
            process.exit(1);
        }
        console.log('✅ Application started successfully and monitoring every 30 minutes');
        console.log('💡 Press Ctrl+C to stop monitoring');
    } catch (error) {
        console.error('💥 Failed to start application:', error.message);
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