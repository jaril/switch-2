/**
 * Nintendo Switch 2 Stock Monitor - Integration Tests (Task 13.6)
 * Tests module interactions and verifies components work together correctly
 * 
 * DO NOT RUN AGAINST PRODUCTION - Uses mocks and test data only
 */

const { app } = require('./src/index.js');
const config = require('./src/config.js');

// Test configuration with shorter intervals for testing
const TEST_CONFIG = {
    MOCK_STOCK_RESPONSES: {
        IN_STOCK: true,
        OUT_OF_STOCK: false,
        ERROR: new Error('Mock stock check error')
    },
    MOCK_EMAIL_RESPONSES: {
        SUCCESS: { success: true, messageId: 'test-123' },
        FAILURE: { success: false, error: 'Mock email error' }
    },
    TEST_INTERVALS: {
        STOCK_CHECK: 2000,    // 2 seconds for testing
        DAILY_SUMMARY: 3000   // 3 seconds for testing
    }
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    startTime: null,
    endTime: null
};

/**
 * Mock the stock checker for predictable testing
 */
let mockStockCheckResponse = TEST_CONFIG.MOCK_STOCK_RESPONSES.OUT_OF_STOCK;
let mockStockCheckError = null;

const originalCheckStock = require('./src/stockChecker.js').checkStock;
const mockCheckStock = async (url) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (mockStockCheckError) {
        throw mockStockCheckError;
    }
    
    return {
        success: true,
        inStock: mockStockCheckResponse,
        timestamp: new Date().toISOString(),
        url: url,
        mock: true // Identify as mock data
    };
};

/**
 * Mock the email service for testing
 */
let mockEmailResponse = TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS;
let mockEmailError = null;

const originalSendStockAlert = require('./src/emailService.js').sendStockAlert;
const originalSendDailySummary = require('./src/emailService.js').sendDailySummary;

const mockSendStockAlert = async (stockData, productName) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (mockEmailError) {
        throw mockEmailError;
    }
    
    return {
        ...mockEmailResponse,
        mock: true,
        recipient: config.TO_EMAIL,
        subject: `Stock Alert: ${productName}`,
        timestamp: new Date().toISOString()
    };
};

const mockSendDailySummary = async (stats, date, productName) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (mockEmailError) {
        throw mockEmailError;
    }
    
    return {
        ...mockEmailResponse,
        mock: true,
        recipient: config.TO_EMAIL,
        subject: `Daily Summary: ${productName}`,
        date: date,
        timestamp: new Date().toISOString()
    };
};

/**
 * Test helper functions
 */
function logTest(testName, status, duration, details = '') {
    const result = {
        name: testName,
        status: status,
        duration: duration,
        details: details,
        timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✅ ${testName} - PASSED (${duration}ms) ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName} - FAILED (${duration}ms) ${details}`);
    }
}

function setMockResponses(stockResponse, emailResponse, stockError = null, emailError = null) {
    mockStockCheckResponse = stockResponse;
    mockEmailResponse = emailResponse;
    mockStockCheckError = stockError;
    mockEmailError = emailError;
}

async function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Stock Check Integration
 * Verify stock check → log → email flow works correctly
 */
async function testStockCheckIntegration() {
    console.log('📋 Test 1: Stock Check Integration');
    console.log('=================================');
    
    const testStart = Date.now();
    
    try {
        // Initialize application for testing
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Test 1a: Out of stock check (no email expected)
        console.log('🔍 Testing out-of-stock scenario...');
        setMockResponses(false, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS);
        
        const outOfStockResult = await app.performStockCheck();
        
        if (outOfStockResult.success && !outOfStockResult.emailSent) {
            console.log('✅ Out-of-stock check logged correctly, no email sent');
        } else {
            throw new Error('Out-of-stock check failed or sent unexpected email');
        }
        
        // Test 1b: Stock becomes available (email expected)
        console.log('🔍 Testing stock-available scenario...');
        setMockResponses(true, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS);
        
        const inStockResult = await app.performStockCheck();
        
        if (inStockResult.success && inStockResult.stockCheck.inStock && inStockResult.emailSent) {
            console.log('✅ In-stock check logged and email sent correctly');
        } else {
            throw new Error('In-stock check failed or email not sent');
        }
        
        // Test 1c: Multiple consecutive in-stock checks (no duplicate emails)
        console.log('🔍 Testing duplicate prevention...');
        
        const duplicateResult = await app.performStockCheck();
        
        if (duplicateResult.success && !duplicateResult.emailSent && duplicateResult.wasBlocked) {
            console.log('✅ Duplicate email correctly prevented');
        } else {
            throw new Error('Duplicate email prevention failed');
        }
        
        // Test 1d: Back to out of stock
        console.log('🔍 Testing stock-unavailable transition...');
        setMockResponses(false, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS);
        
        const backToOutResult = await app.performStockCheck();
        
        if (backToOutResult.success && !backToOutResult.emailSent) {
            console.log('✅ Out-of-stock transition handled correctly');
        } else {
            throw new Error('Out-of-stock transition failed');
        }
        
        const duration = Date.now() - testStart;
        logTest('Stock Check Integration', 'PASS', duration, 'All stock check flows working correctly');
        
    } catch (error) {
        const duration = Date.now() - testStart;
        logTest('Stock Check Integration', 'FAIL', duration, error.message);
        console.error('🔍 Error details:', error.stack);
    }
    
    console.log('');
}

/**
 * Test 2: Scheduler Integration
 * Verify schedulers start/stop without conflicts
 */
async function testSchedulerIntegration() {
    console.log('📋 Test 2: Scheduler Integration');
    console.log('===============================');
    
    const testStart = Date.now();
    
    try {
        // Ensure clean state
        if (app.isRunning) {
            await app.stopApplication();
        }
        
        console.log('🔍 Testing scheduler startup...');
        
        // Start application with schedulers
        const startResult = await app.startApplication();
        
        if (!startResult.success) {
            throw new Error(`Failed to start application: ${startResult.error}`);
        }
        
        console.log('✅ Both schedulers started successfully');
        
        // Verify schedulers are running
        if (!app.schedulersStarted || !app.isRunning) {
            throw new Error('Schedulers not in running state');
        }
        
        console.log('✅ Scheduler state verified');
        
        // Wait briefly to ensure no immediate conflicts
        console.log('🔍 Testing scheduler operation for 3 seconds...');
        await waitFor(3000);
        
        // Check application state during operation
        const runningState = app.getApplicationState();
        
        if (runningState.lastStateUpdate) {
            console.log('✅ Schedulers operating without conflicts');
        }
        
        // Test graceful shutdown
        console.log('🔍 Testing scheduler shutdown...');
        
        const stopResult = await app.stopApplication();
        
        if (!stopResult.success) {
            throw new Error(`Failed to stop application: ${stopResult.error}`);
        }
        
        if (!app.schedulersStarted && !app.isRunning) {
            console.log('✅ Schedulers stopped cleanly');
        } else {
            throw new Error('Schedulers not properly stopped');
        }
        
        // Test restart capability
        console.log('🔍 Testing scheduler restart...');
        
        const restartResult = await app.startApplication();
        
        if (restartResult.success && app.schedulersStarted) {
            console.log('✅ Scheduler restart successful');
        } else {
            throw new Error('Scheduler restart failed');
        }
        
        // Final cleanup
        await app.stopApplication();
        
        const duration = Date.now() - testStart;
        logTest('Scheduler Integration', 'PASS', duration, 'Schedulers start/stop without conflicts');
        
    } catch (error) {
        // Ensure cleanup on error
        try {
            await app.stopApplication();
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logTest('Scheduler Integration', 'FAIL', duration, error.message);
        console.error('🔍 Error details:', error.stack);
    }
    
    console.log('');
}

/**
 * Test 3: State Management
 * Verify state sharing works correctly across modules
 */
async function testStateManagement() {
    console.log('📋 Test 3: State Management');
    console.log('===========================');
    
    const testStart = Date.now();
    
    try {
        // Ensure application is initialized
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        console.log('🔍 Testing state initialization...');
        
        const initialState = app.getApplicationState();
        
        if (initialState && typeof initialState === 'object') {
            console.log('✅ State object accessible');
        } else {
            throw new Error('State object not accessible');
        }
        
        console.log('🔍 Testing state updates...');
        
        // Test stock status update
        const testTimestamp = new Date().toISOString();
        const updateResult = await app.updateStockStatus(true, testTimestamp);
        
        if (!updateResult.success) {
            throw new Error(`State update failed: ${updateResult.error}`);
        }
        
        const updatedState = app.getApplicationState();
        
        if (updatedState.lastStockStatus === true && updatedState.lastCheckTime === testTimestamp) {
            console.log('✅ State updates working correctly');
        } else {
            throw new Error('State not updated correctly');
        }
        
        console.log('🔍 Testing state locking...');
        
        // Test concurrent access protection
        const lockTest1 = await app.acquireStateLock();
        const lockTest2 = await app.acquireStateLock(); // Should fail
        
        if (lockTest1 && !lockTest2) {
            console.log('✅ State locking prevents concurrent access');
            app.releaseStateLock();
        } else {
            throw new Error('State locking not working correctly');
        }
        
        console.log('🔍 Testing state consistency...');
        
        // Perform multiple state operations
        const operations = [];
        for (let i = 0; i < 5; i++) {
            operations.push(app.updateStockStatus(i % 2 === 0, new Date().toISOString()));
        }
        
        const results = await Promise.all(operations);
        const successCount = results.filter(r => r.success).length;
        
        if (successCount === 5) {
            console.log('✅ Multiple state operations completed successfully');
        } else {
            throw new Error(`Only ${successCount}/5 state operations succeeded`);
        }
        
        const finalState = app.getApplicationState();
        
        if (finalState.checkCount >= 5) {
            console.log('✅ State consistency maintained across operations');
        } else {
            throw new Error('State consistency violated');
        }
        
        const duration = Date.now() - testStart;
        logTest('State Management', 'PASS', duration, 'State sharing works correctly');
        
    } catch (error) {
        const duration = Date.now() - testStart;
        logTest('State Management', 'FAIL', duration, error.message);
        console.error('🔍 Error details:', error.stack);
    }
    
    console.log('');
}

/**
 * Test 4: Concurrent Operations
 * Verify no race conditions occur during concurrent operations
 */
async function testConcurrentOperations() {
    console.log('📋 Test 4: Concurrent Operations');
    console.log('===============================');
    
    const testStart = Date.now();
    
    try {
        // Ensure clean state
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        console.log('🔍 Testing concurrent stock checks...');
        
        // Set up mock responses
        setMockResponses(true, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS);
        
        // Start multiple stock checks simultaneously
        const concurrentChecks = [];
        for (let i = 0; i < 3; i++) {
            concurrentChecks.push(app.performStockCheck());
        }
        
        const checkResults = await Promise.all(concurrentChecks);
        
        // Verify only one email was sent (due to race condition protection)
        const emailsSent = checkResults.filter(r => r.emailSent).length;
        const blockedChecks = checkResults.filter(r => r.wasBlocked).length;
        
        if (emailsSent === 1 && blockedChecks >= 1) {
            console.log('✅ Race condition protection working - only 1 email sent');
        } else {
            throw new Error(`Race condition detected: ${emailsSent} emails sent, ${blockedChecks} blocked`);
        }
        
        console.log('🔍 Testing concurrent state operations...');
        
        // Test concurrent state updates
        const stateOperations = [];
        for (let i = 0; i < 10; i++) {
            stateOperations.push(app.setCheckInProgress(i % 2 === 0));
        }
        
        const stateResults = await Promise.all(stateOperations);
        const successfulStateOps = stateResults.filter(r => r.success).length;
        
        if (successfulStateOps === 10) {
            console.log('✅ Concurrent state operations handled correctly');
        } else {
            throw new Error(`State operation failures: ${10 - successfulStateOps}/10 failed`);
        }
        
        console.log('🔍 Testing scheduler + manual operation concurrency...');
        
        // Start application with schedulers
        await app.startApplication();
        
        // Perform manual operation while schedulers are running
        const manualCheck = await app.performStockCheck();
        
        if (manualCheck.success) {
            console.log('✅ Manual operations work alongside schedulers');
        } else {
            throw new Error('Manual operation failed while schedulers running');
        }
        
        // Stop application
        await app.stopApplication();
        
        const duration = Date.now() - testStart;
        logTest('Concurrent Operations', 'PASS', duration, 'No race conditions detected');
        
    } catch (error) {
        // Ensure cleanup
        try {
            await app.stopApplication();
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError.message);
        }
        
        const duration = Date.now() - testStart;
        logTest('Concurrent Operations', 'FAIL', duration, error.message);
        console.error('🔍 Error details:', error.stack);
    }
    
    console.log('');
}

/**
 * Test 5: Error Handling
 * Verify errors don't crash other modules and application continues
 */
async function testErrorHandling() {
    console.log('📋 Test 5: Error Handling');
    console.log('=========================');
    
    const testStart = Date.now();
    
    try {
        // Ensure application is ready
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        console.log('🔍 Testing stock checker error handling...');
        
        // Test stock checker failure
        setMockResponses(false, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS, 
                        new Error('Mock stock check failure'));
        
        const stockErrorResult = await app.performStockCheck();
        
        if (!stockErrorResult.success && stockErrorResult.errors.length > 0) {
            console.log('✅ Stock checker errors handled gracefully');
        } else {
            throw new Error('Stock checker error not handled properly');
        }
        
        // Verify application still functions after stock error
        setMockResponses(true, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS, null);
        
        const recoveryResult = await app.performStockCheck();
        
        if (recoveryResult.success) {
            console.log('✅ Application recovered after stock checker error');
        } else {
            throw new Error('Application did not recover after stock error');
        }
        
        console.log('🔍 Testing email service error handling...');
        
        // Test email service failure
        setMockResponses(true, TEST_CONFIG.MOCK_EMAIL_RESPONSES.FAILURE, 
                        null, new Error('Mock email failure'));
        
        const emailErrorResult = await app.performStockCheck();
        
        if (emailErrorResult.success && emailErrorResult.stockCheck.success && !emailErrorResult.emailSent) {
            console.log('✅ Email service errors handled gracefully');
        } else {
            throw new Error('Email service error not handled properly');
        }
        
        console.log('🔍 Testing daily summary error handling...');
        
        // Test daily summary with email error
        const summaryErrorResult = await app.performDailySummary();
        
        if (!summaryErrorResult.success && summaryErrorResult.errors.length > 0) {
            console.log('✅ Daily summary errors handled gracefully');
        } else {
            throw new Error('Daily summary error not handled properly');
        }
        
        console.log('🔍 Testing application stability after errors...');
        
        // Reset to working state and verify everything still works
        setMockResponses(false, TEST_CONFIG.MOCK_EMAIL_RESPONSES.SUCCESS, null, null);
        
        const stabilityResult = await app.performStockCheck();
        
        if (stabilityResult.success) {
            console.log('✅ Application remains stable after multiple errors');
        } else {
            throw new Error('Application instability detected after errors');
        }
        
        console.log('🔍 Testing runtime error handling...');
        
        // Test runtime error handling (non-crash)
        try {
            app.handleRuntimeError(new Error('Test runtime error'), 'integration-test');
            console.log('✅ Runtime error handler working correctly');
        } catch (handlerError) {
            throw new Error('Runtime error handler failed');
        }
        
        const duration = Date.now() - testStart;
        logTest('Error Handling', 'PASS', duration, 'All error scenarios handled gracefully');
        
    } catch (error) {
        const duration = Date.now() - testStart;
        logTest('Error Handling', 'FAIL', duration, error.message);
        console.error('🔍 Error details:', error.stack);
    }
    
    console.log('');
}

/**
 * Apply mocks for testing
 */
function applyMocks() {
    console.log('🔧 Applying test mocks...');
    
    // Replace stock checker with mock
    require('./src/stockChecker.js').checkStock = mockCheckStock;
    
    // Replace email service with mocks
    require('./src/emailService.js').sendStockAlert = mockSendStockAlert;
    require('./src/emailService.js').sendDailySummary = mockSendDailySummary;
    
    console.log('✅ Test mocks applied');
}

/**
 * Restore original functions
 */
function restoreMocks() {
    console.log('🔧 Restoring original functions...');
    
    // Restore original functions
    require('./src/stockChecker.js').checkStock = originalCheckStock;
    require('./src/emailService.js').sendStockAlert = originalSendStockAlert;
    require('./src/emailService.js').sendDailySummary = originalSendDailySummary;
    
    console.log('✅ Original functions restored');
}

/**
 * Generate test report
 */
function generateTestReport() {
    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
    const totalDuration = testResults.endTime - testResults.startTime;
    
    console.log('📊 Integration Test Report');
    console.log('=========================');
    console.log(`⏰ Test Duration: ${totalDuration}ms`);
    console.log(`📋 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');
    
    if (testResults.failed > 0) {
        console.log('❌ Failed Tests:');
        testResults.tests
            .filter(t => t.status === 'FAIL')
            .forEach(test => {
                console.log(`   • ${test.name}: ${test.details}`);
            });
        console.log('');
    }
    
    console.log('🔧 Module Integration Status:');
    console.log(`   • Stock Checker ↔ Data Logger: ${testResults.tests.find(t => t.name === 'Stock Check Integration')?.status || 'NOT TESTED'}`);
    console.log(`   • Email Service ↔ Stock Checker: ${testResults.tests.find(t => t.name === 'Stock Check Integration')?.status || 'NOT TESTED'}`);
    console.log(`   • Scheduler ↔ Core Functions: ${testResults.tests.find(t => t.name === 'Scheduler Integration')?.status || 'NOT TESTED'}`);
    console.log(`   • Cross-Module State Sharing: ${testResults.tests.find(t => t.name === 'State Management')?.status || 'NOT TESTED'}`);
    console.log(`   • Concurrent Operation Safety: ${testResults.tests.find(t => t.name === 'Concurrent Operations')?.status || 'NOT TESTED'}`);
    console.log(`   • Error Isolation: ${testResults.tests.find(t => t.name === 'Error Handling')?.status || 'NOT TESTED'}`);
    console.log('');
    
    return {
        success: testResults.failed === 0,
        totalTests,
        passed: testResults.passed,
        failed: testResults.failed,
        duration: totalDuration,
        successRate: parseFloat(successRate)
    };
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
    console.log('🎮 Nintendo Switch 2 Stock Monitor');
    console.log('📋 Task 13.6: Module Integration Tests');
    console.log('======================================');
    console.log(`⏰ Test suite started at ${new Date().toISOString()}`);
    console.log('');
    
    testResults.startTime = Date.now();
    
    try {
        // Apply mocks before testing
        applyMocks();
        
        // Run all integration tests
        await testStockCheckIntegration();
        await testSchedulerIntegration();
        await testStateManagement();
        await testConcurrentOperations();
        await testErrorHandling();
        
    } catch (error) {
        console.error('💥 Test suite failed with unexpected error:', error.message);
        console.error('🔍 Stack trace:', error.stack);
    } finally {
        // Always restore mocks and cleanup
        restoreMocks();
        
        // Ensure application cleanup
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.error('❌ Final cleanup error:', cleanupError.message);
        }
        
        testResults.endTime = Date.now();
        
        // Generate and display report
        const report = generateTestReport();
        
        if (report.success) {
            console.log('🎉 All integration tests passed!');
            console.log('✅ Task 13.6 Implementation Complete');
            console.log('🚀 Ready for Task 13.7 (End-to-End Testing)');
        } else {
            console.log('❌ Some integration tests failed');
            console.log('🔍 Review failed tests above for details');
        }
        
        console.log('');
        
        return report;
    }
}

// Export for external use
module.exports = {
    runIntegrationTests,
    testStockCheckIntegration,
    testSchedulerIntegration,
    testStateManagement,
    testConcurrentOperations,
    testErrorHandling,
    TEST_CONFIG
};

// Run tests if this file is executed directly
if (require.main === module) {
    runIntegrationTests()
        .then(report => {
            process.exit(report.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test runner failed:', error.message);
            process.exit(1);
        });
} 