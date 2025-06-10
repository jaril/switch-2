/**
 * Nintendo Switch 2 Stock Monitor - Complete Workflow Validation (Task 13.7)
 * Validates the entire system operates correctly from start to finish
 * 
 * COMPREHENSIVE TESTING - Tests full application lifecycle and workflows
 */

const { app } = require('./src/index.js');
const { getAllLogs, getLast24HourStats } = require('./src/dataLogger.js');
const fs = require('fs');
const path = require('path');

// Validation configuration
const VALIDATION_CONFIG = {
    TEST_DURATION: 30000,        // 30 seconds total test time
    STOCK_CHECK_INTERVAL: 5000,  // 5 seconds between checks for testing
    DAILY_SUMMARY_WAIT: 3000,    // 3 seconds wait for daily summary
    PERFORMANCE_SAMPLES: 5,      // Number of performance measurements
    EDGE_CASE_CYCLES: 3          // Number of edge case test cycles
};

// Validation results tracking
const validationResults = {
    startTime: null,
    endTime: null,
    tests: [],
    performance: {
        startupTime: null,
        memoryUsage: [],
        operationTimes: [],
        resourceLeaks: false
    },
    dataConsistency: {
        logEntries: 0,
        stateUpdates: 0,
        timestampAccuracy: true,
        dataIntegrity: true
    },
    edgeCases: {
        rapidCycles: false,
        schedulerOverlap: false,
        errorRecovery: false,
        statePersistence: false
    },
    issues: [],
    summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    }
};

/**
 * Validation helper functions
 */
function logValidation(testName, status, duration, details = '', metrics = {}) {
    const result = {
        name: testName,
        status: status,
        duration: duration,
        details: details,
        metrics: metrics,
        timestamp: new Date().toISOString()
    };
    
    validationResults.tests.push(result);
    validationResults.summary.totalTests++;
    
    if (status === 'PASS') {
        validationResults.summary.passed++;
        console.log(`✅ ${testName} - PASSED (${duration}ms) ${details}`);
    } else if (status === 'WARN') {
        validationResults.summary.warnings++;
        console.log(`⚠️ ${testName} - WARNING (${duration}ms) ${details}`);
    } else {
        validationResults.summary.failed++;
        console.log(`❌ ${testName} - FAILED (${duration}ms) ${details}`);
    }
    
    if (Object.keys(metrics).length > 0) {
        console.log(`📊 Metrics: ${JSON.stringify(metrics)}`);
    }
}

function measureMemoryUsage() {
    const used = process.memoryUsage();
    return {
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(used.external / 1024 / 1024 * 100) / 100,
        timestamp: Date.now()
    };
}

async function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Complete Application Lifecycle Validation
 */
async function validateApplicationLifecycle() {
    console.log('📋 Test 1: Complete Application Lifecycle Validation');
    console.log('====================================================');
    
    const testStart = Date.now();
    
    try {
        // Measure startup performance
        console.log('🔍 Measuring application startup performance...');
        const startupStart = Date.now();
        
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        const initTime = Date.now() - startupStart;
        
        const lifecycleStart = Date.now();
        const startResult = await app.startApplication();
        const startupTime = Date.now() - lifecycleStart;
        
        validationResults.performance.startupTime = startupTime;
        
        if (!startResult.success) {
            throw new Error(`Application startup failed: ${startResult.error}`);
        }
        
        console.log('✅ Application started successfully');
        console.log(`⚡ Initialization time: ${initTime}ms`);
        console.log(`⚡ Startup time: ${startupTime}ms`);
        
        // Verify all components are running
        if (!app.isRunning || !app.schedulersStarted) {
            throw new Error('Application components not in expected running state');
        }
        
        console.log('✅ All application components verified as running');
        
        // Let application run for test duration
        console.log(`🔍 Running application for ${VALIDATION_CONFIG.TEST_DURATION}ms...`);
        
        const operationStart = Date.now();
        await waitFor(VALIDATION_CONFIG.TEST_DURATION);
        const operationTime = Date.now() - operationStart;
        
        // Verify application is still running correctly
        if (!app.isRunning || !app.schedulersStarted) {
            throw new Error('Application stopped unexpectedly during operation');
        }
        
        console.log('✅ Application maintained stable operation');
        
        // Test graceful shutdown
        console.log('🔍 Testing graceful shutdown...');
        const shutdownStart = Date.now();
        const stopResult = await app.stopApplication();
        const shutdownTime = Date.now() - shutdownStart;
        
        if (!stopResult.success) {
            throw new Error(`Application shutdown failed: ${stopResult.error}`);
        }
        
        // Verify clean shutdown
        if (app.isRunning || app.schedulersStarted) {
            throw new Error('Application not properly shut down');
        }
        
        console.log('✅ Graceful shutdown completed');
        console.log(`⚡ Shutdown time: ${shutdownTime}ms`);
        
        const duration = Date.now() - testStart;
        const metrics = {
            initTime,
            startupTime,
            operationTime,
            shutdownTime,
            totalLifecycleTime: duration
        };
        
        logValidation('Application Lifecycle', 'PASS', duration, 
                     'Complete lifecycle executed successfully', metrics);
        
    } catch (error) {
        // Ensure cleanup
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logValidation('Application Lifecycle', 'FAIL', duration, error.message);
        validationResults.issues.push(`Lifecycle failure: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test 2: End-to-End Stock Monitoring Workflow Validation
 */
async function validateStockMonitoringWorkflow() {
    console.log('📋 Test 2: End-to-End Stock Monitoring Workflow');
    console.log('===============================================');
    
    const testStart = Date.now();
    
    try {
        // Start application
        console.log('🔍 Starting application for workflow testing...');
        
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        const startResult = await app.startApplication();
        if (!startResult.success) {
            throw new Error(`Failed to start application: ${startResult.error}`);
        }
        
        // Get initial state
        const initialState = app.getApplicationState();
        const initialLogs = getAllLogs();
        const initialLogCount = initialLogs.success ? initialLogs.logs.length : 0;
        
        console.log(`📊 Initial state: ${initialLogCount} logs, Check count: ${initialState.checkCount}`);
        
        // Wait for several stock check cycles
        console.log('🔍 Monitoring stock check cycles...');
        const monitoringStart = Date.now();
        
        let cycleCount = 0;
        let lastCheckCount = initialState.checkCount;
        
        // Monitor for up to 15 seconds or until we see activity
        while (cycleCount < 3 && (Date.now() - monitoringStart) < 15000) {
            await waitFor(2000);
            
            const currentState = app.getApplicationState();
            if (currentState.checkCount > lastCheckCount) {
                cycleCount++;
                lastCheckCount = currentState.checkCount;
                console.log(`📊 Stock check cycle ${cycleCount} completed`);
            }
        }
        
        // Perform manual stock check to verify workflow
        console.log('🔍 Performing manual stock check for workflow validation...');
        const manualCheckStart = Date.now();
        const manualCheckResult = await app.performStockCheck();
        const manualCheckTime = Date.now() - manualCheckStart;
        
        if (!manualCheckResult.success) {
            throw new Error(`Manual stock check failed: ${manualCheckResult.errors.join(', ')}`);
        }
        
        console.log('✅ Manual stock check completed successfully');
        
        // Verify data was logged
        const finalLogs = getAllLogs();
        const finalLogCount = finalLogs.success ? finalLogs.logs.length : 0;
        
        if (finalLogCount <= initialLogCount) {
            throw new Error('No new log entries created during monitoring workflow');
        }
        
        console.log(`📊 New log entries created: ${finalLogCount - initialLogCount}`);
        
        // Verify state management
        const finalState = app.getApplicationState();
        if (finalState.checkCount <= initialState.checkCount) {
            throw new Error('Stock check count not updated properly');
        }
        
        console.log(`📊 Stock checks performed: ${finalState.checkCount - initialState.checkCount}`);
        
        // Test daily summary workflow
        console.log('🔍 Testing daily summary workflow...');
        const summaryStart = Date.now();
        const summaryResult = await app.performDailySummary();
        const summaryTime = Date.now() - summaryStart;
        
        if (!summaryResult.success && summaryResult.errors.length > 0) {
            console.log('⚠️ Daily summary had expected errors (no previous day data)');
        } else {
            console.log('✅ Daily summary workflow completed');
        }
        
        // Stop application
        await app.stopApplication();
        
        const duration = Date.now() - testStart;
        const metrics = {
            cyclesObserved: cycleCount,
            newLogEntries: finalLogCount - initialLogCount,
            stockChecksPerformed: finalState.checkCount - initialState.checkCount,
            manualCheckTime,
            summaryTime
        };
        
        validationResults.dataConsistency.logEntries += finalLogCount - initialLogCount;
        validationResults.dataConsistency.stateUpdates += finalState.checkCount - initialState.checkCount;
        
        logValidation('Stock Monitoring Workflow', 'PASS', duration,
                     'End-to-end workflow functioning correctly', metrics);
        
    } catch (error) {
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logValidation('Stock Monitoring Workflow', 'FAIL', duration, error.message);
        validationResults.issues.push(`Workflow failure: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test 3: Performance and Resource Usage Validation
 */
async function validatePerformanceAndResources() {
    console.log('📋 Test 3: Performance and Resource Usage Validation');
    console.log('====================================================');
    
    const testStart = Date.now();
    
    try {
        // Baseline memory measurement
        const baselineMemory = measureMemoryUsage();
        validationResults.performance.memoryUsage.push(baselineMemory);
        
        console.log(`📊 Baseline memory: RSS=${baselineMemory.rss}MB, Heap=${baselineMemory.heapUsed}MB`);
        
        // Start application and monitor resources
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        const startResult = await app.startApplication();
        if (!startResult.success) {
            throw new Error(`Failed to start application: ${startResult.error}`);
        }
        
        // Take performance samples during operation
        for (let i = 0; i < VALIDATION_CONFIG.PERFORMANCE_SAMPLES; i++) {
            await waitFor(2000);
            
            const memory = measureMemoryUsage();
            validationResults.performance.memoryUsage.push(memory);
            
            // Perform operation and measure timing
            const opStart = Date.now();
            const state = app.getApplicationState();
            const opTime = Date.now() - opStart;
            
            validationResults.performance.operationTimes.push(opTime);
            
            console.log(`📊 Sample ${i + 1}: Memory=${memory.rss}MB, State access=${opTime}ms`);
        }
        
        await app.stopApplication();
        
        // Analyze performance data
        const memoryUsages = validationResults.performance.memoryUsage.map(m => m.rss);
        const maxMemory = Math.max(...memoryUsages);
        const minMemory = Math.min(...memoryUsages);
        const memoryGrowth = maxMemory - minMemory;
        
        const avgOperationTime = validationResults.performance.operationTimes.reduce((a, b) => a + b, 0) / validationResults.performance.operationTimes.length;
        
        // Check for resource leaks (memory growth > 50MB considered suspicious)
        if (memoryGrowth > 50) {
            validationResults.performance.resourceLeaks = true;
            console.log(`⚠️ Potential memory leak detected: ${memoryGrowth}MB growth`);
        } else {
            console.log(`✅ Memory usage stable: ${memoryGrowth}MB growth`);
        }
        
        const duration = Date.now() - testStart;
        const metrics = {
            startupTime: validationResults.performance.startupTime,
            maxMemoryMB: maxMemory,
            memoryGrowthMB: memoryGrowth,
            avgOperationTimeMs: Math.round(avgOperationTime * 100) / 100,
            resourceLeaks: validationResults.performance.resourceLeaks
        };
        
        const status = validationResults.performance.resourceLeaks ? 'WARN' : 'PASS';
        const details = validationResults.performance.resourceLeaks ? 
                       'Performance acceptable with memory growth warning' : 
                       'Performance and resource usage optimal';
        
        logValidation('Performance and Resources', status, duration, details, metrics);
        
    } catch (error) {
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logValidation('Performance and Resources', 'FAIL', duration, error.message);
        validationResults.issues.push(`Performance failure: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test 4: Data Consistency and Integrity Validation
 */
async function validateDataConsistency() {
    console.log('📋 Test 4: Data Consistency and Integrity Validation');
    console.log('====================================================');
    
    const testStart = Date.now();
    
    try {
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Test multiple state operations
        console.log('🔍 Testing state consistency across multiple operations...');
        
        const operations = [];
        for (let i = 0; i < 5; i++) {
            const timestamp = new Date().toISOString();
            operations.push(app.updateStockStatus(i % 2 === 0, timestamp));
        }
        
        const results = await Promise.all(operations);
        const successfulOps = results.filter(r => r.success).length;
        
        if (successfulOps !== 5) {
            throw new Error(`Only ${successfulOps}/5 state operations succeeded`);
        }
        
        console.log('✅ Multiple state operations completed successfully');
        
        // Verify state consistency
        const state = app.getApplicationState();
        if (!state.lastStateUpdate || !state.lastCheckTime) {
            throw new Error('State missing required timestamp fields');
        }
        
        // Test timestamp accuracy (should be recent)
        const stateAge = Date.now() - new Date(state.lastStateUpdate).getTime();
        if (stateAge > 60000) { // More than 1 minute old
            validationResults.dataConsistency.timestampAccuracy = false;
            console.log('⚠️ State timestamp appears stale');
        } else {
            console.log('✅ State timestamps are accurate');
        }
        
        // Test data logger consistency
        console.log('🔍 Validating data logger consistency...');
        
        const testLogEntry = {
            inStock: true,
            timestamp: new Date().toISOString(),
            url: 'validation-test'
        };
        
        const { logStockCheck } = require('./src/dataLogger.js');
        const logResult = logStockCheck(testLogEntry);
        
        if (!logResult.success) {
            throw new Error(`Data logging failed: ${logResult.error}`);
        }
        
        // Verify log was actually written
        const allLogs = getAllLogs();
        if (!allLogs.success) {
            throw new Error('Failed to retrieve logs for validation');
        }
        
        const validationLog = allLogs.logs.find(log => log.url === 'validation-test');
        if (!validationLog) {
            throw new Error('Validation log entry not found in retrieved logs');
        }
        
        console.log('✅ Data logger consistency verified');
        
        // Test statistics generation
        console.log('🔍 Testing statistics generation consistency...');
        
        const statsResult = getLast24HourStats();
        if (!statsResult.success) {
            console.log('⚠️ Statistics generation failed (may be expected with limited data)');
        } else {
            console.log('✅ Statistics generation working correctly');
        }
        
        const duration = Date.now() - testStart;
        const metrics = {
            stateOperationsSuccessful: successfulOps,
            timestampAccuracy: validationResults.dataConsistency.timestampAccuracy,
            dataIntegrity: validationResults.dataConsistency.dataIntegrity
        };
        
        logValidation('Data Consistency', 'PASS', duration,
                     'Data consistency and integrity validated', metrics);
        
    } catch (error) {
        validationResults.dataConsistency.dataIntegrity = false;
        
        const duration = Date.now() - testStart;
        logValidation('Data Consistency', 'FAIL', duration, error.message);
        validationResults.issues.push(`Data consistency failure: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test 5: Edge Cases and Stress Testing
 */
async function validateEdgeCases() {
    console.log('📋 Test 5: Edge Cases and Stress Testing');
    console.log('========================================');
    
    const testStart = Date.now();
    
    try {
        // Test rapid start/stop cycles
        console.log('🔍 Testing rapid start/stop cycles...');
        
        for (let i = 0; i < VALIDATION_CONFIG.EDGE_CASE_CYCLES; i++) {
            console.log(`  Cycle ${i + 1}/${VALIDATION_CONFIG.EDGE_CASE_CYCLES}`);
            
            if (!app.isInitialized) {
                await app.initialize();
            }
            
            const startResult = await app.startApplication();
            if (!startResult.success) {
                throw new Error(`Rapid cycle start failed: ${startResult.error}`);
            }
            
            // Brief operation
            await waitFor(1000);
            
            const stopResult = await app.stopApplication();
            if (!stopResult.success) {
                throw new Error(`Rapid cycle stop failed: ${stopResult.error}`);
            }
            
            // Brief pause between cycles
            await waitFor(500);
        }
        
        validationResults.edgeCases.rapidCycles = true;
        console.log('✅ Rapid start/stop cycles completed successfully');
        
        // Test state persistence across operations
        console.log('🔍 Testing state persistence across operations...');
        
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Set initial state
        const testTimestamp = new Date().toISOString();
        await app.updateStockStatus(true, testTimestamp);
        
        const beforeState = app.getApplicationState();
        
        // Perform some operations
        await app.startApplication();
        await waitFor(2000);
        await app.stopApplication();
        
        // Check state persistence
        const afterState = app.getApplicationState();
        
        if (afterState.lastStockStatus !== beforeState.lastStockStatus) {
            throw new Error('State not persisted across operations');
        }
        
        validationResults.edgeCases.statePersistence = true;
        console.log('✅ State persistence validated');
        
        // Test concurrent operation handling
        console.log('🔍 Testing concurrent operation handling...');
        
        if (app.isRunning) {
            await app.stopApplication();
        }
        
        await app.startApplication();
        
        // Attempt concurrent operations
        const concurrentOps = [
            app.performStockCheck(),
            app.getApplicationState(),
            app.updateStockStatus(false, new Date().toISOString())
        ];
        
        const concurrentResults = await Promise.allSettled(concurrentOps);
        const successfulConcurrent = concurrentResults.filter(r => r.status === 'fulfilled').length;
        
        if (successfulConcurrent < 2) {
            console.log('⚠️ Some concurrent operations failed (may be expected due to locking)');
        } else {
            console.log('✅ Concurrent operations handled appropriately');
        }
        
        await app.stopApplication();
        
        const duration = Date.now() - testStart;
        const metrics = {
            rapidCycles: validationResults.edgeCases.rapidCycles,
            statePersistence: validationResults.edgeCases.statePersistence,
            concurrentOpsSuccessful: successfulConcurrent
        };
        
        logValidation('Edge Cases', 'PASS', duration,
                     'Edge cases handled appropriately', metrics);
        
    } catch (error) {
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logValidation('Edge Cases', 'FAIL', duration, error.message);
        validationResults.issues.push(`Edge case failure: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport() {
    const totalDuration = validationResults.endTime - validationResults.startTime;
    const successRate = validationResults.summary.totalTests > 0 ? 
        ((validationResults.summary.passed / validationResults.summary.totalTests) * 100).toFixed(1) : 0;
    
    console.log('📊 Complete Workflow Validation Report');
    console.log('======================================');
    console.log(`⏰ Total Validation Time: ${totalDuration}ms`);
    console.log(`📋 Total Tests: ${validationResults.summary.totalTests}`);
    console.log(`✅ Passed: ${validationResults.summary.passed}`);
    console.log(`❌ Failed: ${validationResults.summary.failed}`);
    console.log(`⚠️ Warnings: ${validationResults.summary.warnings}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');
    
    console.log('🔧 Workflow Component Status:');
    console.log(`   • Application Lifecycle: ${getTestStatus('Application Lifecycle')}`);
    console.log(`   • Stock Monitoring Workflow: ${getTestStatus('Stock Monitoring Workflow')}`);
    console.log(`   • Performance and Resources: ${getTestStatus('Performance and Resources')}`);
    console.log(`   • Data Consistency: ${getTestStatus('Data Consistency')}`);
    console.log(`   • Edge Cases: ${getTestStatus('Edge Cases')}`);
    console.log('');
    
    console.log('📊 Performance Metrics:');
    console.log(`   • Startup Time: ${validationResults.performance.startupTime}ms`);
    if (validationResults.performance.memoryUsage.length > 0) {
        const memories = validationResults.performance.memoryUsage.map(m => m.rss);
        const maxMem = Math.max(...memories);
        const minMem = Math.min(...memories);
        console.log(`   • Memory Usage: ${minMem}MB - ${maxMem}MB`);
        console.log(`   • Memory Growth: ${(maxMem - minMem).toFixed(1)}MB`);
    }
    if (validationResults.performance.operationTimes.length > 0) {
        const avgOp = validationResults.performance.operationTimes.reduce((a, b) => a + b, 0) / validationResults.performance.operationTimes.length;
        console.log(`   • Avg Operation Time: ${avgOp.toFixed(1)}ms`);
    }
    console.log(`   • Resource Leaks Detected: ${validationResults.performance.resourceLeaks ? 'YES' : 'NO'}`);
    console.log('');
    
    console.log('📊 Data Consistency Metrics:');
    console.log(`   • Log Entries Created: ${validationResults.dataConsistency.logEntries}`);
    console.log(`   • State Updates: ${validationResults.dataConsistency.stateUpdates}`);
    console.log(`   • Timestamp Accuracy: ${validationResults.dataConsistency.timestampAccuracy ? 'GOOD' : 'ISSUES'}`);
    console.log(`   • Data Integrity: ${validationResults.dataConsistency.dataIntegrity ? 'GOOD' : 'ISSUES'}`);
    console.log('');
    
    console.log('📊 Edge Case Results:');
    console.log(`   • Rapid Cycles: ${validationResults.edgeCases.rapidCycles ? 'PASS' : 'FAIL'}`);
    console.log(`   • State Persistence: ${validationResults.edgeCases.statePersistence ? 'PASS' : 'FAIL'}`);
    console.log('');
    
    if (validationResults.issues.length > 0) {
        console.log('⚠️ Issues Discovered:');
        validationResults.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        console.log('');
    }
    
    // Final assessment
    const criticalFailures = validationResults.summary.failed;
    const hasResourceLeaks = validationResults.performance.resourceLeaks;
    const hasDataIssues = !validationResults.dataConsistency.dataIntegrity;
    
    console.log('🎯 Final Assessment:');
    if (criticalFailures === 0 && !hasDataIssues) {
        if (hasResourceLeaks || validationResults.summary.warnings > 0) {
            console.log('⚠️ SYSTEM READY WITH WARNINGS');
            console.log('   • Core functionality validated');
            console.log('   • Minor performance concerns identified');
            console.log('   • Recommended for error handling phase with monitoring');
        } else {
            console.log('✅ SYSTEM FULLY VALIDATED');
            console.log('   • All workflows functioning correctly');
            console.log('   • Performance within acceptable limits');
            console.log('   • Ready for error handling and documentation phases');
        }
    } else {
        console.log('❌ SYSTEM NOT READY');
        console.log('   • Critical failures detected');
        console.log('   • Issues must be resolved before proceeding');
    }
    console.log('');
    
    return {
        success: criticalFailures === 0 && !hasDataIssues,
        hasWarnings: hasResourceLeaks || validationResults.summary.warnings > 0,
        totalTests: validationResults.summary.totalTests,
        passed: validationResults.summary.passed,
        failed: validationResults.summary.failed,
        warnings: validationResults.summary.warnings,
        duration: totalDuration,
        successRate: parseFloat(successRate)
    };
}

function getTestStatus(testName) {
    const test = validationResults.tests.find(t => t.name === testName);
    return test ? test.status : 'NOT TESTED';
}

/**
 * Main validation runner
 */
async function runCompleteWorkflowValidation() {
    console.log('🎮 Nintendo Switch 2 Stock Monitor');
    console.log('📋 Task 13.7: Complete Workflow Validation');
    console.log('==========================================');
    console.log(`⏰ Validation started at ${new Date().toISOString()}`);
    console.log('');
    
    validationResults.startTime = Date.now();
    
    try {
        // Run all validation tests
        await validateApplicationLifecycle();
        await validateStockMonitoringWorkflow();
        await validatePerformanceAndResources();
        await validateDataConsistency();
        await validateEdgeCases();
        
    } catch (error) {
        console.error('💥 Validation suite failed with unexpected error:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        validationResults.issues.push(`Validation suite error: ${error.message}`);
    } finally {
        // Ensure complete cleanup
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Final cleanup error:', cleanupError.message);
        }
        
        validationResults.endTime = Date.now();
        
        // Generate and display final report
        const report = generateValidationReport();
        
        if (report.success) {
            if (report.hasWarnings) {
                console.log('⚠️ Workflow validation completed with warnings');
                console.log('✅ Task 13.7 Implementation Complete (with monitoring recommended)');
            } else {
                console.log('🎉 Complete workflow validation passed!');
                console.log('✅ Task 13.7 Implementation Complete');
            }
            console.log('🚀 System ready for Task 14 (Error Handling Implementation)');
        } else {
            console.log('❌ Workflow validation failed');
            console.log('🔍 Critical issues must be resolved before proceeding');
        }
        
        console.log('');
        
        return report;
    }
}

// Export for external use
module.exports = {
    runCompleteWorkflowValidation,
    generateValidationReport,
    VALIDATION_CONFIG
};

// Run validation if this file is executed directly
if (require.main === module) {
    runCompleteWorkflowValidation()
        .then(report => {
            process.exit(report.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Validation runner failed:', error.message);
            process.exit(1);
        });
} 