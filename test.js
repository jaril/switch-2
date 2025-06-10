/**
 * Test Script for Nintendo Switch 2 Stock Checker
 * 
 * This script tests the stock checking functionality to ensure it works correctly
 * before integrating into the main application.
 * 
 * Run with: node test.js
 */

const { checkStock } = require('./src/stockChecker.js');

// Test URLs
const NINTENDO_SWITCH_URL = 'https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html';
const INVALID_URL = 'https://invalid-domain-that-does-not-exist.com/product';
const MALFORMED_URL = 'not-a-valid-url';

/**
 * Helper function to format test results
 */
function formatResult(testName, result, startTime) {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    console.log(`\n=== ${testName} ===`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    // Validate result format
    const hasRequiredFields = result.hasOwnProperty('inStock') && 
                             result.hasOwnProperty('timestamp');
    
    if (!hasRequiredFields) {
        console.log('❌ ERROR: Result missing required fields (inStock, timestamp)');
    } else {
        console.log(`✅ Result format valid`);
        console.log(`📊 Stock Status: ${result.inStock ? '🟢 IN STOCK' : '🔴 OUT OF STOCK'}`);
        
        if (result.error) {
            console.log(`⚠️  Error: ${result.error}`);
        }
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🎮 Nintendo Switch 2 Stock Checker - Test Suite');
    console.log('================================================');
    console.log('Testing stock detection functionality...\n');

    // Test 1: Valid Nintendo Switch 2 URL (should return out of stock currently)
    console.log('🧪 Test 1: Checking Nintendo Switch 2 on Costco...');
    try {
        const startTime = Date.now();
        const result = await checkStock(NINTENDO_SWITCH_URL);
        formatResult('Nintendo Switch 2 Stock Check', result, startTime);
    } catch (error) {
        console.log('❌ Unexpected error in Test 1:', error.message);
    }

    // Test 2: Invalid domain (should return network error)
    console.log('\n🧪 Test 2: Testing invalid domain...');
    try {
        const startTime = Date.now();
        const result = await checkStock(INVALID_URL);
        formatResult('Invalid Domain Test', result, startTime);
    } catch (error) {
        console.log('❌ Unexpected error in Test 2:', error.message);
    }

    // Test 3: Malformed URL (should return validation error)
    console.log('\n🧪 Test 3: Testing malformed URL...');
    try {
        const startTime = Date.now();
        const result = await checkStock(MALFORMED_URL);
        formatResult('Malformed URL Test', result, startTime);
    } catch (error) {
        console.log('❌ Unexpected error in Test 3:', error.message);
    }

    // Test 4: No URL parameter (should return validation error)
    console.log('\n🧪 Test 4: Testing with no URL...');
    try {
        const startTime = Date.now();
        const result = await checkStock();
        formatResult('No URL Test', result, startTime);
    } catch (error) {
        console.log('❌ Unexpected error in Test 4:', error.message);
    }

    // Summary
    console.log('\n📋 Test Summary');
    console.log('================');
    console.log('✅ Test 1: Nintendo Switch 2 URL - Checks actual product page');
    console.log('✅ Test 2: Invalid Domain - Tests network error handling');
    console.log('✅ Test 3: Malformed URL - Tests URL validation');
    console.log('✅ Test 4: No URL - Tests parameter validation');
    
    console.log('\n📖 How to Interpret Results:');
    console.log('-----------------------------');
    console.log('🟢 IN STOCK: Add to cart button is available and enabled');
    console.log('🔴 OUT OF STOCK: Add to cart button missing or disabled');
    console.log('⚠️  ERROR: Network, parsing, or validation error occurred');
    console.log('\n📝 Notes:');
    console.log('- Current Nintendo Switch 2 status should be OUT OF STOCK');
    console.log('- Error tests should show appropriate error messages');
    console.log('- All results should include inStock boolean and timestamp');
    console.log('- Response times should be under 5 seconds (or timeout)');
}

// Run the tests
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });
} 