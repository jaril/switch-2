/**
 * Nintendo Switch 2 Stock Monitor - Main Application Entry Point
 * Initializes all modules and manages application lifecycle
 */

const config = require('./config.js');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck, getLast24HourStats, initializeDataLogger } = require('./dataLogger.js');
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
    main
};

// Start application if this file is run directly
if (require.main === module) {
    main();
} 