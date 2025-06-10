/**
 * Stock Check Scheduler for Nintendo Switch 2 Stock Monitor
 * Runs stock checks every 30 minutes and sends alerts when stock becomes available
 * Also handles daily summary emails at midnight
 * Uses integrated workflow functions from main application
 */

const cron = require('node-cron');

// State management for stock monitoring
let monitoringTask = null;
let isMonitoring = false;
let performStockCheckFn = null;

// State management for daily summaries
let dailySummaryTask = null;
let isDailySummaryRunning = false;
let performDailySummaryFn = null;

/**
 * Wrapper for scheduled stock check using integrated workflow
 */
async function scheduledStockCheck() {
    if (!performStockCheckFn) {
        console.error('❌ Stock check function not available');
        return;
    }
    
    try {
        console.log('⏰ Scheduled stock check triggered');
        const result = await performStockCheckFn();
        console.log(`🎯 Scheduled check result: ${result.summary}`);
    } catch (error) {
        console.error('❌ Scheduled stock check failed:', error.message);
    }
}

/**
 * Start stock monitoring with 30-minute intervals
 * @param {Function} stockCheckFunction - Integrated stock check function from main app
 * @returns {Object} Result object with success status
 */
function startStockMonitoring(stockCheckFunction) {
    if (isMonitoring) {
        return {
            success: false,
            message: 'Stock monitoring is already running'
        };
    }
    
    if (!stockCheckFunction) {
        return {
            success: false,
            message: 'Stock check function is required'
        };
    }
    
    try {
        console.log('🚀 Starting stock monitoring...');
        console.log('⏰ Schedule: Every 30 minutes');
        
        // Store the integrated function
        performStockCheckFn = stockCheckFunction;
        
        // Create cron task for every 30 minutes
        monitoringTask = cron.schedule('*/30 * * * *', scheduledStockCheck, {
            scheduled: false
        });
        
        // Start the task
        monitoringTask.start();
        isMonitoring = true;
        
        console.log('✅ Stock monitoring started');
        
        // Run initial check
        setImmediate(scheduledStockCheck);
        
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
        
        // Clear stored function
        performStockCheckFn = null;
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
 * Wrapper for scheduled daily summary using integrated workflow
 */
async function scheduledDailySummary() {
    if (!performDailySummaryFn) {
        console.error('❌ Daily summary function not available');
        return;
    }
    
    try {
        console.log('⏰ Scheduled daily summary triggered');
        const result = await performDailySummaryFn();
        console.log(`🎯 Daily summary result: ${result.summary}`);
    } catch (error) {
        console.error('❌ Scheduled daily summary failed:', error.message);
    }
}

/**
 * Start daily summary emails at midnight
 * @param {Function} dailySummaryFunction - Integrated daily summary function from main app
 * @returns {Object} Result object with success status
 */
function startDailySummary(dailySummaryFunction) {
    if (isDailySummaryRunning) {
        return {
            success: false,
            message: 'Daily summary is already running'
        };
    }
    
    if (!dailySummaryFunction) {
        return {
            success: false,
            message: 'Daily summary function is required'
        };
    }
    
    try {
        console.log('🌙 Starting daily summary scheduler...');
        console.log('⏰ Schedule: Daily at midnight (00:00)');
        
        // Store the integrated function
        performDailySummaryFn = dailySummaryFunction;
        
        // Create cron task for midnight daily
        dailySummaryTask = cron.schedule('0 0 * * *', scheduledDailySummary, {
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
        
        // Clear stored function
        performDailySummaryFn = null;
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