#!/usr/bin/env node

/**
 * GitHub Actions Daily Summary - One-shot execution
 * Generates and sends daily summary email and exits (no persistent daemon)
 */

require('dotenv').config();
const config = require('./config');
const EmailService = require('./emailService');
const DataLogger = require('./dataLogger');
const ErrorHandler = require('./errorHandler');

class GitHubDailySummary {
    constructor() {
        this.config = config;
        this.errorHandler = new ErrorHandler();
        this.emailService = new EmailService(
            this.config.FROM_EMAIL,
            this.config.TO_EMAIL,
            this.config.RESEND_API_KEY
        );
        this.dataLogger = new DataLogger();
    }

    async initialize() {
        try {
            console.log('📊 GitHub Actions Daily Summary - One-shot Execution');
            console.log('====================================================');
            console.log(`🚀 Starting at ${new Date().toISOString()}`);
            
            // Initialize error logging
            await this.errorHandler.initializeLogging();
            console.log('✅ Error logging system initialized');

            // Validate configuration
            this.validateConfiguration();
            console.log('✅ Configuration validated');

            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            await this.errorHandler.logError(error, 'application', {
                context: 'GitHub Actions daily summary initialization'
            });
            process.exit(1);
        }
    }

    validateConfiguration() {
        const required = ['FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        console.log('📧 Email configured:', `${this.config.FROM_EMAIL} → ${this.config.TO_EMAIL}`);
    }

    async generateDailySummary() {
        console.log('\n📈 Generating daily summary...');
        
        try {
            // Get stock checks from last 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentChecks = await this.dataLogger.getChecksSince(twentyFourHoursAgo);
            
            console.log(`📊 Found ${recentChecks.length} stock checks in last 24 hours`);

            if (recentChecks.length === 0) {
                console.log('⚠️ No stock checks found in last 24 hours');
                return this.generateEmptySummary();
            }

            // Analyze the data
            const summary = this.analyzeDailyData(recentChecks);
            console.log('✅ Daily summary analysis completed');
            
            return summary;

        } catch (error) {
            console.error('❌ Failed to generate daily summary:', error.message);
            await this.errorHandler.logError(error, 'data', {
                context: 'Daily summary generation'
            });
            
            // Return empty summary rather than failing
            return this.generateEmptySummary();
        }
    }

    analyzeDailyData(checks) {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Basic statistics
        const totalChecks = checks.length;
        const inStockCount = checks.filter(check => check.status === 'In Stock').length;
        const outOfStockCount = checks.filter(check => check.status === 'Out of Stock').length;
        const errorCount = checks.filter(check => check.status === 'Error').length;
        
        // Status changes
        const statusChanges = [];
        for (let i = 1; i < checks.length; i++) {
            if (checks[i].status !== checks[i-1].status) {
                statusChanges.push({
                    from: checks[i-1].status,
                    to: checks[i].status,
                    timestamp: checks[i].timestamp
                });
            }
        }

        // Current status
        const currentStatus = checks.length > 0 ? checks[checks.length - 1].status : 'Unknown';
        
        // Time periods
        const firstCheck = checks.length > 0 ? new Date(checks[0].timestamp) : twentyFourHoursAgo;
        const lastCheck = checks.length > 0 ? new Date(checks[checks.length - 1].timestamp) : now;
        
        // Calculate uptime percentage (successful checks)
        const successfulChecks = totalChecks - errorCount;
        const uptimePercentage = totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(1) : '0';

        return {
            period: {
                start: firstCheck.toISOString(),
                end: lastCheck.toISOString(),
                duration: '24 hours'
            },
            statistics: {
                totalChecks,
                inStockCount,
                outOfStockCount,
                errorCount,
                uptimePercentage
            },
            statusChanges,
            currentStatus,
            summary: this.generateSummaryText(currentStatus, totalChecks, statusChanges, uptimePercentage)
        };
    }

    generateEmptySummary() {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        return {
            period: {
                start: twentyFourHoursAgo.toISOString(),
                end: now.toISOString(),
                duration: '24 hours'
            },
            statistics: {
                totalChecks: 0,
                inStockCount: 0,
                outOfStockCount: 0,
                errorCount: 0,
                uptimePercentage: '0'
            },
            statusChanges: [],
            currentStatus: 'No Data',
            summary: 'No stock checks performed in the last 24 hours. This may indicate a configuration or deployment issue.'
        };
    }

    generateSummaryText(currentStatus, totalChecks, statusChanges, uptimePercentage) {
        let summary = `Current stock status: ${currentStatus}. `;
        summary += `Performed ${totalChecks} stock checks with ${uptimePercentage}% uptime. `;
        
        if (statusChanges.length === 0) {
            summary += 'No status changes detected during this period.';
        } else {
            summary += `Detected ${statusChanges.length} status change${statusChanges.length > 1 ? 's' : ''}: `;
            summary += statusChanges.map(change => 
                `${change.from} → ${change.to} at ${new Date(change.timestamp).toLocaleString()}`
            ).join(', ');
        }
        
        return summary;
    }

    async sendDailySummary(summaryData) {
        console.log('\n📧 Sending daily summary email...');
        
        try {
            await this.emailService.sendDailySummary(summaryData);
            console.log('✅ Daily summary email sent successfully');
            
            // Log the summary generation
            await this.errorHandler.logInfo('Daily summary generated and sent', 'application', {
                totalChecks: summaryData.statistics.totalChecks,
                statusChanges: summaryData.statusChanges.length,
                currentStatus: summaryData.currentStatus,
                uptime: summaryData.statistics.uptimePercentage
            });
            
        } catch (error) {
            console.error('❌ Failed to send daily summary:', error.message);
            await this.errorHandler.logError(error, 'email', {
                context: 'Daily summary email sending',
                summaryData: {
                    totalChecks: summaryData.statistics.totalChecks,
                    currentStatus: summaryData.currentStatus
                }
            });
            throw error;
        }
    }

    async cleanup() {
        try {
            console.log('\n🧹 Performing cleanup...');
            
            // Perform maintenance tasks
            await this.errorHandler.performMaintenance();
            console.log('✅ Maintenance completed');
            
            console.log('\n🎯 GitHub Actions daily summary completed successfully!');
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
            
            // Generate daily summary data
            const summaryData = await this.generateDailySummary();
            
            // Send the summary email
            await this.sendDailySummary(summaryData);
            
            // Cleanup and exit
            await this.cleanup();
            
            // Exit with success
            process.exit(0);
            
        } catch (error) {
            console.error('💥 Fatal error in GitHub Actions daily summary:', error.message);
            
            // Log the error
            try {
                await this.errorHandler.logError(error, 'application', {
                    context: 'GitHub Actions daily summary fatal error'
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

// Run the GitHub Actions daily summary
if (require.main === module) {
    const githubDailySummary = new GitHubDailySummary();
    githubDailySummary.run();
}

module.exports = GitHubDailySummary; 