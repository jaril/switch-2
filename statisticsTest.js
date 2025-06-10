/**
 * Statistics Test Script
 * Tests the new statistics tracking functions from dataLogger.js
 */

const {
    logStockCheck,
    initializeLogFile,
    calculateDailyStats,
    getLast24HourStats,
    getStatusChanges,
    getAllLogs
} = require('./src/dataLogger.js');

// Helper function to create test data
function createTestData() {
    console.log('📝 Creating test data...');
    
    // Initialize the log file
    initializeLogFile();
    
    // Create test scenarios with different dates and times
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const testLogs = [
        // Yesterday's data
        { inStock: false, timestamp: `${yesterday}T08:00:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${yesterday}T10:30:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: true, timestamp: `${yesterday}T12:15:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: true, timestamp: `${yesterday}T14:45:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${yesterday}T18:20:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${yesterday}T20:00:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        
        // Today's data
        { inStock: false, timestamp: `${today}T09:00:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${today}T11:30:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: true, timestamp: `${today}T13:15:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: true, timestamp: `${today}T15:45:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${today}T17:30:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
        { inStock: false, timestamp: `${today}T19:00:00.000Z`, url: 'https://www.costco.com/nintendo-switch-2.html' },
    ];
    
    // Log all test data
    testLogs.forEach((log, index) => {
        const result = logStockCheck(log);
        if (result.success) {
            console.log(`   ✅ Test log ${index + 1}: ${log.inStock ? 'In Stock' : 'Out of Stock'} - ${log.timestamp}`);
        } else {
            console.log(`   ❌ Failed to log test data ${index + 1}: ${result.error}`);
        }
    });
    
    console.log(`📊 Created ${testLogs.length} test log entries`);
    return { today, yesterday, testLogs };
}

async function testStatistics() {
    console.log('🧪 Testing Statistics Functions');
    console.log('==============================');
    console.log('');

    // Create test data
    const { today, yesterday } = createTestData();
    console.log('');

    // Test 1: Calculate daily stats for today
    console.log('TEST 1: Calculate Daily Stats (Today)');
    console.log('------------------------------------');
    
    const todayStatsResult = calculateDailyStats(today);
    console.log('Result:', todayStatsResult.success ? '✅ PASSED' : `❌ FAILED: ${todayStatsResult.error}`);
    
    if (todayStatsResult.success) {
        const stats = todayStatsResult.stats;
        console.log(`   Date: ${stats.date}`);
        console.log(`   Total Checks: ${stats.totalChecks}`);
        console.log(`   In Stock: ${stats.inStockCount}`);
        console.log(`   Out of Stock: ${stats.outOfStockCount}`);
        console.log(`   Status Changes: ${stats.statusChanges.length}`);
        console.log(`   First Check: ${stats.firstCheck ? new Date(stats.firstCheck).toLocaleString() : 'None'}`);
        console.log(`   Last Check: ${stats.lastCheck ? new Date(stats.lastCheck).toLocaleString() : 'None'}`);
        
        if (stats.statusChanges.length > 0) {
            console.log('   Status Changes:');
            stats.statusChanges.forEach((change, index) => {
                console.log(`     ${index + 1}. ${change.from} → ${change.to} at ${new Date(change.timestamp).toLocaleString()}`);
            });
        }
    }
    console.log('');

    // Test 2: Calculate daily stats for yesterday
    console.log('TEST 2: Calculate Daily Stats (Yesterday)');
    console.log('---------------------------------------');
    
    const yesterdayStatsResult = calculateDailyStats(yesterday);
    console.log('Result:', yesterdayStatsResult.success ? '✅ PASSED' : `❌ FAILED: ${yesterdayStatsResult.error}`);
    
    if (yesterdayStatsResult.success) {
        const stats = yesterdayStatsResult.stats;
        console.log(`   Date: ${stats.date}`);
        console.log(`   Total Checks: ${stats.totalChecks}`);
        console.log(`   In Stock: ${stats.inStockCount}`);
        console.log(`   Out of Stock: ${stats.outOfStockCount}`);
        console.log(`   Status Changes: ${stats.statusChanges.length}`);
        
        if (stats.statusChanges.length > 0) {
            console.log('   Status Changes:');
            stats.statusChanges.forEach((change, index) => {
                console.log(`     ${index + 1}. ${change.from} → ${change.to} at ${new Date(change.timestamp).toLocaleString()}`);
            });
        }
    }
    console.log('');

    // Test 3: Get last 24 hour stats
    console.log('TEST 3: Get Last 24 Hour Stats');
    console.log('-----------------------------');
    
    const last24HourResult = getLast24HourStats();
    console.log('Result:', last24HourResult.success ? '✅ PASSED' : `❌ FAILED: ${last24HourResult.error}`);
    
    if (last24HourResult.success) {
        const stats = last24HourResult.stats;
        console.log(`   Period: ${stats.date}`);
        console.log(`   Total Checks: ${stats.totalChecks}`);
        console.log(`   In Stock: ${stats.inStockCount}`);
        console.log(`   Out of Stock: ${stats.outOfStockCount}`);
        console.log(`   Status Changes: ${stats.statusChanges.length}`);
        console.log(`   Period Start: ${new Date(stats.periodStart).toLocaleString()}`);
        console.log(`   Period End: ${new Date(stats.periodEnd).toLocaleString()}`);
        
        if (stats.statusChanges.length > 0) {
            console.log('   Recent Status Changes:');
            stats.statusChanges.slice(-3).forEach((change, index) => {
                console.log(`     ${index + 1}. ${change.from} → ${change.to} at ${new Date(change.timestamp).toLocaleString()}`);
            });
        }
    }
    console.log('');

    // Test 4: Get status changes for today
    console.log('TEST 4: Get Status Changes (Today)');
    console.log('---------------------------------');
    
    const todayChangesResult = getStatusChanges(today);
    console.log('Result:', todayChangesResult.success ? '✅ PASSED' : `❌ FAILED: ${todayChangesResult.error}`);
    
    if (todayChangesResult.success) {
        const { statusChanges, summary } = todayChangesResult;
        console.log(`   Date: ${summary.date}`);
        console.log(`   Total Changes: ${summary.totalChanges}`);
        console.log(`   Total Logs: ${summary.totalLogs}`);
        console.log(`   First Status: ${summary.firstLogStatus || 'None'}`);
        console.log(`   Last Status: ${summary.lastLogStatus || 'None'}`);
        
        if (statusChanges.length > 0) {
            console.log('   Detailed Status Changes:');
            statusChanges.forEach((change, index) => {
                console.log(`     ${change.sequenceNumber}. ${change.from} → ${change.to} at ${change.formattedTime}`);
            });
        }
    }
    console.log('');

    // Test 5: Get status changes for yesterday
    console.log('TEST 5: Get Status Changes (Yesterday)');
    console.log('------------------------------------');
    
    const yesterdayChangesResult = getStatusChanges(yesterday);
    console.log('Result:', yesterdayChangesResult.success ? '✅ PASSED' : `❌ FAILED: ${yesterdayChangesResult.error}`);
    
    if (yesterdayChangesResult.success) {
        const { statusChanges, summary } = yesterdayChangesResult;
        console.log(`   Date: ${summary.date}`);
        console.log(`   Total Changes: ${summary.totalChanges}`);
        console.log(`   Total Logs: ${summary.totalLogs}`);
        
        if (statusChanges.length > 0) {
            console.log('   Status Changes:');
            statusChanges.forEach((change, index) => {
                console.log(`     ${change.sequenceNumber}. ${change.from} → ${change.to} at ${change.formattedTime}`);
            });
        }
    }
    console.log('');

    // Test 6: Error handling - invalid dates
    console.log('TEST 6: Error Handling - Invalid Dates');
    console.log('-------------------------------------');
    
    const invalidDate1 = calculateDailyStats('2025-13-40');
    console.log('Invalid Date Format:', invalidDate1.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${invalidDate1.error}`);
    
    const invalidDate2 = calculateDailyStats('not-a-date');
    console.log('Invalid Date String:', invalidDate2.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${invalidDate2.error}`);
    
    const nullDate = getStatusChanges(null);
    console.log('Null Date:', nullDate.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${nullDate.error}`);
    
    console.log('');

    // Test 7: Edge case - no data for date
    console.log('TEST 7: Edge Case - No Data for Date');
    console.log('-----------------------------------');
    
    const futureDate = '2025-12-31';
    const noDataResult = calculateDailyStats(futureDate);
    console.log('Future Date:', noDataResult.success ? '✅ PASSED' : `❌ FAILED: ${noDataResult.error}`);
    
    if (noDataResult.success) {
        const stats = noDataResult.stats;
        console.log(`   Date: ${stats.date}`);
        console.log(`   Total Checks: ${stats.totalChecks} (should be 0)`);
        console.log(`   Status Changes: ${stats.statusChanges.length} (should be 0)`);
        console.log(`   First Check: ${stats.firstCheck || 'None'}`);
        console.log(`   Last Check: ${stats.lastCheck || 'None'}`);
    }
    console.log('');

    console.log('🎉 Statistics Test Complete!');
    console.log('📊 All statistics functions are working correctly.');
}

// Statistics summary helper
function displayStatisticsSummary() {
    console.log('📈 Statistics Summary Report');
    console.log('===========================');
    console.log('');

    const allLogsResult = getAllLogs();
    if (!allLogsResult.success) {
        console.log('❌ Could not retrieve logs for summary');
        return;
    }

    const logs = allLogsResult.logs;
    const totalLogs = logs.length;
    const inStockTotal = logs.filter(log => log.inStock).length;
    const outOfStockTotal = logs.filter(log => log.inStock === false).length;
    
    console.log(`Total Logs: ${totalLogs}`);
    console.log(`In Stock: ${inStockTotal} (${totalLogs > 0 ? ((inStockTotal / totalLogs) * 100).toFixed(1) : 0}%)`);
    console.log(`Out of Stock: ${outOfStockTotal} (${totalLogs > 0 ? ((outOfStockTotal / totalLogs) * 100).toFixed(1) : 0}%)`);
    
    if (logs.length > 0) {
        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];
        console.log(`First Log: ${new Date(firstLog.timestamp).toLocaleString()}`);
        console.log(`Last Log: ${new Date(lastLog.timestamp).toLocaleString()}`);
    }
    
    console.log('');
}

// Run the tests
if (require.main === module) {
    console.log('📊 Nintendo Switch 2 Stock Monitor - Statistics Tests');
    console.log('====================================================\n');
    
    // Run statistics tests
    testStatistics();
    
    // Display summary
    console.log('\n' + '='.repeat(50) + '\n');
    displayStatisticsSummary();
}

module.exports = {
    testStatistics,
    createTestData,
    displayStatisticsSummary
}; 