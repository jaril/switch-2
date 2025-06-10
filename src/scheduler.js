/**
 * Stock Check Scheduler for Nintendo Switch 2 Stock Monitor
 * Runs stock checks every 30 minutes and sends alerts when stock becomes available
 */

const cron = require('node-cron');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck } = require('./dataLogger.js');
const { sendStockAlert } = require('./emailService.js');
const config = require('./config.js');

// State management
let monitoringTask = null;
let lastKnownStatus = null;
let isMonitoring = false;

/**
 * Perform a single stock check with logging and alert logic
 */
async function performStockCheck() {
    try {
        console.log('🔍 Performing scheduled stock check...');
        
        // Step 1: Check stock status
        const stockResult = await checkStock(config.PRODUCT_URL);
        
        // Step 2: Log the result
        const logData = {
            inStock: stockResult.inStock,
            timestamp: stockResult.timestamp,
            error: stockResult.error,
            url: config.PRODUCT_URL
        };
        
        const logResult = logStockCheck(logData);
        if (!logResult.success) {
            console.warn('⚠️ Failed to log stock check:', logResult.error);
        }
        
        // Step 3: Check for status changes and send alerts
        const statusChanged = lastKnownStatus !== null && lastKnownStatus !== stockResult.inStock;
        const becameAvailable = statusChanged && !lastKnownStatus && stockResult.inStock;
        
        if (becameAvailable) {
            console.log('🚨 Stock became available! Sending alert...');
            
            try {
                const alertResult = await sendStockAlert(config.PRODUCT_URL, 'Nintendo Switch 2');
                if (alertResult.success) {
                    console.log('📧 Stock alert sent successfully');
                } else {
                    console.error('❌ Failed to send stock alert:', alertResult.error);
                }
            } catch (emailError) {
                console.error('❌ Error sending stock alert:', emailError.message);
            }
        }
        
        // Update state
        lastKnownStatus = stockResult.inStock;
        
        console.log(`📊 Stock check complete - Status: ${stockResult.inStock ? 'In Stock' : 'Out of Stock'}`);
        
    } catch (error) {
        console.error('❌ Stock check failed:', error.message);
        
        // Log error
        try {
            logStockCheck({
                inStock: false,
                timestamp: new Date().toISOString(),
                error: error.message,
                url: config.PRODUCT_URL
            });
        } catch (logError) {
            console.error('❌ Failed to log error:', logError.message);
        }
    }
}

/**
 * Start stock monitoring with 30-minute intervals
 * @returns {Object} Result object with success status
 */
function startStockMonitoring() {
    if (isMonitoring) {
        return {
            success: false,
            message: 'Stock monitoring is already running'
        };
    }
    
    try {
        console.log('🚀 Starting stock monitoring...');
        console.log(`📍 Product URL: ${config.PRODUCT_URL}`);
        console.log('⏰ Schedule: Every 30 minutes');
        
        // Create cron task for every 30 minutes
        monitoringTask = cron.schedule('*/30 * * * *', performStockCheck, {
            scheduled: false
        });
        
        // Start the task
        monitoringTask.start();
        isMonitoring = true;
        
        console.log('✅ Stock monitoring started');
        
        // Run initial check
        setImmediate(performStockCheck);
        
        return {
            success: true,
            message: 'Stock monitoring started successfully'
        };
        
    } catch (error) {
        console.error('❌ Failed to start monitoring:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Stop stock monitoring
 * @returns {Object} Result object with success status
 */
function stopStockMonitoring() {
    if (!isMonitoring) {
        return {
            success: false,
            message: 'Stock monitoring is not running'
        };
    }
    
    try {
        console.log('🛑 Stopping stock monitoring...');
        
        if (monitoringTask) {
            monitoringTask.stop();
            monitoringTask.destroy();
            monitoringTask = null;
        }
        
        isMonitoring = false;
        console.log('✅ Stock monitoring stopped');
        
        return {
            success: true,
            message: 'Stock monitoring stopped successfully'
        };
        
    } catch (error) {
        console.error('❌ Failed to stop monitoring:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    startStockMonitoring,
    stopStockMonitoring
}; 