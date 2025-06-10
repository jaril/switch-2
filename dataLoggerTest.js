/**
 * Data Logger Test Script
 * Tests the JSON logging functionality from dataLogger.js
 */

const {
    logStockCheck,
    getAllLogs,
    getLogsSince,
    initializeLogFile,
    getLogFileStats
} = require('./src/dataLogger.js');

async function testDataLogger() {
    console.log('🧪 Testing Data Logger Functions');
    console.log('================================');
    console.log('');

    // Test 1: Initialize log file
    console.log('TEST 1: Initialize Log File');
    console.log('---------------------------');
    
    const initResult = initializeLogFile();
    console.log('Result:', initResult.success ? '✅ PASSED' : `❌ FAILED: ${initResult.error}`);
    if (initResult.success) {
        console.log(`   File Path: ${initResult.filePath}`);
        console.log(`   Message: ${initResult.message}`);
    }
    console.log('');

    // Test 2: Get initial file stats
    console.log('TEST 2: Get File Statistics');
    console.log('--------------------------');
    
    const statsResult = getLogFileStats();
    console.log('Result:', statsResult.success ? '✅ PASSED' : `❌ FAILED: ${statsResult.error}`);
    if (statsResult.success) {
        console.log(`   File Size: ${statsResult.fileSize} bytes`);
        console.log(`   Total Entries: ${statsResult.totalEntries}`);
        console.log(`   Last Modified: ${statsResult.lastModified}`);
    }
    console.log('');

    // Test 3: Log stock checks
    console.log('TEST 3: Log Stock Check Results');
    console.log('------------------------------');

    // Test successful stock check
    const stockResult1 = {
        inStock: true,
        timestamp: new Date().toISOString(),
        url: 'https://www.costco.com/nintendo-switch-2.html'
    };

    const logResult1 = logStockCheck(stockResult1);
    console.log('Log Result 1:', logResult1.success ? '✅ PASSED' : `❌ FAILED: ${logResult1.error}`);
    if (logResult1.success) {
        console.log(`   Entry: ${logResult1.logEntry.inStock ? 'In Stock' : 'Out of Stock'} at ${logResult1.logEntry.timestamp}`);
        console.log(`   Total Logs: ${logResult1.totalLogs}`);
    }

    // Test failed stock check with error
    const stockResult2 = {
        inStock: false,
        timestamp: new Date().toISOString(),
        error: 'Network timeout',
        url: 'https://www.costco.com/nintendo-switch-2.html'
    };

    const logResult2 = logStockCheck(stockResult2);
    console.log('Log Result 2:', logResult2.success ? '✅ PASSED' : `❌ FAILED: ${logResult2.error}`);
    if (logResult2.success) {
        console.log(`   Entry: ${logResult2.logEntry.inStock ? 'In Stock' : 'Out of Stock'} at ${logResult2.logEntry.timestamp}`);
        console.log(`   Error: ${logResult2.logEntry.error || 'None'}`);
    }

    // Test out of stock check
    const stockResult3 = {
        inStock: false,
        timestamp: new Date().toISOString(),
        url: 'https://www.costco.com/nintendo-switch-2.html'
    };

    const logResult3 = logStockCheck(stockResult3);
    console.log('Log Result 3:', logResult3.success ? '✅ PASSED' : `❌ FAILED: ${logResult3.error}`);

    console.log('');

    // Test 4: Get all logs
    console.log('TEST 4: Retrieve All Logs');
    console.log('------------------------');
    
    const allLogsResult = getAllLogs();
    console.log('Result:', allLogsResult.success ? '✅ PASSED' : `❌ FAILED: ${allLogsResult.error}`);
    if (allLogsResult.success) {
        console.log(`   Total Logs Retrieved: ${allLogsResult.totalCount}`);
        console.log('   Recent Logs:');
        allLogsResult.logs.slice(-3).forEach((log, index) => {
            const status = log.inStock ? '🟢 In Stock' : '🔴 Out of Stock';
            const error = log.error ? ` (Error: ${log.error})` : '';
            console.log(`     ${index + 1}. ${status} - ${new Date(log.timestamp).toLocaleString()}${error}`);
        });
    }
    console.log('');

    // Test 5: Get logs since a specific date
    console.log('TEST 5: Get Logs Since Date');
    console.log('--------------------------');
    
    // Get logs from 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentLogsResult = getLogsSince(oneHourAgo);
    console.log('Result:', recentLogsResult.success ? '✅ PASSED' : `❌ FAILED: ${recentLogsResult.error}`);
    if (recentLogsResult.success) {
        console.log(`   Logs since ${new Date(oneHourAgo).toLocaleString()}: ${recentLogsResult.totalCount}`);
        console.log(`   Filter Date: ${recentLogsResult.filterDate}`);
        
        if (recentLogsResult.logs.length > 0) {
            console.log('   Recent Logs:');
            recentLogsResult.logs.forEach((log, index) => {
                const status = log.inStock ? '🟢 In Stock' : '🔴 Out of Stock';
                console.log(`     ${index + 1}. ${status} - ${new Date(log.timestamp).toLocaleString()}`);
            });
        }
    }
    console.log('');

    // Test 6: Error handling - invalid data
    console.log('TEST 6: Error Handling - Invalid Data');
    console.log('------------------------------------');
    
    const invalidResult1 = logStockCheck(null);
    console.log('Null Input:', invalidResult1.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${invalidResult1.error}`);
    
    const invalidResult2 = logStockCheck({ inStock: 'yes' });
    console.log('Invalid Type:', invalidResult2.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${invalidResult2.error}`);
    
    const invalidResult3 = getLogsSince('invalid-date');
    console.log('Invalid Date:', invalidResult3.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${invalidResult3.error}`);
    
    console.log('');

    // Test 7: Final file stats
    console.log('TEST 7: Final File Statistics');
    console.log('----------------------------');
    
    const finalStatsResult = getLogFileStats();
    console.log('Result:', finalStatsResult.success ? '✅ PASSED' : `❌ FAILED: ${finalStatsResult.error}`);
    if (finalStatsResult.success) {
        console.log(`   File Size: ${finalStatsResult.fileSize} bytes`);
        console.log(`   Total Entries: ${finalStatsResult.totalEntries}`);
        console.log(`   Last Modified: ${new Date(finalStatsResult.lastModified).toLocaleString()}`);
    }
    console.log('');

    console.log('🎉 Data Logger Test Complete!');
    console.log(`📄 Check the log file at: data/stock-checks.json`);
}

// Simulate a series of stock checks for testing
async function simulateStockChecks() {
    console.log('🎬 Simulating Stock Check Scenario');
    console.log('==================================');
    console.log('');

    // Initialize
    initializeLogFile();

    // Simulate a day of stock checks with various outcomes
    const scenarios = [
        { inStock: false, description: 'Morning check - out of stock' },
        { inStock: false, description: 'Mid-morning check - still out' },
        { inStock: true, description: 'Afternoon restock - in stock!' },
        { inStock: true, description: 'Afternoon check - still available' },
        { inStock: false, description: 'Evening check - sold out again' },
        { inStock: false, error: 'Request timeout', description: 'Late night check - network error' }
    ];

    console.log('📝 Logging stock check scenarios...');
    
    scenarios.forEach((scenario, index) => {
        const stockResult = {
            inStock: scenario.inStock,
            timestamp: new Date(Date.now() - (scenarios.length - index) * 10000).toISOString(), // Spread over time
            error: scenario.error || null,
            url: 'https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html'
        };

        const result = logStockCheck(stockResult);
        const statusIcon = scenario.inStock ? '🟢' : '🔴';
        const errorText = scenario.error ? ` (${scenario.error})` : '';
        
        console.log(`   ${index + 1}. ${statusIcon} ${scenario.description}${errorText} - ${result.success ? 'Logged' : 'Failed'}`);
    });

    console.log('');

    // Show summary
    const allLogs = getAllLogs();
    if (allLogs.success) {
        const inStockCount = allLogs.logs.filter(log => log.inStock).length;
        const outOfStockCount = allLogs.logs.filter(log => !log.inStock).length;
        const errorCount = allLogs.logs.filter(log => log.error).length;

        console.log('📊 Simulation Summary:');
        console.log(`   Total Checks: ${allLogs.totalCount}`);
        console.log(`   In Stock: ${inStockCount}`);
        console.log(`   Out of Stock: ${outOfStockCount}`);
        console.log(`   Errors: ${errorCount}`);
    }

    console.log('');
    console.log('🎬 Stock Check Simulation Complete!');
}

// Run the tests
if (require.main === module) {
    console.log('📦 Nintendo Switch 2 Stock Monitor - Data Logger Tests');
    console.log('=====================================================\n');
    
    // Run basic tests
    testDataLogger();
    
    // Uncomment to run simulation (adds more test data)
    // console.log('\n' + '='.repeat(50) + '\n');
    // simulateStockChecks();
}

module.exports = {
    testDataLogger,
    simulateStockChecks
}; 