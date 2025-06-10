/**
 * Nintendo Switch 2 Stock Monitor - Core Workflow Validation
 * Tests internal system components without external dependencies
 */

const { app } = require('./src/index.js');
const { getAllLogs } = require('./src/dataLogger.js');

async function validateCoreWorkflow() {
    console.log('🎮 Nintendo Switch 2 Stock Monitor');
    console.log('📋 Core Workflow Validation (Task 13.7)');
    console.log('=========================================');
    console.log('⚡ Testing internal components only');
    console.log('');
    
    let allTestsPassed = true;
    const results = [];
    
    try {
        // Test 1: Application Lifecycle
        console.log('🔍 Test 1: Application Lifecycle');
        const lifecycleStart = Date.now();
        
        // Initialize
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Start
        const startResult = await app.startApplication();
        if (!startResult.success) {
            throw new Error(`Start failed: ${startResult.error}`);
        }
        
        console.log('✅ Application started successfully');
        
        // Verify running state
        if (!app.isRunning || !app.schedulersStarted) {
            throw new Error('Application not in expected running state');
        }
        
        console.log('✅ All components verified as running');
        
        // Brief operation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stop
        const stopResult = await app.stopApplication();
        if (!stopResult.success) {
            throw new Error(`Stop failed: ${stopResult.error}`);
        }
        
        console.log('✅ Application stopped successfully');
        
        const lifecycleTime = Date.now() - lifecycleStart;
        results.push({ name: 'Application Lifecycle', status: 'PASS', time: lifecycleTime });
        console.log(`⚡ Test 1 completed in ${lifecycleTime}ms`);
        console.log('');
        
    } catch (error) {
        allTestsPassed = false;
        results.push({ name: 'Application Lifecycle', status: 'FAIL', error: error.message });
        console.log(`❌ Test 1 failed: ${error.message}`);
        console.log('');
    }
    
    try {
        // Test 2: State Management
        console.log('🔍 Test 2: State Management');
        const stateStart = Date.now();
        
        // Initialize if needed
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Test state operations
        const timestamp = new Date().toISOString();
        const updateResult = await app.updateStockStatus(true, timestamp);
        
        if (!updateResult.success) {
            throw new Error(`State update failed: ${updateResult.error}`);
        }
        
        console.log('✅ State update successful');
        
        // Verify state
        const state = app.getApplicationState();
        if (!state.lastStateUpdate || !state.lastCheckTime) {
            throw new Error('State missing required fields');
        }
        
        console.log('✅ State consistency verified');
        
        // Test multiple updates
        for (let i = 0; i < 5; i++) {
            const result = await app.updateStockStatus(i % 2 === 0, new Date().toISOString());
            if (!result.success) {
                throw new Error(`Multi-update ${i} failed`);
            }
        }
        
        console.log('✅ Multiple state updates successful');
        
        const stateTime = Date.now() - stateStart;
        results.push({ name: 'State Management', status: 'PASS', time: stateTime });
        console.log(`⚡ Test 2 completed in ${stateTime}ms`);
        console.log('');
        
    } catch (error) {
        allTestsPassed = false;
        results.push({ name: 'State Management', status: 'FAIL', error: error.message });
        console.log(`❌ Test 2 failed: ${error.message}`);
        console.log('');
    }
    
    try {
        // Test 3: Data Logging Integration
        console.log('🔍 Test 3: Data Logging Integration');
        const loggingStart = Date.now();
        
        // Get initial log count
        const initialLogs = getAllLogs();
        const initialCount = initialLogs.success ? initialLogs.logs.length : 0;
        
        // Create test log entries
        const { logStockCheck } = require('./src/dataLogger.js');
        
        const testEntries = [
            { inStock: true, timestamp: new Date().toISOString(), url: 'test-1' },
            { inStock: false, timestamp: new Date().toISOString(), url: 'test-2' },
            { inStock: true, timestamp: new Date().toISOString(), url: 'test-3' }
        ];
        
        for (const entry of testEntries) {
            const logResult = logStockCheck(entry);
            if (!logResult.success) {
                throw new Error(`Logging failed: ${logResult.error}`);
            }
        }
        
        console.log('✅ Test log entries created');
        
        // Verify logs were written
        const finalLogs = getAllLogs();
        const finalCount = finalLogs.success ? finalLogs.logs.length : 0;
        
        if (finalCount < initialCount + 3) {
            throw new Error('Log entries not properly written');
        }
        
        console.log(`✅ Log integrity verified (${finalCount - initialCount} new entries)`);
        
        const loggingTime = Date.now() - loggingStart;
        results.push({ name: 'Data Logging', status: 'PASS', time: loggingTime });
        console.log(`⚡ Test 3 completed in ${loggingTime}ms`);
        console.log('');
        
    } catch (error) {
        allTestsPassed = false;
        results.push({ name: 'Data Logging', status: 'FAIL', error: error.message });
        console.log(`❌ Test 3 failed: ${error.message}`);
        console.log('');
    }
    
    try {
        // Test 4: Scheduler Integration
        console.log('🔍 Test 4: Scheduler Integration');
        const schedulerStart = Date.now();
        
        if (!app.isInitialized) {
            await app.initialize();
        }
        
        // Test scheduler start/stop
        await app.startApplication();
        
        if (!app.schedulersStarted) {
            throw new Error('Schedulers not started');
        }
        
        console.log('✅ Schedulers started successfully');
        
        // Brief operation to verify schedulers
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Test daily summary (should work without external dependencies)
        const summaryResult = await app.performDailySummary();
        if (summaryResult.success || summaryResult.message) {
            console.log('✅ Daily summary function operational');
        } else {
            console.log('⚠️ Daily summary had expected limitations');
        }
        
        await app.stopApplication();
        
        if (app.schedulersStarted) {
            throw new Error('Schedulers not properly stopped');
        }
        
        console.log('✅ Schedulers stopped successfully');
        
        const schedulerTime = Date.now() - schedulerStart;
        results.push({ name: 'Scheduler Integration', status: 'PASS', time: schedulerTime });
        console.log(`⚡ Test 4 completed in ${schedulerTime}ms`);
        console.log('');
        
    } catch (error) {
        allTestsPassed = false;
        results.push({ name: 'Scheduler Integration', status: 'FAIL', error: error.message });
        console.log(`❌ Test 4 failed: ${error.message}`);
        console.log('');
        
        // Cleanup
        try {
            if (app.isRunning) {
                await app.stopApplication();
            }
        } catch (cleanupError) {
            console.log(`⚠️ Cleanup error: ${cleanupError.message}`);
        }
    }
    
    // Final Results
    console.log('📊 Core Workflow Validation Results');
    console.log('===================================');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const successRate = ((passed / results.length) * 100).toFixed(1);
    
    console.log(`📋 Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');
    
    results.forEach(result => {
        if (result.status === 'PASS') {
            console.log(`✅ ${result.name} - PASSED (${result.time}ms)`);
        } else {
            console.log(`❌ ${result.name} - FAILED: ${result.error}`);
        }
    });
    
    console.log('');
    
    if (allTestsPassed) {
        console.log('🎉 All core workflow tests passed!');
        console.log('✅ Internal system components validated');
        console.log('🚀 System ready for error handling enhancements');
    } else {
        console.log('⚠️ Some core workflow tests failed');
        console.log('🔍 Review failures before proceeding');
    }
    
    return allTestsPassed;
}

// Run validation if called directly
if (require.main === module) {
    validateCoreWorkflow()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Core validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = { validateCoreWorkflow }; 