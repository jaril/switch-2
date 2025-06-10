#!/usr/bin/env node

/**
 * GitHub Actions Health Check - One-shot execution
 * Performs system health validation and configuration testing
 */

require('dotenv').config();
const config = require('./config');
const StockChecker = require('./stockChecker');
const EmailService = require('./emailService');
const DataLogger = require('./dataLogger');
const ErrorHandler = require('./errorHandler');

class GitHubHealthCheck {
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
        this.healthResults = {};
    }

    async initialize() {
        try {
            console.log('🏥 GitHub Actions Health Check - One-shot Execution');
            console.log('==================================================');
            console.log(`🚀 Starting at ${new Date().toISOString()}`);
            
            // Initialize error logging
            await this.errorHandler.initializeLogging();
            console.log('✅ Error logging system initialized');

            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            process.exit(1);
        }
    }

    async checkConfiguration() {
        console.log('\n⚙️ Checking configuration...');
        
        try {
            const configChecks = {
                productUrl: !!this.config.PRODUCT_URL,
                fromEmail: !!this.config.FROM_EMAIL,
                toEmail: !!this.config.TO_EMAIL,
                resendApiKey: !!this.config.RESEND_API_KEY,
                apiKeyFormat: this.config.RESEND_API_KEY && this.config.RESEND_API_KEY.startsWith('re_'),
                emailFormat: this.isValidEmail(this.config.FROM_EMAIL) && this.isValidEmail(this.config.TO_EMAIL),
                urlFormat: this.isValidUrl(this.config.PRODUCT_URL)
            };

            const allValid = Object.values(configChecks).every(check => check === true);
            
            this.healthResults.configuration = {
                status: allValid ? 'healthy' : 'unhealthy',
                details: configChecks,
                message: allValid ? 'All configuration checks passed' : 'Some configuration checks failed'
            };

            console.log(`📋 Configuration: ${allValid ? '✅ Healthy' : '❌ Unhealthy'}`);
            
            if (!allValid) {
                console.log('   Issues found:');
                Object.entries(configChecks).forEach(([key, value]) => {
                    if (!value) {
                        console.log(`   - ${key}: ❌ Failed`);
                    }
                });
            }

            return allValid;

        } catch (error) {
            console.error('❌ Configuration check failed:', error.message);
            this.healthResults.configuration = {
                status: 'error',
                error: error.message,
                message: 'Configuration check encountered an error'
            };
            return false;
        }
    }

    async checkNetworkConnectivity() {
        console.log('\n🌐 Checking network connectivity...');
        
        try {
            // Test connection to Costco website
            const stockCheckResult = await this.stockChecker.checkStock();
            
            const networkHealth = {
                costcoAccessible: !!stockCheckResult,
                responseReceived: !!stockCheckResult.status,
                validResponse: stockCheckResult.status !== 'Error'
            };

            const allValid = Object.values(networkHealth).every(check => check === true);
            
            this.healthResults.network = {
                status: allValid ? 'healthy' : 'unhealthy',
                details: networkHealth,
                lastCheck: stockCheckResult,
                message: allValid ? 'Network connectivity is working' : 'Network connectivity issues detected'
            };

            console.log(`🌐 Network: ${allValid ? '✅ Healthy' : '❌ Unhealthy'}`);
            if (stockCheckResult) {
                console.log(`   Current stock status: ${stockCheckResult.status}`);
            }

            return allValid;

        } catch (error) {
            console.error('❌ Network check failed:', error.message);
            this.healthResults.network = {
                status: 'error',
                error: error.message,
                message: 'Network connectivity check failed'
            };
            return false;
        }
    }

    async checkEmailService() {
        console.log('\n📧 Checking email service...');
        
        try {
            // Test email service connectivity (without actually sending)
            const emailHealth = {
                serviceInitialized: !!this.emailService,
                apiKeyPresent: !!this.config.RESEND_API_KEY,
                apiKeyFormat: this.config.RESEND_API_KEY && this.config.RESEND_API_KEY.startsWith('re_'),
                emailsConfigured: !!this.config.FROM_EMAIL && !!this.config.TO_EMAIL
            };

            const allValid = Object.values(emailHealth).every(check => check === true);
            
            this.healthResults.email = {
                status: allValid ? 'healthy' : 'unhealthy',
                details: emailHealth,
                message: allValid ? 'Email service configuration is valid' : 'Email service configuration issues detected'
            };

            console.log(`📧 Email Service: ${allValid ? '✅ Healthy' : '❌ Unhealthy'}`);
            
            if (!allValid) {
                console.log('   Issues found:');
                Object.entries(emailHealth).forEach(([key, value]) => {
                    if (!value) {
                        console.log(`   - ${key}: ❌ Failed`);
                    }
                });
            }

            return allValid;

        } catch (error) {
            console.error('❌ Email service check failed:', error.message);
            this.healthResults.email = {
                status: 'error',
                error: error.message,
                message: 'Email service check encountered an error'
            };
            return false;
        }
    }

    async checkDataStorage() {
        console.log('\n💾 Checking data storage...');
        
        try {
            // Test data logging functionality
            const testData = {
                status: 'Health Check Test',
                timestamp: new Date().toISOString(),
                url: this.config.PRODUCT_URL
            };

            await this.dataLogger.logStockCheck(testData);
            const recentChecks = await this.dataLogger.getRecentChecks(1);
            
            const dataHealth = {
                canWrite: true, // If we got here, writing worked
                canRead: recentChecks && Array.isArray(recentChecks),
                dataPresent: recentChecks && recentChecks.length > 0,
                validFormat: recentChecks && recentChecks[0] && recentChecks[0].timestamp
            };

            const allValid = Object.values(dataHealth).every(check => check === true);
            
            this.healthResults.dataStorage = {
                status: allValid ? 'healthy' : 'warning',
                details: dataHealth,
                recentChecks: recentChecks ? recentChecks.length : 0,
                message: allValid ? 'Data storage is working correctly' : 'Data storage has some issues'
            };

            console.log(`💾 Data Storage: ${allValid ? '✅ Healthy' : '⚠️ Warning'}`);
            console.log(`   Recent checks: ${recentChecks ? recentChecks.length : 0}`);

            return allValid;

        } catch (error) {
            console.error('❌ Data storage check failed:', error.message);
            this.healthResults.dataStorage = {
                status: 'error',
                error: error.message,
                message: 'Data storage check failed'
            };
            return false;
        }
    }

    async checkSystemResources() {
        console.log('\n💻 Checking system resources...');
        
        try {
            const systemHealth = {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                gitHubActions: !!process.env.GITHUB_ACTIONS
            };

            const memoryMB = Math.round(systemHealth.memory.rss / 1024 / 1024);
            const healthy = memoryMB < 500; // Healthy if under 500MB

            this.healthResults.system = {
                status: healthy ? 'healthy' : 'warning',
                details: systemHealth,
                memoryMB,
                message: `System resources ${healthy ? 'within normal limits' : 'showing high usage'}`
            };

            console.log(`💻 System: ${healthy ? '✅ Healthy' : '⚠️ Warning'}`);
            console.log(`   Node.js: ${systemHealth.nodeVersion}`);
            console.log(`   Platform: ${systemHealth.platform}`);
            console.log(`   Memory: ${memoryMB}MB`);
            console.log(`   GitHub Actions: ${systemHealth.gitHubActions ? 'Yes' : 'No'}`);

            return healthy;

        } catch (error) {
            console.error('❌ System check failed:', error.message);
            this.healthResults.system = {
                status: 'error',
                error: error.message,
                message: 'System resource check failed'
            };
            return false;
        }
    }

    generateHealthSummary() {
        const checks = Object.keys(this.healthResults);
        const healthyCount = checks.filter(check => 
            this.healthResults[check].status === 'healthy'
        ).length;
        const warningCount = checks.filter(check => 
            this.healthResults[check].status === 'warning'
        ).length;
        const errorCount = checks.filter(check => 
            this.healthResults[check].status === 'error'
        ).length;

        const overallStatus = errorCount > 0 ? 'error' : 
                             warningCount > 0 ? 'warning' : 'healthy';

        return {
            overall: overallStatus,
            summary: `${healthyCount}/${checks.length} checks passed`,
            breakdown: {
                healthy: healthyCount,
                warning: warningCount,
                error: errorCount,
                total: checks.length
            },
            details: this.healthResults
        };
    }

    isValidEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUrl(url) {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async cleanup() {
        try {
            console.log('\n🧹 Performing cleanup...');
            
            // Generate final health summary
            const healthSummary = this.generateHealthSummary();
            
            console.log('\n📋 Health Check Summary:');
            console.log('========================');
            console.log(`Overall Status: ${healthSummary.overall.toUpperCase()}`);
            console.log(`Results: ${healthSummary.summary}`);
            console.log(`Breakdown: ${healthSummary.breakdown.healthy} healthy, ${healthSummary.breakdown.warning} warnings, ${healthSummary.breakdown.error} errors`);
            
            // Log the health check results
            await this.errorHandler.logInfo('Health check completed', 'application', {
                overallStatus: healthSummary.overall,
                healthyCount: healthSummary.breakdown.healthy,
                warningCount: healthSummary.breakdown.warning,
                errorCount: healthSummary.breakdown.error
            });
            
            console.log('\n🎯 GitHub Actions health check completed!');
            console.log(`⏰ Execution time: ${new Date().toISOString()}`);
            
            // Exit with appropriate code
            if (healthSummary.overall === 'error') {
                console.log('❌ Exiting with error status due to failed checks');
                process.exit(1);
            } else if (healthSummary.overall === 'warning') {
                console.log('⚠️ Exiting with warning status');
                process.exit(0); // Don't fail workflow for warnings
            } else {
                console.log('✅ All health checks passed');
                process.exit(0);
            }
            
        } catch (error) {
            console.error('⚠️ Cleanup error:', error.message);
            process.exit(1);
        }
    }

    async run() {
        try {
            // Initialize the health check
            await this.initialize();
            
            // Run all health checks
            console.log('\n🔍 Running comprehensive health checks...');
            
            const checks = [
                this.checkConfiguration(),
                this.checkNetworkConnectivity(), 
                this.checkEmailService(),
                this.checkDataStorage(),
                this.checkSystemResources()
            ];

            await Promise.all(checks);
            
            // Cleanup and generate summary
            await this.cleanup();
            
        } catch (error) {
            console.error('💥 Fatal error in GitHub Actions health check:', error.message);
            
            // Log the error
            try {
                await this.errorHandler.logError(error, 'application', {
                    context: 'GitHub Actions health check fatal error'
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

// Run the GitHub Actions health check
if (require.main === module) {
    const githubHealthCheck = new GitHubHealthCheck();
    githubHealthCheck.run();
}

module.exports = GitHubHealthCheck; 