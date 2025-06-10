#!/usr/bin/env node

/**
 * GitHub Actions Stock Check - One-shot execution
 * Performs a single stock check and exits (no persistent daemon)
 */

require('dotenv').config();
const config = require('./config');
const StockChecker = require('./stockChecker');
const EmailService = require('./emailService');
const DataLogger = require('./dataLogger');
const ErrorHandler = require('./errorHandler');

class GitHubStockCheck {
    constructor() {
        this.config = config;
        this.errorHandler = new ErrorHandler();
        this.stockChecker = new StockChecker(this.config.PRODUCT_URL);
        this.emailService = new EmailService(
            this.config.FROM_EMAIL,
            this.config.TO_EMAIL,
            this.config.RESEND_API_KEY
        );
        this.dataLogger = new DataLogger();
        this.lastKnownStatus = null;
    }

    async initialize() {
        try {
            console.log('🎮 GitHub Actions Stock Check - One-shot Execution');
            console.log('=====================================================');
            console.log(`🚀 Starting at ${new Date().toISOString()}`);
            
            // Initialize error logging
            await this.errorHandler.initializeLogging();
            console.log('✅ Error logging system initialized');

            // Validate configuration
            this.validateConfiguration();
            console.log('✅ Configuration validated');

            // Load previous status from data
            await this.loadPreviousStatus();
            console.log('✅ Previous status loaded');

            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            await this.errorHandler.logError(error, 'application', {
                context: 'GitHub Actions initialization'
            });
            process.exit(1);
        }
    }

    validateConfiguration() {
        const required = ['PRODUCT_URL', 'FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        console.log('📍 Product URL:', this.config.PRODUCT_URL);
        console.log('📧 Email configured:', `${this.config.FROM_EMAIL} → ${this.config.TO_EMAIL}`);
    }

    async loadPreviousStatus() {
        try {
            const recentChecks = await this.dataLogger.getRecentChecks(1);
            if (recentChecks.length > 0) {
                this.lastKnownStatus = recentChecks[0].status;
                console.log(`📊 Previous status: ${this.lastKnownStatus}`);
            } else {
                console.log('📊 No previous status found (first run)');
            }
        } catch (error) {
            console.log('⚠️ Could not load previous status, treating as first run');
            this.lastKnownStatus = null;
        }
    }

    async performStockCheck() {
        console.log('\n🔍 Performing stock check...');
        
        try {
            // Perform stock check with retry logic
            const result = await this.errorHandler.retryWithExponentialBackoff(
                () => this.stockChecker.checkStock(),
                3, // 3 attempts
                2000, // Start with 2 second delay
                'Stock check'
            );

            console.log(`📊 Current status: ${result.status}`);
            console.log(`🕐 Check completed at: ${result.timestamp}`);

            // Log the result
            await this.dataLogger.logStockCheck(result);
            console.log('✅ Stock check logged successfully');

            // Check if status changed and send alert if needed
            await this.handleStatusChange(result);

            return result;

        } catch (error) {
            console.error('❌ Stock check failed:', error.message);
            await this.errorHandler.logError(error, 'network', {
                context: 'GitHub Actions stock check',
                url: this.config.PRODUCT_URL
            });
            
            // Don't fail the workflow for stock check errors
            // Just log and continue
            return {
                status: 'Error',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async handleStatusChange(result) {
        try {
            // Only send alert if status changed from previous check
            if (this.lastKnownStatus && this.lastKnownStatus !== result.status) {
                console.log(`🔄 Status changed: ${this.lastKnownStatus} → ${result.status}`);
                
                if (result.status === 'In Stock') {
                    console.log('📧 Sending stock alert email...');
                    await this.emailService.sendStockAlert();
                    console.log('✅ Stock alert sent successfully');
                } else if (result.status === 'Out of Stock') {
                    console.log('📧 Stock is now out of stock');
                    // Optionally send out-of-stock notification
                }
            } else if (!this.lastKnownStatus) {
                console.log('ℹ️ First check - no alert sent');
            } else {
                console.log('ℹ️ Status unchanged - no alert needed');
            }
        } catch (error) {
            console.error('❌ Failed to handle status change:', error.message);
            await this.errorHandler.logError(error, 'email', {
                context: 'Status change notification',
                currentStatus: result.status,
                previousStatus: this.lastKnownStatus
            });
        }
    }

    async cleanup() {
        try {
            console.log('\n🧹 Performing cleanup...');
            
            // Perform any necessary maintenance
            await this.errorHandler.performMaintenance();
            console.log('✅ Maintenance completed');
            
            console.log('\n🎯 GitHub Actions stock check completed successfully!');
            console.log(`⏰ Execution time: ${new Date().toISOString()}`);
            
        } catch (error) {
            console.error('⚠️ Cleanup warning:', error.message);
            // Don't fail on cleanup errors
        }
    }

    async run() {
        try {
            // Initialize the application
            await this.initialize();
            
            // Perform single stock check
            const result = await this.performStockCheck();
            
            // Cleanup and exit
            await this.cleanup();
            
            // Exit with success
            process.exit(0);
            
        } catch (error) {
            console.error('💥 Fatal error in GitHub Actions stock check:', error.message);
            
            // Log the error
            try {
                await this.errorHandler.logError(error, 'application', {
                    context: 'GitHub Actions fatal error'
                });
            } catch (loggingError) {
                console.error('Failed to log error:', loggingError.message);
            }
            
            // Exit with failure
            process.exit(1);
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the GitHub Actions stock check
if (require.main === module) {
    const githubStockCheck = new GitHubStockCheck();
    githubStockCheck.run();
}

module.exports = GitHubStockCheck; 