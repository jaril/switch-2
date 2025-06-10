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
     * This function orchestrates the complete check workflow
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
            summary: ''
        };

        try {
            console.log('🔍 Performing integrated stock check...');

            // Step 1: Check current stock status
            console.log('📡 Checking stock status...');
            const stockResult = await checkStock(config.PRODUCT_URL);
            
            if (stockResult.error) {
                result.errors.push(`Stock check failed: ${stockResult.error}`);
                console.warn('⚠️ Stock check had errors:', stockResult.error);
            }
            
            result.stockStatus = stockResult.inStock;
            console.log(`📊 Current status: ${stockResult.inStock ? 'In Stock' : 'Out of Stock'}`);

            // Step 2: Log the stock check result
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

            // Step 3: Get previous status to detect changes
            console.log('🔍 Checking for status changes...');
            const previousStatus = this.getPreviousStockStatus();
            result.previousStatus = previousStatus;

            // Determine if status changed
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

            // Step 4: Send email alert if stock became available
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

            // Step 5: Generate summary
            result.success = result.errors.length === 0;
            const duration = Date.now() - checkStart.getTime();
            
            result.summary = this.generateCheckSummary(result, duration);
            console.log('📋 ' + result.summary);

            return result;

        } catch (error) {
            result.errors.push(`Unexpected error: ${error.message}`);
            result.summary = `Stock check failed: ${error.message}`;
            console.error('❌ Stock check failed with unexpected error:', error.message);
            return result;
        }
    }

    /**
     * Get the previous stock status from recent logs
     * @returns {boolean|null} Previous stock status or null if no previous data
     */
    getPreviousStockStatus() {
        try {
            const logsResult = getAllLogs();
            
            if (!logsResult.success || !logsResult.data || logsResult.data.length === 0) {
                return null;
            }

            // Get the most recent log entry (excluding the one we just added)
            const logs = logsResult.data;
            if (logs.length < 2) {
                return null; // Only one entry (the one we just added)
            }

            // Get the second-to-last entry (previous status)
            const previousLog = logs[logs.length - 2];
            return previousLog.inStock;

        } catch (error) {
            console.warn('⚠️ Could not determine previous status:', error.message);
            return null;
        }
    }

    /**
     * Generate a summary message for the stock check operation
     */
    generateCheckSummary(result, duration) {
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
    performStockCheck: () => app.performStockCheck()
};

// Start application if this file is run directly
if (require.main === module) {
    main();
} 