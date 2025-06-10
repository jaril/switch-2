/**
 * Error Handler and Resilience Utilities for Nintendo Switch 2 Stock Monitor
 * Provides retry logic, circuit breakers, error logging, and resilience patterns
 */

const fs = require('fs');
const path = require('path');

// Error logging configuration
const ERROR_LOG_DIR = path.join(__dirname, '..', 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'error.log');
const ERROR_SUMMARY_FILE = path.join(ERROR_LOG_DIR, 'error-summary.json');

// Error categories
const ERROR_CATEGORIES = {
    NETWORK: 'network',
    EMAIL: 'email',
    DATA: 'data',
    APPLICATION: 'application',
    VALIDATION: 'validation'
};

// Circuit breaker states
const CIRCUIT_STATES = {
    CLOSED: 'closed',
    OPEN: 'open',
    HALF_OPEN: 'half_open'
};

/**
 * Initialize error logging directory and files
 */
function initializeErrorLogging() {
    try {
        if (!fs.existsSync(ERROR_LOG_DIR)) {
            fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
        }
        
        if (!fs.existsSync(ERROR_SUMMARY_FILE)) {
            const initialSummary = {
                initialized: new Date().toISOString(),
                dailyStats: {},
                totalErrors: 0,
                categoryCounts: {
                    network: 0,
                    email: 0,
                    data: 0,
                    application: 0,
                    validation: 0
                }
            };
            fs.writeFileSync(ERROR_SUMMARY_FILE, JSON.stringify(initialSummary, null, 2));
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to initialize error logging:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Log error to file and update summary statistics
 * @param {Error|string} error - Error object or message
 * @param {string} category - Error category
 * @param {string} context - Context where error occurred
 * @param {Object} metadata - Additional metadata
 */
function logError(error, category = ERROR_CATEGORIES.APPLICATION, context = 'unknown', metadata = {}) {
    try {
        initializeErrorLogging();
        
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';
        
        // Create error log entry
        const logEntry = {
            timestamp,
            category,
            context,
            message: errorMessage,
            stack,
            metadata
        };
        
        // Write to error log file
        const logLine = `[${timestamp}] [${category.toUpperCase()}] [${context}] ${errorMessage}\n${stack ? `Stack: ${stack}\n` : ''}Metadata: ${JSON.stringify(metadata)}\n${'='.repeat(80)}\n`;
        fs.appendFileSync(ERROR_LOG_FILE, logLine);
        
        // Update error summary
        updateErrorSummary(category, timestamp);
        
        console.error(`🚨 Error logged: [${category}] ${errorMessage}`);
        
    } catch (loggingError) {
        console.error('❌ Failed to log error:', loggingError.message);
    }
}

/**
 * Update error summary statistics
 * @param {string} category - Error category
 * @param {string} timestamp - Error timestamp
 */
function updateErrorSummary(category, timestamp) {
    try {
        let summary = {};
        
        if (fs.existsSync(ERROR_SUMMARY_FILE)) {
            summary = JSON.parse(fs.readFileSync(ERROR_SUMMARY_FILE, 'utf8'));
        }
        
        // Initialize if needed
        if (!summary.categoryCounts) {
            summary.categoryCounts = Object.keys(ERROR_CATEGORIES).reduce((acc, key) => {
                acc[ERROR_CATEGORIES[key]] = 0;
                return acc;
            }, {});
        }
        
        if (!summary.dailyStats) {
            summary.dailyStats = {};
        }
        
        // Update counts
        summary.totalErrors = (summary.totalErrors || 0) + 1;
        summary.categoryCounts[category] = (summary.categoryCounts[category] || 0) + 1;
        
        // Update daily stats
        const date = timestamp.split('T')[0];
        if (!summary.dailyStats[date]) {
            summary.dailyStats[date] = {
                total: 0,
                categories: {}
            };
        }
        summary.dailyStats[date].total++;
        summary.dailyStats[date].categories[category] = (summary.dailyStats[date].categories[category] || 0) + 1;
        summary.lastUpdated = timestamp;
        
        fs.writeFileSync(ERROR_SUMMARY_FILE, JSON.stringify(summary, null, 2));
        
    } catch (error) {
        console.error('❌ Failed to update error summary:', error.message);
    }
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} Result of the operation
 */
async function retryWithBackoff(operation, options = {}) {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
        context = 'unknown',
        category = ERROR_CATEGORIES.APPLICATION
    } = options;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await operation();
            
            if (attempt > 1) {
                console.log(`✅ Operation succeeded on attempt ${attempt}/${maxAttempts}`);
            }
            
            return result;
            
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                logError(error, category, `${context} - final attempt ${attempt}`, {
                    maxAttempts,
                    finalAttempt: true
                });
                break;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
            
            console.log(`⚠️ Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
            console.log(`🔄 Retrying in ${delay}ms...`);
            
            logError(error, category, `${context} - attempt ${attempt}`, {
                attempt,
                maxAttempts,
                nextRetryDelay: delay,
                willRetry: true
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'unknown';
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000; // 1 minute
        this.monitoringPeriod = options.monitoringPeriod || 30000; // 30 seconds
        
        this.state = CIRCUIT_STATES.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        this.successCount = 0;
        this.totalRequests = 0;
        
        console.log(`🔧 Circuit breaker initialized: ${this.name}`);
    }
    
    /**
     * Execute operation through circuit breaker
     * @param {Function} operation - Async operation to execute
     * @returns {Promise<any>} Result of the operation
     */
    async execute(operation) {
        this.totalRequests++;
        
        // Check if circuit is open
        if (this.state === CIRCUIT_STATES.OPEN) {
            if (Date.now() > this.nextAttemptTime) {
                console.log(`🔄 Circuit breaker ${this.name}: transitioning to HALF_OPEN`);
                this.state = CIRCUIT_STATES.HALF_OPEN;
            } else {
                const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
                const error = new Error(`Circuit breaker ${this.name} is OPEN. Try again in ${waitTime}s`);
                logError(error, ERROR_CATEGORIES.APPLICATION, `circuit-breaker-${this.name}`, {
                    state: this.state,
                    failureCount: this.failureCount,
                    waitTime
                });
                throw error;
            }
        }
        
        try {
            const result = await operation();
            
            // Operation succeeded
            this.onSuccess();
            return result;
            
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    /**
     * Handle successful operation
     */
    onSuccess() {
        this.successCount++;
        
        if (this.state === CIRCUIT_STATES.HALF_OPEN) {
            console.log(`✅ Circuit breaker ${this.name}: transitioning to CLOSED`);
            this.reset();
        }
        
        // Reset failure count on success
        this.failureCount = 0;
    }
    
    /**
     * Handle failed operation
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            console.log(`🚨 Circuit breaker ${this.name}: transitioning to OPEN (${this.failureCount} failures)`);
            this.state = CIRCUIT_STATES.OPEN;
            this.nextAttemptTime = Date.now() + this.timeout;
            
            logError(
                new Error(`Circuit breaker opened after ${this.failureCount} failures`),
                ERROR_CATEGORIES.APPLICATION,
                `circuit-breaker-${this.name}`,
                {
                    failureThreshold: this.failureThreshold,
                    timeout: this.timeout,
                    nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
                }
            );
        }
    }
    
    /**
     * Reset circuit breaker to closed state
     */
    reset() {
        this.state = CIRCUIT_STATES.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            failureRate: this.totalRequests > 0 ? (this.failureCount / this.totalRequests * 100).toFixed(2) + '%' : '0%',
            lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
            nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null
        };
    }
}

/**
 * Email queue for handling failed email attempts
 */
class EmailQueue {
    constructor(options = {}) {
        this.maxQueueSize = options.maxQueueSize || 100;
        this.retryDelay = options.retryDelay || 300000; // 5 minutes
        this.queue = [];
        this.processing = false;
        
        console.log('📬 Email queue initialized');
    }
    
    /**
     * Add email to queue
     * @param {Object} emailData - Email data object
     */
    enqueue(emailData) {
        if (this.queue.length >= this.maxQueueSize) {
            console.warn(`⚠️ Email queue full (${this.maxQueueSize}), removing oldest email`);
            this.queue.shift();
        }
        
        const queueItem = {
            ...emailData,
            queuedAt: Date.now(),
            attempts: 0,
            maxAttempts: 3
        };
        
        this.queue.push(queueItem);
        console.log(`📬 Email queued: ${emailData.subject} (Queue size: ${this.queue.length})`);
        
        // Start processing if not already running
        if (!this.processing) {
            this.processQueue();
        }
    }
    
    /**
     * Process queued emails
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        console.log(`🔄 Processing email queue (${this.queue.length} items)`);
        
        while (this.queue.length > 0) {
            const emailItem = this.queue[0];
            
            try {
                // Try to send email (this will be provided by the caller)
                if (emailItem.sendFunction) {
                    await emailItem.sendFunction();
                    console.log(`✅ Queued email sent: ${emailItem.subject}`);
                    this.queue.shift(); // Remove from queue on success
                } else {
                    console.warn('⚠️ Email item missing send function, removing from queue');
                    this.queue.shift();
                }
                
            } catch (error) {
                emailItem.attempts++;
                
                if (emailItem.attempts >= emailItem.maxAttempts) {
                    console.error(`❌ Email permanently failed after ${emailItem.attempts} attempts: ${emailItem.subject}`);
                    logError(error, ERROR_CATEGORIES.EMAIL, 'email-queue-permanent-failure', {
                        subject: emailItem.subject,
                        attempts: emailItem.attempts,
                        queuedAt: new Date(emailItem.queuedAt).toISOString()
                    });
                    this.queue.shift(); // Remove failed email
                } else {
                    console.log(`⚠️ Email attempt ${emailItem.attempts}/${emailItem.maxAttempts} failed: ${emailItem.subject}`);
                    // Move to end of queue for retry
                    this.queue.push(this.queue.shift());
                }
            }
            
            // Small delay between processing
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.processing = false;
        console.log('✅ Email queue processing completed');
    }
    
    /**
     * Get queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            maxQueueSize: this.maxQueueSize,
            items: this.queue.map(item => ({
                subject: item.subject,
                queuedAt: new Date(item.queuedAt).toISOString(),
                attempts: item.attempts,
                maxAttempts: item.maxAttempts
            }))
        };
    }
}

/**
 * Health check for application components
 */
class HealthChecker {
    constructor() {
        this.checks = new Map();
        this.lastCheckTime = null;
        this.overallHealth = 'unknown';
        
        console.log('🏥 Health checker initialized');
    }
    
    /**
     * Register a health check
     * @param {string} name - Check name
     * @param {Function} checkFunction - Async function that returns health status
     * @param {Object} options - Check options
     */
    registerCheck(name, checkFunction, options = {}) {
        this.checks.set(name, {
            name,
            checkFunction,
            timeout: options.timeout || 5000,
            lastResult: null,
            lastCheckTime: null
        });
        
        console.log(`🏥 Health check registered: ${name}`);
    }
    
    /**
     * Run all health checks
     * @returns {Promise<Object>} Health check results
     */
    async runChecks() {
        const results = {};
        const startTime = Date.now();
        
        console.log('🏥 Running health checks...');
        
        for (const [name, check] of this.checks) {
            try {
                const checkStartTime = Date.now();
                
                // Run check with timeout
                const result = await Promise.race([
                    check.checkFunction(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
                    )
                ]);
                
                const duration = Date.now() - checkStartTime;
                
                results[name] = {
                    status: 'healthy',
                    duration,
                    result,
                    lastCheck: new Date().toISOString()
                };
                
                check.lastResult = results[name];
                check.lastCheckTime = Date.now();
                
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message,
                    lastCheck: new Date().toISOString()
                };
                
                check.lastResult = results[name];
                check.lastCheckTime = Date.now();
                
                logError(error, ERROR_CATEGORIES.APPLICATION, `health-check-${name}`, {
                    checkName: name,
                    timeout: check.timeout
                });
            }
        }
        
        // Determine overall health
        const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
        const totalCount = Object.keys(results).length;
        
        this.overallHealth = healthyCount === totalCount ? 'healthy' : 
                           healthyCount > 0 ? 'degraded' : 'unhealthy';
        
        this.lastCheckTime = Date.now();
        
        const totalDuration = Date.now() - startTime;
        
        console.log(`🏥 Health checks completed in ${totalDuration}ms - Overall: ${this.overallHealth}`);
        
        return {
            overall: this.overallHealth,
            totalDuration,
            totalChecks: totalCount,
            healthyChecks: healthyCount,
            timestamp: new Date().toISOString(),
            checks: results
        };
    }
    
    /**
     * Get health status
     */
    getStatus() {
        return {
            overallHealth: this.overallHealth,
            lastCheckTime: this.lastCheckTime ? new Date(this.lastCheckTime).toISOString() : null,
            registeredChecks: Array.from(this.checks.keys()),
            totalChecks: this.checks.size
        };
    }
}

/**
 * Log rotation and cleanup utilities
 */
class LogRotator {
    constructor(options = {}) {
        this.maxDays = options.maxDays || 30;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.logDir = options.logDir || ERROR_LOG_DIR;
        
        console.log(`🔄 Log rotator initialized (max ${this.maxDays} days, ${this.maxFileSize} bytes)`);
    }
    
    /**
     * Rotate logs if needed
     */
    async rotateLogs() {
        try {
            console.log('🔄 Checking if log rotation is needed...');
            
            // Check error log file size
            if (fs.existsSync(ERROR_LOG_FILE)) {
                const stats = fs.statSync(ERROR_LOG_FILE);
                
                if (stats.size > this.maxFileSize) {
                    console.log(`🔄 Rotating error log (${stats.size} bytes > ${this.maxFileSize} bytes)`);
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const rotatedFile = path.join(this.logDir, `error-${timestamp}.log`);
                    
                    fs.renameSync(ERROR_LOG_FILE, rotatedFile);
                    fs.writeFileSync(ERROR_LOG_FILE, '');
                    
                    console.log(`✅ Error log rotated to: ${rotatedFile}`);
                }
            }
            
            // Clean up old log files
            await this.cleanupOldLogs();
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'log-rotation');
        }
    }
    
    /**
     * Clean up old log files
     */
    async cleanupOldLogs() {
        try {
            if (!fs.existsSync(this.logDir)) {
                return;
            }
            
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = Date.now() - (this.maxDays * 24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (file.startsWith('error-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime.getTime() < cutoffDate) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old log file: ${file}`);
                    }
                }
            }
            
            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} old log files`);
            }
            
        } catch (error) {
            logError(error, ERROR_CATEGORIES.APPLICATION, 'log-cleanup');
        }
    }
}

/**
 * Generate daily error summary
 */
async function generateDailyErrorSummary() {
    try {
        console.log('📊 Generating daily error summary...');
        
        if (!fs.existsSync(ERROR_SUMMARY_FILE)) {
            console.log('ℹ️ No error summary file found');
            return;
        }
        
        const summary = JSON.parse(fs.readFileSync(ERROR_SUMMARY_FILE, 'utf8'));
        const today = new Date().toISOString().split('T')[0];
        const todayStats = summary.dailyStats[today] || { total: 0, categories: {} };
        
        const summaryLines = [
            `📊 Daily Error Summary - ${today}`,
            `Total Errors Today: ${todayStats.total}`,
            `Categories:`
        ];
        
        for (const [category, count] of Object.entries(todayStats.categories || {})) {
            summaryLines.push(`  • ${category}: ${count}`);
        }
        
        summaryLines.push(`Overall Total Errors: ${summary.totalErrors || 0}`);
        summaryLines.push(`Last Updated: ${summary.lastUpdated || 'never'}`);
        
        const summaryText = summaryLines.join('\n');
        console.log(summaryText);
        
        // Write daily summary to log
        const dailySummaryFile = path.join(ERROR_LOG_DIR, `daily-summary-${today}.txt`);
        fs.writeFileSync(dailySummaryFile, summaryText);
        
        return {
            date: today,
            stats: todayStats,
            overallTotal: summary.totalErrors || 0,
            summary: summaryText
        };
        
    } catch (error) {
        logError(error, ERROR_CATEGORIES.APPLICATION, 'daily-error-summary');
        return null;
    }
}

module.exports = {
    // Error categories
    ERROR_CATEGORIES,
    CIRCUIT_STATES,
    
    // Core functions
    initializeErrorLogging,
    logError,
    retryWithBackoff,
    generateDailyErrorSummary,
    
    // Classes
    CircuitBreaker,
    EmailQueue,
    HealthChecker,
    LogRotator
}; 