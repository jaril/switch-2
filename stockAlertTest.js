/**
 * Stock Alert Email Test Script
 * Tests the sendStockAlert function from emailService.js
 */

// Load environment variables
require('dotenv').config();

const { sendStockAlert, getServiceInfo } = require('./src/emailService.js');

async function testStockAlert() {
    console.log('🧪 Testing Stock Alert Email Function');
    console.log('=====================================');
    
    // Display service info
    const serviceInfo = getServiceInfo();
    console.log('📧 Email Service Info:');
    console.log(`   Service: ${serviceInfo.service}`);
    console.log(`   From: ${serviceInfo.fromEmail}`);
    console.log(`   To: ${serviceInfo.toEmail}`);
    console.log(`   Client Initialized: ${serviceInfo.clientInitialized}`);
    console.log('');

    // Test stock alert with sample data
    const testUrl = 'https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html';
    const testProductName = 'Nintendo Switch 2 - Mario Kart World Bundle';

    console.log('🚨 Testing stock alert email...');
    console.log(`   Product: ${testProductName}`);
    console.log(`   URL: ${testUrl}`);
    console.log('');

    try {
        const result = await sendStockAlert(testUrl, testProductName);
        
        if (result.success) {
            console.log('✅ STOCK ALERT TEST SUCCESSFUL!');
            console.log(`   Message ID: ${result.messageId}`);
            console.log(`   Timestamp: ${result.timestamp}`);
            console.log('');
            console.log('📱 Check your email for the stock alert!');
        } else {
            console.log('❌ STOCK ALERT TEST FAILED!');
            console.log(`   Error: ${result.error}`);
            console.log(`   Timestamp: ${result.timestamp}`);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error during test:', error.message);
    }

    console.log('');
    console.log('🎮 Stock Alert Email Test Complete!');
}

// Test different scenarios
async function runAllTests() {
    console.log('🎮 Nintendo Switch 2 Stock Alert Email Tests');
    console.log('============================================\n');

    // Test 1: Valid stock alert with default product name
    console.log('TEST 1: Stock Alert with Default Product Name');
    console.log('--------------------------------------------');
    
    try {
        const result1 = await sendStockAlert('https://www.costco.com/nintendo-switch-2.product.html');
        console.log(result1.success ? '✅ PASSED' : `❌ FAILED: ${result1.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');

    // Test 2: Stock alert with custom product name
    console.log('TEST 2: Stock Alert with Custom Product Name');
    console.log('-------------------------------------------');
    
    try {
        const result2 = await sendStockAlert(
            'https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html',
            'Nintendo Switch 2 - Mario Kart World Bundle'
        );
        console.log(result2.success ? '✅ PASSED' : `❌ FAILED: ${result2.error}`);
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
    }
    
    console.log('');

    // Test 3: Invalid URL (should fail validation)
    console.log('TEST 3: Invalid URL Validation');
    console.log('-----------------------------');
    
    try {
        const result3 = await sendStockAlert('');
        console.log(result3.success ? '❌ SHOULD HAVE FAILED' : `✅ PASSED: ${result3.error}`);
    } catch (error) {
        console.log(`✅ PASSED: ${error.message}`);
    }
    
    console.log('');
    console.log('🎉 All stock alert email tests complete!');
    console.log('📧 Check your email inbox for the test alerts.');
}

// Run the tests
if (require.main === module) {
    console.log('⚠️  WARNING: This will send actual emails using your Resend API key!');
    console.log('Make sure your .env file is configured with valid credentials.');
    console.log('');
    
    // Run simple test by default
    testStockAlert();
    
    // Uncomment the line below to run all tests (sends multiple emails)
    // runAllTests();
}

module.exports = {
    testStockAlert,
    runAllTests
}; 