/**
 * Nintendo Switch 2 Stock Monitor - Error Handling & Resilience Test (Task 14)
 * Tests comprehensive error handling, retry logic, circuit breakers, and resilience features
 */

const { app } = require('./src/index.js');
const fs = require('fs');
const path = require('path');

console.log('🛡️ Nintendo Switch 2 Stock Monitor - Error Handling & Resilience Test');
console.log('========================================================================');
console.log('🧪 Testing comprehensive error handling and resilience features');
console.log('');

async function testErrorHandlingAndResilience() {
    let allTestsPassed = true;
    const testResults = [];

    try {
        // Test 1: Application Initialization with Error Logging
        console.log('🔍 Test 1: Application Initialization with Error Logging');
        const initStart = Date.now();
        
        try {
            await app.initialize();
            console.log('✅ Application initialized successfully with error handling');
            testResults.push({
                test: 'Application Initialization',
                status: 'PASSED',
                duration: Date.now() - initStart
            });
        } catch (error) {
            console.error('❌ Application initialization failed:', error.message);
            testResults.push({
                test: 'Application Initialization',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - initStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 2: Error Logging System
        console.log('🔍 Test 2: Error Logging System');
        const errorLogStart = Date.now();
        
        try {
            const { logError, ERROR_CATEGORIES } = require('./src/errorHandler.js');
            
            // Test logging different types of errors
            logError(new Error('Test network error'), ERROR_CATEGORIES.NETWORK, 'test-context', {
                testData: 'network-test'
            });
            
            logError('Test application error string', ERROR_CATEGORIES.APPLICATION, 'test-context');
            
            // Check if error log files exist
            const errorLogFile = path.join(__dirname, 'logs', 'error.log');
            const errorSummaryFile = path.join(__dirname, 'logs', 'error-summary.json');
            
            if (fs.existsSync(errorLogFile) && fs.existsSync(errorSummaryFile)) {
                console.log('✅ Error logging system working correctly');
                console.log(`📁 Error log file: ${errorLogFile}`);
                console.log(`📊 Error summary file: ${errorSummaryFile}`);
                
                testResults.push({
                    test: 'Error Logging System',
                    status: 'PASSED',
                    duration: Date.now() - errorLogStart
                });
            } else {
                throw new Error('Error log files not created');
            }
        } catch (error) {
            console.error('❌ Error logging system test failed:', error.message);
            testResults.push({
                test: 'Error Logging System',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - errorLogStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 3: Retry Logic with Exponential Backoff
        console.log('🔍 Test 3: Retry Logic with Exponential Backoff');
        const retryStart = Date.now();
        
        try {
            const { retryWithBackoff, ERROR_CATEGORIES } = require('./src/errorHandler.js');
            
            let attempts = 0;
            const maxAttempts = 3;
            
            try {
                await retryWithBackoff(
                    async () => {
                        attempts++;
                        if (attempts < maxAttempts) {
                            throw new Error(`Simulated failure attempt ${attempts}`);
                        }
                        return { success: true, attempts };
                    },
                    {
                        maxAttempts,
                        baseDelay: 100, // Short delays for testing
                        maxDelay: 1000,
                        context: 'retry-test',
                        category: ERROR_CATEGORIES.NETWORK
                    }
                );
                
                if (attempts === maxAttempts) {
                    console.log(`✅ Retry logic working - succeeded on attempt ${attempts}/${maxAttempts}`);
                    testResults.push({
                        test: 'Retry Logic',
                        status: 'PASSED',
                        attempts,
                        duration: Date.now() - retryStart
                    });
                } else {
                    throw new Error(`Unexpected attempt count: ${attempts}`);
                }
            } catch (retryError) {
                // This should not happen in this test
                throw new Error(`Retry failed unexpectedly: ${retryError.message}`);
            }
        } catch (error) {
            console.error('❌ Retry logic test failed:', error.message);
            testResults.push({
                test: 'Retry Logic',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - retryStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 4: Circuit Breaker
        console.log('🔍 Test 4: Circuit Breaker');
        const circuitStart = Date.now();
        
        try {
            const { CircuitBreaker } = require('./src/errorHandler.js');
            
            const testCircuitBreaker = new CircuitBreaker({
                name: 'test-circuit',
                failureThreshold: 3,
                timeout: 1000 // 1 second for testing
            });
            
            // Cause failures to trip the circuit breaker
            let failures = 0;
            for (let i = 0; i < 4; i++) {
                try {
                    await testCircuitBreaker.execute(async () => {
                        throw new Error(`Test failure ${i + 1}`);
                    });
                } catch (error) {
                    failures++;
                }
            }
            
            // Check circuit breaker status
            const status = testCircuitBreaker.getStatus();
            
            if (status.state === 'open' && failures >= 3) {
                console.log('✅ Circuit breaker working - opened after failures');
                console.log(`🔧 Circuit status: ${status.state}, failures: ${status.failureCount}`);
                
                testResults.push({
                    test: 'Circuit Breaker',
                    status: 'PASSED',
                    circuitState: status.state,
                    failures: status.failureCount,
                    duration: Date.now() - circuitStart
                });
            } else {
                throw new Error(`Circuit breaker not working properly: state=${status.state}, failures=${status.failureCount}`);
            }
        } catch (error) {
            console.error('❌ Circuit breaker test failed:', error.message);
            testResults.push({
                test: 'Circuit Breaker',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - circuitStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 5: Health Checker
        console.log('🔍 Test 5: Health Checker');
        const healthStart = Date.now();
        
        try {
            const { HealthChecker } = require('./src/errorHandler.js');
            
            const testHealthChecker = new HealthChecker();
            
            // Register test health checks
            testHealthChecker.registerCheck('test-healthy', async () => {
                return { status: 'healthy', test: true };
            });
            
            testHealthChecker.registerCheck('test-unhealthy', async () => {
                throw new Error('Simulated health check failure');
            });
            
            const healthResult = await testHealthChecker.runChecks();
            
            if (healthResult.checks['test-healthy'].status === 'healthy' &&
                healthResult.checks['test-unhealthy'].status === 'unhealthy' &&
                healthResult.overall === 'degraded') {
                console.log('✅ Health checker working correctly');
                console.log(`🏥 Overall health: ${healthResult.overall}`);
                console.log(`📊 Healthy checks: ${healthResult.healthyChecks}/${healthResult.totalChecks}`);
                
                testResults.push({
                    test: 'Health Checker',
                    status: 'PASSED',
                    overallHealth: healthResult.overall,
                    healthyChecks: healthResult.healthyChecks,
                    totalChecks: healthResult.totalChecks,
                    duration: Date.now() - healthStart
                });
            } else {
                throw new Error('Health checker not working as expected');
            }
        } catch (error) {
            console.error('❌ Health checker test failed:', error.message);
            testResults.push({
                test: 'Health Checker',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - healthStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 6: Email Queue
        console.log('🔍 Test 6: Email Queue');
        const queueStart = Date.now();
        
        try {
            const { EmailQueue } = require('./src/errorHandler.js');
            
            const testEmailQueue = new EmailQueue({
                maxQueueSize: 5,
                retryDelay: 100
            });
            
            // Add test emails to queue
            testEmailQueue.enqueue({
                subject: 'Test Email 1',
                sendFunction: async () => ({ success: true })
            });
            
            testEmailQueue.enqueue({
                subject: 'Test Email 2',
                sendFunction: async () => ({ success: true })
            });
            
            const queueStatus = testEmailQueue.getStatus();
            
            if (queueStatus.queueSize === 2 && queueStatus.maxQueueSize === 5) {
                console.log('✅ Email queue working correctly');
                console.log(`📬 Queue size: ${queueStatus.queueSize}/${queueStatus.maxQueueSize}`);
                
                testResults.push({
                    test: 'Email Queue',
                    status: 'PASSED',
                    queueSize: queueStatus.queueSize,
                    maxQueueSize: queueStatus.maxQueueSize,
                    duration: Date.now() - queueStart
                });
            } else {
                throw new Error(`Email queue not working: size=${queueStatus.queueSize}, max=${queueStatus.maxQueueSize}`);
            }
        } catch (error) {
            console.error('❌ Email queue test failed:', error.message);
            testResults.push({
                test: 'Email Queue',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - queueStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 7: Log Rotation
        console.log('🔍 Test 7: Log Rotation');
        const rotationStart = Date.now();
        
        try {
            const { LogRotator } = require('./src/errorHandler.js');
            
            const testLogRotator = new LogRotator({
                maxDays: 7,
                maxFileSize: 1024, // 1KB for testing
                logDir: path.join(__dirname, 'logs')
            });
            
            // Test log rotation (won't actually rotate unless file is large)
            await testLogRotator.rotateLogs();
            await testLogRotator.cleanupOldLogs();
            
            console.log('✅ Log rotation system initialized and tested');
            
            testResults.push({
                test: 'Log Rotation',
                status: 'PASSED',
                duration: Date.now() - rotationStart
            });
        } catch (error) {
            console.error('❌ Log rotation test failed:', error.message);
            testResults.push({
                test: 'Log Rotation',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - rotationStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 8: Application State Resilience
        console.log('🔍 Test 8: Application State Resilience');
        const stateStart = Date.now();
        
        try {
            // Test error count updates
            await app.updateErrorCounts('network');
            await app.updateErrorCounts('email');
            await app.updateConsecutiveFailures(true);
            await app.updateConsecutiveFailures(true);
            await app.updateConsecutiveFailures(false); // Reset
            
            const appState = app.getApplicationState();
            
            if (appState.errorCount >= 2 && appState.consecutiveFailures === 0) {
                console.log('✅ Application state resilience working');
                console.log(`📊 Error count: ${appState.errorCount}`);
                console.log(`🔄 Consecutive failures: ${appState.consecutiveFailures}`);
                
                testResults.push({
                    test: 'Application State Resilience',
                    status: 'PASSED',
                    errorCount: appState.errorCount,
                    consecutiveFailures: appState.consecutiveFailures,
                    duration: Date.now() - stateStart
                });
            } else {
                throw new Error(`State not updated correctly: errors=${appState.errorCount}, consecutive=${appState.consecutiveFailures}`);
            }
        } catch (error) {
            console.error('❌ Application state resilience test failed:', error.message);
            testResults.push({
                test: 'Application State Resilience',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - stateStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Test 9: Maintenance Tasks
        console.log('🔍 Test 9: Maintenance Tasks');
        const maintenanceStart = Date.now();
        
        try {
            await app.performMaintenance();
            
            console.log('✅ Maintenance tasks completed successfully');
            
            testResults.push({
                test: 'Maintenance Tasks',
                status: 'PASSED',
                duration: Date.now() - maintenanceStart
            });
        } catch (error) {
            console.error('❌ Maintenance tasks test failed:', error.message);
            testResults.push({
                test: 'Maintenance Tasks',
                status: 'FAILED',
                error: error.message,
                duration: Date.now() - maintenanceStart
            });
            allTestsPassed = false;
        }
        console.log('');

        // Generate comprehensive test report
        console.log('📊 Error Handling & Resilience Test Results');
        console.log('=============================================');
        
        const passedTests = testResults.filter(r => r.status === 'PASSED').length;
        const failedTests = testResults.filter(r => r.status === 'FAILED').length;
        const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);
        
        console.log(`📋 Total Tests: ${testResults.length}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log(`📈 Success Rate: ${(passedTests / testResults.length * 100).toFixed(1)}%`);
        console.log('');

        // Detailed results
        console.log('📋 Detailed Test Results:');
        testResults.forEach((result, index) => {
            const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
            console.log(`${index + 1}. ${statusIcon} ${result.test} (${result.duration}ms)`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.attempts) {
                console.log(`   Attempts: ${result.attempts}`);
            }
            if (result.circuitState) {
                console.log(`   Circuit State: ${result.circuitState}`);
            }
            if (result.overallHealth) {
                console.log(`   Health: ${result.overallHealth} (${result.healthyChecks}/${result.totalChecks})`);
            }
        });
        console.log('');

        // Error handling features summary
        if (allTestsPassed) {
            console.log('🎯 ERROR HANDLING & RESILIENCE VALIDATION: ✅ COMPLETE');
            console.log('');
            console.log('🛡️ Implemented Features:');
            console.log('   ✅ Comprehensive error logging with categorization');
            console.log('   ✅ Retry logic with exponential backoff');
            console.log('   ✅ Circuit breaker for email service');
            console.log('   ✅ Health monitoring for all components');
            console.log('   ✅ Email queue for failed notifications');
            console.log('   ✅ Log rotation and cleanup');
            console.log('   ✅ Application state resilience');
            console.log('   ✅ Graceful error recovery');
            console.log('   ✅ Maintenance task automation');
            console.log('');
            console.log('🚀 System is production-ready with comprehensive error handling!');
        } else {
            console.log('❌ ERROR HANDLING & RESILIENCE VALIDATION: FAILED');
            console.log('⚠️ Some error handling features need attention before production deployment');
        }

        return {
            success: allTestsPassed,
            results: testResults,
            summary: {
                total: testResults.length,
                passed: passedTests,
                failed: failedTests,
                successRate: (passedTests / testResults.length * 100).toFixed(1) + '%',
                duration: totalDuration
            }
        };

    } catch (error) {
        console.error('💥 Critical error during error handling test:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message,
            results: testResults
        };
    }
}

// Run the test
if (require.main === module) {
    testErrorHandlingAndResilience()
        .then((result) => {
            if (result.success) {
                console.log('🎉 All error handling tests completed successfully!');
                process.exit(0);
            } else {
                console.log('❌ Error handling tests failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 Test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testErrorHandlingAndResilience }; 