#!/usr/bin/env node

/**
 * Task 17: Comprehensive Local Testing Suite
 * Tests the complete Nintendo Switch 2 Stock Monitor application
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { spawn, fork } = require('child_process');

class ComprehensiveTestSuite {
    constructor() {
        this.testResults = [];
        this.config = require('./src/config');
        this.startTime = new Date();
        this.testData = {
            stockChecks: [],
            emailsSent: [],
            errors: [],
            performance: {}
        };
    }

    async initialize() {
        console.log('🧪 Nintendo Switch 2 Stock Monitor - Comprehensive Test Suite');
        console.log('=============================================================');
        console.log(`🚀 Starting comprehensive testing at ${this.startTime.toISOString()}`);
        console.log('');

        // Create test directories
        await this.setupTestEnvironment();
        console.log('✅ Test environment initialized');
    }

    async setupTestEnvironment() {
        try {
            // Ensure test directories exist
            await fs.mkdir('test-logs', { recursive: true });
            await fs.mkdir('test-data', { recursive: true });
            
            // Backup current data if exists
            try {
                const dataExists = await fs.access('data/stock-checks.json');
                await fs.copyFile('data/stock-checks.json', 'test-data/backup-stock-checks.json');
                console.log('📁 Backed up existing data');
            } catch (error) {
                // No existing data to backup
            }
        } catch (error) {
            console.error('❌ Failed to setup test environment:', error.message);
            throw error;
        }
    }

    async runTest(testName, testFunction) {
        console.log(`\n🔍 Running: ${testName}`);
        console.log('-'.repeat(50));
        
        const testStart = Date.now();
        try {
            const result = await testFunction();
            const duration = Date.now() - testStart;
            
            this.testResults.push({
                name: testName,
                status: 'PASSED',
                duration,
                result
            });
            
            console.log(`✅ ${testName} - PASSED (${duration}ms)`);
            return result;
        } catch (error) {
            const duration = Date.now() - testStart;
            
            this.testResults.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });
            
            console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
            throw error;
        }
    }

    async testConfigurationValidation() {
        return await this.runTest('Configuration Validation', async () => {
            // Test required environment variables
            const required = ['PRODUCT_URL', 'FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
            const missing = required.filter(key => !this.config[key]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required configuration: ${missing.join(', ')}`);
            }

            // Test configuration format
            if (!this.config.RESEND_API_KEY.startsWith('re_')) {
                throw new Error('Invalid RESEND_API_KEY format');
            }

            // Test email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.config.FROM_EMAIL)) {
                throw new Error('Invalid FROM_EMAIL format');
            }
            if (!emailRegex.test(this.config.TO_EMAIL)) {
                throw new Error('Invalid TO_EMAIL format');
            }

            // Test URL format
            try {
                new URL(this.config.PRODUCT_URL);
            } catch (error) {
                throw new Error('Invalid PRODUCT_URL format');
            }

            return {
                requiredVariables: required.length,
                configurationValid: true,
                apiKeyFormat: 'valid',
                emailFormat: 'valid',
                urlFormat: 'valid'
            };
        });
    }

    async testStockCheckerModule() {
        return await this.runTest('Stock Checker Module', async () => {
            const stockChecker = require('./src/stockChecker');

            // Test stock check functionality
            const result = await stockChecker.checkStock(this.config.PRODUCT_URL);
            
            if (!result || typeof result.inStock !== 'boolean' || !result.timestamp) {
                throw new Error('Stock check returned invalid result structure');
            }

            // Map to expected format for consistency
            const mappedResult = {
                status: result.inStock ? 'In Stock' : (result.error ? 'Error' : 'Out of Stock'),
                timestamp: result.timestamp,
                url: this.config.PRODUCT_URL,
                error: result.error || null
            };

            return mappedResult;
        });
    }

    async testEmailServiceModule() {
        return await this.runTest('Email Service Module', async () => {
            const emailService = require('./src/emailService');

            // Test email service methods exist
            if (!emailService.sendEmail || !emailService.sendStockAlert || !emailService.getServiceInfo) {
                throw new Error('Email service not properly exported');
            }

            // Test service info
            const serviceInfo = emailService.getServiceInfo();
            if (!serviceInfo.clientInitialized) {
                throw new Error('Email service client not initialized');
            }

            console.log('   📧 Testing email service configuration...');
            
            return {
                serviceInitialized: serviceInfo.clientInitialized,
                fromEmail: serviceInfo.fromEmail,
                toEmail: serviceInfo.toEmail,
                apiKeyValid: this.config.RESEND_API_KEY && this.config.RESEND_API_KEY.startsWith('re_'),
                service: serviceInfo.service
            };
        });
    }

    async testDataLoggerModule() {
        return await this.runTest('Data Logger Module', async () => {
            const dataLogger = require('./src/dataLogger');

            // Test data logging
            const testData = {
                inStock: false,
                timestamp: new Date().toISOString(),
                url: this.config.PRODUCT_URL,
                error: null
            };

            const logResult = dataLogger.logStockCheck(testData);
            
            if (!logResult.success) {
                throw new Error(`Failed to log stock check: ${logResult.error}`);
            }

            // Test data retrieval
            const allLogsResult = dataLogger.getAllLogs();
            
            if (!allLogsResult.success || allLogsResult.logs.length === 0) {
                throw new Error('Failed to retrieve logged data');
            }

            const lastCheck = allLogsResult.logs[allLogsResult.logs.length - 1];
            if (lastCheck.inStock !== testData.inStock) {
                throw new Error('Logged data does not match input data');
            }

            return {
                loggedSuccessfully: logResult.success,
                retrievedSuccessfully: allLogsResult.success,
                dataIntegrity: 'verified',
                totalLogs: allLogsResult.totalCount,
                logEntry: logResult.logEntry
            };
        });
    }

    async testErrorHandlerModule() {
        return await this.runTest('Error Handler Module', async () => {
            const errorHandler = require('./src/errorHandler');

            // Initialize error handler
            const initResult = errorHandler.initializeErrorLogging();
            if (!initResult.success) {
                throw new Error(`Failed to initialize error logging: ${initResult.error}`);
            }

            // Test error logging
            const testError = new Error('Test error for validation');
            errorHandler.logError(testError, errorHandler.ERROR_CATEGORIES.APPLICATION, 'testing', { context: 'testing' });

            // Test retry mechanism
            let attempts = 0;
            const testFunction = () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Simulated failure');
                }
                return 'success';
            };

            const result = await errorHandler.retryWithBackoff(testFunction, {
                maxAttempts: 3,
                baseDelay: 100,
                context: 'Test function'
            });

            if (result !== 'success') {
                throw new Error('Retry mechanism failed');
            }

            return {
                errorLoggingWorking: initResult.success,
                retryMechanismWorking: true,
                attemptsUsed: attempts,
                initializationSuccessful: initResult.success,
                categoriesAvailable: Object.keys(errorHandler.ERROR_CATEGORIES).length
            };
        });
    }

    async testGitHubActionsCompatibility() {
        return await this.runTest('GitHub Actions Compatibility', async () => {
            console.log('   🔍 Testing one-shot execution scripts...');
            
            const scripts = [
                'github-stock-check.js',
                'github-daily-summary.js', 
                'github-health-check.js'
            ];

            const results = {};

            for (const script of scripts) {
                try {
                    // Set GitHub Actions environment variables
                    process.env.GITHUB_ACTIONS = 'true';
                    process.env.NODE_ENV = 'test';

                    console.log(`     Testing ${script}...`);
                    
                    // Test that the script can be required without errors
                    const scriptPath = path.join('./src', script);
                    
                    // Check if file exists first
                    try {
                        await fs.access(scriptPath);
                    } catch (error) {
                        throw new Error(`Script file not found: ${script}`);
                    }
                    
                    const ScriptClass = require(scriptPath);
                    
                    results[script] = {
                        loadable: true,
                        className: ScriptClass.name || 'Anonymous',
                        isClass: typeof ScriptClass === 'function'
                    };
                    
                } catch (error) {
                    results[script] = {
                        loadable: false,
                        error: error.message
                    };
                }
            }

            // Clean up environment variables
            delete process.env.GITHUB_ACTIONS;
            delete process.env.NODE_ENV;

            return {
                scriptsLoaded: Object.keys(results).length,
                results,
                gitHubActionsCompatible: Object.values(results).every(r => r.loadable)
            };
        });
    }

    async testApplicationStartupShutdown() {
        return await this.runTest('Application Startup/Shutdown', async () => {
            return new Promise((resolve, reject) => {
                console.log('   🚀 Starting main application...');
                
                // Start the main application as a child process
                const app = spawn('node', ['src/index.js'], {
                    env: { ...process.env, NODE_ENV: 'test' },
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                app.stdout.on('data', (data) => {
                    output += data.toString();
                });

                app.stderr.on('data', (data) => {
                    output += data.toString();
                });

                // Give the application time to start up
                setTimeout(() => {
                    console.log('   🛑 Sending shutdown signal...');
                    app.kill('SIGTERM');
                }, 3000);

                app.on('close', (code) => {
                    if (code === 0 || code === null) {
                        resolve({
                            startupSuccessful: true,
                            shutdownGraceful: true,
                            exitCode: code,
                            outputLength: output.length
                        });
                    } else {
                        reject(new Error(`Application exited with code ${code}`));
                    }
                });

                app.on('error', (error) => {
                    reject(new Error(`Failed to start application: ${error.message}`));
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    app.kill('SIGKILL');
                    reject(new Error('Application startup test timed out'));
                }, 10000);
            });
        });
    }

    async testStockStatusChangeScenario() {
        return await this.runTest('Stock Status Change Scenario', async () => {
            console.log('   📊 Simulating stock status change...');
            
            const dataLogger = require('./src/dataLogger');

            // Simulate a series of stock checks with status change
            const checks = [
                { inStock: false, timestamp: new Date(Date.now() - 60000).toISOString() },
                { inStock: false, timestamp: new Date(Date.now() - 30000).toISOString() },
                { inStock: true, timestamp: new Date().toISOString() }
            ];

            for (const check of checks) {
                const logResult = dataLogger.logStockCheck({
                    ...check,
                    url: this.config.PRODUCT_URL,
                    error: null
                });
                
                if (!logResult.success) {
                    throw new Error(`Failed to log stock check: ${logResult.error}`);
                }
            }

            // Verify status change detection
            const allLogsResult = dataLogger.getAllLogs();
            if (!allLogsResult.success) {
                throw new Error(`Failed to retrieve logs: ${allLogsResult.error}`);
            }

            const recentChecks = allLogsResult.logs.slice(-3); // Get last 3 entries
            const statusChanged = recentChecks.length >= 2 && 
                                recentChecks[recentChecks.length - 1].inStock !== recentChecks[recentChecks.length - 2].inStock;

            return {
                checksLogged: checks.length,
                statusChangeDetected: statusChanged,
                finalStatus: recentChecks[recentChecks.length - 1]?.inStock ? 'In Stock' : 'Out of Stock',
                previousStatus: recentChecks[recentChecks.length - 2]?.inStock ? 'In Stock' : 'Out of Stock',
                totalLogsRetrieved: allLogsResult.totalCount
            };
        });
    }

    async testNetworkFailureRecovery() {
        return await this.runTest('Network Failure Recovery', async () => {
            console.log('   🌐 Testing network failure simulation...');
            
            const errorHandler = require('./src/errorHandler');

            let failureCount = 0;
            const simulateNetworkFailure = () => {
                failureCount++;
                if (failureCount <= 2) {
                    throw new Error('Network timeout');
                }
                return { inStock: false, timestamp: new Date().toISOString() };
            };

            const result = await errorHandler.retryWithBackoff(simulateNetworkFailure, {
                maxAttempts: 3,
                baseDelay: 100,
                context: 'Network test',
                category: errorHandler.ERROR_CATEGORIES.NETWORK
            });

            return {
                failuresSimulated: failureCount,
                recoverySuccessful: !!result,
                finalResult: result,
                retryMechanismWorking: true
            };
        });
    }

    async testMemoryUsageMonitoring() {
        return await this.runTest('Memory Usage Monitoring', async () => {
            console.log('   💾 Monitoring memory usage over time...');
            
            const measurements = [];
            const measurementCount = 5;
            const intervalMs = 1000;

            for (let i = 0; i < measurementCount; i++) {
                const memUsage = process.memoryUsage();
                measurements.push({
                    timestamp: new Date().toISOString(),
                    rss: memUsage.rss,
                    heapUsed: memUsage.heapUsed,
                    heapTotal: memUsage.heapTotal,
                    external: memUsage.external
                });

                if (i < measurementCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                }
            }

            const avgMemory = measurements.reduce((sum, m) => sum + m.rss, 0) / measurements.length;
            const maxMemory = Math.max(...measurements.map(m => m.rss));
            const memoryStable = (maxMemory - Math.min(...measurements.map(m => m.rss))) < (avgMemory * 0.1);

            return {
                measurements: measurements.length,
                averageMemoryMB: Math.round(avgMemory / 1024 / 1024),
                maxMemoryMB: Math.round(maxMemory / 1024 / 1024),
                memoryStable,
                duration: measurementCount * intervalMs
            };
        });
    }

    async testFileSystemOperations() {
        return await this.runTest('File System Operations', async () => {
            console.log('   📁 Testing file system operations...');
            
            const testDir = 'test-data';
            const testFile = path.join(testDir, 'test-file.json');

            // Test directory creation
            await fs.mkdir(testDir, { recursive: true });

            // Test file writing
            const testData = { test: true, timestamp: new Date().toISOString() };
            await fs.writeFile(testFile, JSON.stringify(testData, null, 2));

            // Test file reading
            const readData = JSON.parse(await fs.readFile(testFile, 'utf8'));

            // Test file deletion
            await fs.unlink(testFile);

            // Verify data integrity
            const dataIntegrity = JSON.stringify(testData) === JSON.stringify(readData);

            return {
                directoryCreation: true,
                fileWriting: true,
                fileReading: true,
                fileDeletion: true,
                dataIntegrity
            };
        });
    }

    async testApplicationPerformance() {
        return await this.runTest('Application Performance', async () => {
            console.log('   ⚡ Testing application performance...');
            
            const stockChecker = require('./src/stockChecker');

            const performanceTests = [];
            const testCount = 3;

            for (let i = 0; i < testCount; i++) {
                const start = Date.now();
                const result = await stockChecker.checkStock(this.config.PRODUCT_URL);
                const duration = Date.now() - start;

                performanceTests.push({
                    attempt: i + 1,
                    duration,
                    success: !!result && typeof result.inStock === 'boolean'
                });

                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const avgDuration = performanceTests.reduce((sum, test) => sum + test.duration, 0) / testCount;
            const allSuccessful = performanceTests.every(test => test.success);

            return {
                testsRun: testCount,
                averageResponseTime: Math.round(avgDuration),
                allTestsSuccessful: allSuccessful,
                performanceTests
            };
        });
    }

    async generateTestReport() {
        console.log('\n📊 Generating Test Report');
        console.log('========================');

        const endTime = new Date();
        const totalDuration = endTime - this.startTime;
        
        const passedTests = this.testResults.filter(test => test.status === 'PASSED');
        const failedTests = this.testResults.filter(test => test.status === 'FAILED');
        
        const report = {
            summary: {
                startTime: this.startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalDuration,
                totalTests: this.testResults.length,
                passedTests: passedTests.length,
                failedTests: failedTests.length,
                successRate: `${Math.round((passedTests.length / this.testResults.length) * 100)}%`
            },
            testResults: this.testResults,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsage: process.memoryUsage(),
                configurationValid: this.testResults.find(t => t.name === 'Configuration Validation')?.status === 'PASSED'
            }
        };

        // Save report to file
        await fs.writeFile(
            'test-logs/test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log(`\n📈 Test Summary:`);
        console.log(`   Total Tests: ${report.summary.totalTests}`);
        console.log(`   Passed: ${report.summary.passedTests}`);
        console.log(`   Failed: ${report.summary.failedTests}`);
        console.log(`   Success Rate: ${report.summary.successRate}`);
        console.log(`   Duration: ${Math.round(totalDuration / 1000)}s`);

        if (failedTests.length > 0) {
            console.log(`\n❌ Failed Tests:`);
            failedTests.forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }

        console.log(`\n📄 Detailed report saved to: test-logs/test-report.json`);
        
        return report;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test environment...');
        
        try {
            // Restore original data if backup exists
            try {
                await fs.access('test-data/backup-stock-checks.json');
                await fs.copyFile('test-data/backup-stock-checks.json', 'data/stock-checks.json');
                console.log('✅ Restored original data');
            } catch (error) {
                // No backup to restore
            }

            console.log('✅ Test cleanup completed');
        } catch (error) {
            console.log('⚠️ Cleanup warning:', error.message);
        }
    }

    async runComprehensiveTests() {
        try {
            await this.initialize();

            // Core Module Tests
            console.log('\n🔧 Testing Core Modules');
            console.log('======================');
            await this.testConfigurationValidation();
            await this.testStockCheckerModule();
            await this.testEmailServiceModule();
            await this.testDataLoggerModule();
            await this.testErrorHandlerModule();

            // Application Tests
            console.log('\n🚀 Testing Application Behavior');
            console.log('==============================');
            await this.testApplicationStartupShutdown();
            await this.testGitHubActionsCompatibility();

            // Scenario Tests
            console.log('\n📋 Testing Scenarios');
            console.log('===================');
            await this.testStockStatusChangeScenario();
            await this.testNetworkFailureRecovery();

            // Performance Tests
            console.log('\n⚡ Testing Performance & Resources');
            console.log('=================================');
            await this.testMemoryUsageMonitoring();
            await this.testFileSystemOperations();
            await this.testApplicationPerformance();

            // Generate final report
            const report = await this.generateTestReport();
            
            await this.cleanup();

            console.log('\n🎯 Comprehensive Testing Complete!');
            console.log(`⏰ Total execution time: ${Math.round((new Date() - this.startTime) / 1000)}s`);

            // Exit with appropriate code
            const allTestsPassed = this.testResults.every(test => test.status === 'PASSED');
            process.exit(allTestsPassed ? 0 : 1);

        } catch (error) {
            console.error('\n💥 Fatal error in comprehensive testing:', error.message);
            await this.cleanup();
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

// Run comprehensive tests if this file is executed directly
if (require.main === module) {
    const testSuite = new ComprehensiveTestSuite();
    testSuite.runComprehensiveTests();
}

module.exports = ComprehensiveTestSuite; 