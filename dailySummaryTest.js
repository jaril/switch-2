/**
 * Daily Summary Email Test Script
 * Tests the sendDailySummary function from emailService.js
 */

// Load environment variables
require('dotenv').config();

const { sendDailySummary, getServiceInfo } = require('./src/emailService.js');

async function testDailySummary() {
    console.log('🧪 Testing Daily Summary Email Function');
    console.log('=======================================');
    
    // Display service info
    const serviceInfo = getServiceInfo();
    console.log('📧 Email Service Info:');
    console.log(`   Service: ${serviceInfo.service}`);
    console.log(`   From: ${serviceInfo.fromEmail}`);
    console.log(`   To: ${serviceInfo.toEmail}`);
    console.log(`   Client Initialized: ${serviceInfo.clientInitialized}`);
    console.log('');

    // Create sample summary data
    const sampleSummaryData = {
        totalChecks: 48,
        inStockCount: 12,
        outOfStockCount: 36,
        date: '2025-01-27',
        checkHistory: [
            { timestamp: '2025-01-27T08:00:00Z', status: 'out-of-stock' },
            { timestamp: '2025-01-27T10:30:00Z', status: 'in-stock' },
            { timestamp: '2025-01-27T11:45:00Z', status: 'out-of-stock' },
            { timestamp: '2025-01-27T14:15:00Z', status: 'in-stock' },
            { timestamp: '2025-01-27T16:20:00Z', status: 'out-of-stock' }
        ]
    };

    console.log('📊 Testing daily summary email...');
    console.log(`   Date: ${sampleSummaryData.date}`);
    console.log(`   Total Checks: ${sampleSummaryData.totalChecks}`);
    console.log(`   In Stock: ${sampleSummaryData.inStockCount} (${((sampleSummaryData.inStockCount / sampleSummaryData.totalChecks) * 100).toFixed(1)}%)`);
    console.log(`   Out of Stock: ${sampleSummaryData.outOfStockCount} (${((sampleSummaryData.outOfStockCount / sampleSummaryData.totalChecks) * 100).toFixed(1)}%)`);
    console.log(`   Status Changes: ${sampleSummaryData.checkHistory.length}`);
    console.log('');

    try {
        const result = await sendDailySummary(sampleSummaryData);
        
        if (result.success) {
            console.log('✅ DAILY SUMMARY TEST SUCCESSFUL!');
            console.log(`   Message ID: ${result.messageId}`);
            console.log(`   Timestamp: ${result.timestamp}`);
            console.log('');
            console.log('📱 Check your email for the daily summary report!');
        } else {
            console.log('❌ DAILY SUMMARY TEST FAILED!');
            console.log(`   Error: ${result.error}`);
            console.log(`   Timestamp: ${result.timestamp}`);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error during test:', error.message);
    }

    console.log('');
    console.log('📊 Daily Summary Email Test Complete!');
}

// Test different scenarios
async function runAllSummaryTests() {
    console.log('📊 Nintendo Switch 2 Daily Summary Email Tests');
    console.log('==============================================\n');

    // Test 1: Full activity day
    console.log('TEST 1: Full Activity Day Summary');
    console.log('--------------------------------');
    
    const fullActivityData = {
        totalChecks: 96,
        inStockCount: 24,
        outOfStockCount: 72,
        date: '2025-01-27',
        checkHistory: [
            { timestamp: '2025-01-27T09:15:00Z', status: 'out-of-stock' },
            { timestamp: '2025-01-27T12:30:00Z', status: 'in-stock' },
            { timestamp: '2025-01-27T13:45:00Z', status: 'out-of-stock' },
            { timestamp: '2025-01-27T16:20:00Z', status: 'in-stock' },
            { timestamp: '2025-01-27T18:10:00Z', status: 'out-of-stock' }
        ]
    };
    
    try {
        const result1 = await sendDailySummary(fullActivityData);
        console.log(result1.success ? '✅ PASSED' : `❌ FAILED: ${result1.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');

    // Test 2: No activity day
    console.log('TEST 2: No Activity Day Summary');
    console.log('------------------------------');
    
    const noActivityData = {
        totalChecks: 0,
        inStockCount: 0,
        outOfStockCount: 0,
        date: '2025-01-26',
        checkHistory: []
    };
    
    try {
        const result2 = await sendDailySummary(noActivityData);
        console.log(result2.success ? '✅ PASSED' : `❌ FAILED: ${result2.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');

    // Test 3: High availability day
    console.log('TEST 3: High Availability Day Summary');
    console.log('------------------------------------');
    
    const highAvailabilityData = {
        totalChecks: 72,
        inStockCount: 60,
        outOfStockCount: 12,
        date: '2025-01-25',
        checkHistory: [
            { timestamp: '2025-01-25T08:00:00Z', status: 'in-stock' },
            { timestamp: '2025-01-25T20:30:00Z', status: 'out-of-stock' },
            { timestamp: '2025-01-25T21:15:00Z', status: 'in-stock' }
        ]
    };
    
    try {
        const result3 = await sendDailySummary(highAvailabilityData);
        console.log(result3.success ? '✅ PASSED' : `❌ FAILED: ${result3.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');

    // Test 4: Invalid data (should fail validation)
    console.log('TEST 4: Invalid Data Validation');
    console.log('------------------------------');
    
    try {
        const result4 = await sendDailySummary(null);
        console.log(result4.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${result4.error}`);
    } catch (error) {
        console.log(`✅ PASSED: ${error.message}`);
    }
    
    console.log('');

    // Test 5: Minimal valid data
    console.log('TEST 5: Minimal Valid Data');
    console.log('-------------------------');
    
    const minimalData = {
        totalChecks: 1,
        inStockCount: 1,
        outOfStockCount: 0
    };
    
    try {
        const result5 = await sendDailySummary(minimalData);
        console.log(result5.success ? '✅ PASSED' : `❌ FAILED: ${result5.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');
    console.log('🎉 All daily summary email tests complete!');
    console.log('📧 Check your email inbox for the test summaries.');
}

// Data visualization helper
function previewSummaryData(summaryData) {
    console.log('📊 Summary Data Preview:');
    console.log('========================');
    console.log(`Date: ${summaryData.date || 'Today'}`);
    console.log(`Total Checks: ${summaryData.totalChecks || 0}`);
    console.log(`In Stock: ${summaryData.inStockCount || 0}`);
    console.log(`Out of Stock: ${summaryData.outOfStockCount || 0}`);
    
    if (summaryData.totalChecks > 0) {
        const inStockPercentage = ((summaryData.inStockCount / summaryData.totalChecks) * 100).toFixed(1);
        const outOfStockPercentage = ((summaryData.outOfStockCount / summaryData.totalChecks) * 100).toFixed(1);
        console.log(`Availability: ${inStockPercentage}% in stock, ${outOfStockPercentage}% out of stock`);
    }
    
    if (summaryData.checkHistory && summaryData.checkHistory.length > 0) {
        console.log(`Status Changes: ${summaryData.checkHistory.length} recorded`);
        summaryData.checkHistory.forEach((change, index) => {
            const time = new Date(change.timestamp).toLocaleTimeString();
            console.log(`  ${index + 1}. ${time} - ${change.status}`);
        });
    }
    console.log('');
}

// Run the tests
if (require.main === module) {
    console.log('⚠️  WARNING: This will send actual emails using your Resend API key!');
    console.log('Make sure your .env file is configured with valid credentials.');
    console.log('');
    
    // Run simple test by default
    testDailySummary();
    
    // Uncomment the line below to run all tests (sends multiple emails)
    // runAllSummaryTests();
}

module.exports = {
    testDailySummary,
    runAllSummaryTests,
    previewSummaryData
}; 