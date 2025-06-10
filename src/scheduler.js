/**
 * Stock Check Scheduler for Nintendo Switch 2 Stock Monitor
 * Runs stock checks every 30 minutes and sends alerts when stock becomes available
 * Also handles daily summary emails at midnight
 */

const cron = require('node-cron');
const { checkStock } = require('./stockChecker.js');
const { logStockCheck, getLast24HourStats } = require('./dataLogger.js');
const { sendStockAlert, sendDailySummary } = require('./emailService.js');
const config = require('./config.js');

// State management for stock monitoring
let monitoringTask = null;
let lastKnownStatus = null;
let isMonitoring = false;

// State management for daily summaries
let dailySummaryTask = null;
let isDailySummaryRunning = false;

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

/**
 * Calculate yesterday's date in YYYY-MM-DD format
 * @returns {string} Yesterday's date
 */
function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Perform daily summary calculation and email sending
 */
async function performDailySummary() {
    try {
        const yesterdayDate = getYesterdayDate();
        console.log(`📊 Generating daily summary for ${yesterdayDate}...`);
        
        // Step 1: Calculate statistics for yesterday
        const statsResult = getLast24HourStats(yesterdayDate);
        
        if (!statsResult.success) {
            console.error('❌ Failed to get daily statistics:', statsResult.error);
            return;
        }
        
        const stats = statsResult.data;
        console.log(`📈 Yesterday's stats: ${stats.totalChecks} checks, ${stats.inStockCount} in stock, ${stats.statusChanges} changes`);
        
        // Step 2: Send daily summary email
        try {
            const summaryResult = await sendDailySummary(stats, yesterdayDate);
            
            if (summaryResult.success) {
                console.log('📧 Daily summary email sent successfully');
            } else {
                console.error('❌ Failed to send daily summary:', summaryResult.error);
            }
        } catch (emailError) {
            console.error('❌ Error sending daily summary:', emailError.message);
        }
        
    } catch (error) {
        console.error('❌ Daily summary failed:', error.message);
    }
}

/**
 * Start daily summary emails at midnight
 * @returns {Object} Result object with success status
 */
function startDailySummary() {
    if (isDailySummaryRunning) {
        return {
            success: false,
            message: 'Daily summary is already running'
        };
    }
    
    try {
        console.log('🌙 Starting daily summary scheduler...');
        console.log('⏰ Schedule: Daily at midnight (00:00)');
        
        // Create cron task for midnight daily
        dailySummaryTask = cron.schedule('0 0 * * *', performDailySummary, {
            scheduled: false,
            timezone: 'America/Los_Angeles' // Adjust timezone as needed
        });
        
        // Start the task
        dailySummaryTask.start();
        isDailySummaryRunning = true;
        
        console.log('✅ Daily summary scheduler started');
        
        return {
            success: true,
            message: 'Daily summary scheduler started successfully'
        };
        
    } catch (error) {
        console.error('❌ Failed to start daily summary:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Stop daily summary scheduler
 * @returns {Object} Result object with success status
 */
function stopDailySummary() {
    if (!isDailySummaryRunning) {
        return {
            success: false,
            message: 'Daily summary is not running'
        };
    }
    
    try {
        console.log('🛑 Stopping daily summary scheduler...');
        
        if (dailySummaryTask) {
            dailySummaryTask.stop();
            dailySummaryTask.destroy();
            dailySummaryTask = null;
        }
        
        isDailySummaryRunning = false;
        console.log('✅ Daily summary scheduler stopped');
        
        return {
            success: true,
            message: 'Daily summary scheduler stopped successfully'
        };
        
    } catch (error) {
        console.error('❌ Failed to stop daily summary:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    startStockMonitoring,
    stopStockMonitoring,
    startDailySummary,
    stopDailySummary
}; 