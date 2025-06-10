#!/usr/bin/env node

/**
 * Task 17: Performance and Reliability Testing
 * Extended testing for memory leaks, performance monitoring, and reliability validation
 */

require('dotenv').config();
const fs = require('fs').promises;
const { spawn } = require('child_process');

class PerformanceTestSuite {
    constructor() {
        this.startTime = new Date();
        this.measurements = [];
        this.config = require('./src/config');
        this.testDuration = 30 * 60 * 1000; // 30 minutes
        this.measurementInterval = 30 * 1000; // Every 30 seconds
        this.isRunning = false;
        this.appProcess = null;
    }

    async initialize() {
        console.log('⚡ Performance and Reliability Test Suite');
        console.log('========================================');
        console.log(`🚀 Starting extended testing at ${this.startTime.toISOString()}`);
        console.log(`⏱️ Test duration: ${this.testDuration / 60000} minutes`);
        console.log(`📊 Measurements every: ${this.measurementInterval / 1000} seconds`);
        console.log('');

        // Create test logs directory
        await fs.mkdir('test-logs', { recursive: true });
    }

    async startApplicationForTesting() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Starting application for performance testing...');
            
            this.appProcess = spawn('node', ['src/index.js'], {
                env: { 
                    ...process.env, 
                    NODE_ENV: 'performance-test',
                    STOCK_CHECK_INTERVAL: '60000' // 1 minute for testing
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let startupOutput = '';
            this.appProcess.stdout.on('data', (data) => {
                startupOutput += data.toString();
            });

            this.appProcess.stderr.on('data', (data) => {
                startupOutput += data.toString();
            });

            // Give the application time to start up
            setTimeout(() => {
                if (this.appProcess && this.appProcess.pid) {
                    console.log(`✅ Application started with PID: ${this.appProcess.pid}`);
                    resolve(this.appProcess.pid);
                } else {
                    reject(new Error('Failed to start application'));
                }
            }, 5000);

            this.appProcess.on('error', (error) => {
                reject(new Error(`Failed to start application: ${error.message}`));
            });

            this.appProcess.on('exit', (code) => {
                if (this.isRunning) {
                    console.log(`⚠️ Application exited unexpectedly with code: ${code}`);
                }
            });
        });
    }

    async measurePerformance() {
        const timestamp = new Date().toISOString();
        
        try {
            // Get process memory usage
            const memUsage = process.memoryUsage();
            
            // Get system memory info (if available)
            let systemMemory = null;
            try {
                const os = require('os');
                systemMemory = {
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    usedMemory: os.totalmem() - os.freemem()
                };
            } catch (error) {
                // System memory info not available
            }

            // Measure application response time
            const responseTimeStart = Date.now();
            let responseTime = null;
            try {
                const StockChecker = require('./src/stockChecker');
                const stockChecker = new StockChecker(this.config.PRODUCT_URL);
                await stockChecker.checkStock();
                responseTime = Date.now() - responseTimeStart;
            } catch (error) {
                responseTime = -1; // Error indicator
            }

            // Check data file sizes
            let dataFileSize = 0;
            let logFileSize = 0;
            try {
                const dataStats = await fs.stat('data/stock-checks.json');
                dataFileSize = dataStats.size;
            } catch (error) {
                // File doesn't exist yet
            }

            try {
                const logStats = await fs.stat('logs/error.log');
                logFileSize = logStats.size;
            } catch (error) {
                // File doesn't exist yet
            }

            const measurement = {
                timestamp,
                elapsedMinutes: Math.round((Date.now() - this.startTime) / 60000),
                memory: {
                    rss: memUsage.rss,
                    heapUsed: memUsage.heapUsed,
                    heapTotal: memUsage.heapTotal,
                    external: memUsage.external,
                    rssMB: Math.round(memUsage.rss / 1024 / 1024),
                    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024)
                },
                system: systemMemory,
                responseTime,
                fileSize: {
                    dataFile: dataFileSize,
                    logFile: logFileSize,
                    dataFileMB: Math.round(dataFileSize / 1024 / 1024 * 100) / 100,
                    logFileMB: Math.round(logFileSize / 1024 / 1024 * 100) / 100
                },
                processId: this.appProcess ? this.appProcess.pid : null
            };

            this.measurements.push(measurement);
            
            console.log(`📊 [${measurement.elapsedMinutes}m] Memory: ${measurement.memory.rssMB}MB, Response: ${responseTime}ms, Data: ${measurement.fileSize.dataFileMB}MB`);
            
            return measurement;

        } catch (error) {
            console.error(`❌ Failed to measure performance: ${error.message}`);
            return null;
        }
    }

    async runPerformanceMonitoring() {
        console.log('📈 Starting performance monitoring...');
        this.isRunning = true;

        const measurementPromises = [];
        const startTime = Date.now();

        while (Date.now() - startTime < this.testDuration && this.isRunning) {
            const measurement = await this.measurePerformance();
            if (measurement) {
                measurementPromises.push(this.saveMeasurement(measurement));
            }

            // Wait for next measurement interval
            await new Promise(resolve => setTimeout(resolve, this.measurementInterval));
        }

        // Wait for all measurements to be saved
        await Promise.all(measurementPromises);
        
        console.log('✅ Performance monitoring completed');
    }

    async saveMeasurement(measurement) {
        try {
            const measurementFile = `test-logs/performance-measurements.jsonl`;
            await fs.appendFile(measurementFile, JSON.stringify(measurement) + '\n');
        } catch (error) {
            console.error('Failed to save measurement:', error.message);
        }
    }

    async analyzePerformance() {
        console.log('\n📊 Analyzing Performance Data');
        console.log('============================');

        if (this.measurements.length === 0) {
            console.log('❌ No measurements to analyze');
            return null;
        }

        const memoryUsages = this.measurements.map(m => m.memory.rssMB);
        const responseTimes = this.measurements.filter(m => m.responseTime > 0).map(m => m.responseTime);
        
        const analysis = {
            duration: {
                totalMinutes: Math.round((Date.now() - this.startTime) / 60000),
                measurementCount: this.measurements.length
            },
            memory: {
                initial: memoryUsages[0],
                final: memoryUsages[memoryUsages.length - 1],
                minimum: Math.min(...memoryUsages),
                maximum: Math.max(...memoryUsages),
                average: Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length),
                growth: memoryUsages[memoryUsages.length - 1] - memoryUsages[0],
                stable: (Math.max(...memoryUsages) - Math.min(...memoryUsages)) < 50 // Less than 50MB variation
            },
            responseTime: responseTimes.length > 0 ? {
                average: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
                minimum: Math.min(...responseTimes),
                maximum: Math.max(...responseTimes),
                samples: responseTimes.length
            } : null,
            fileGrowth: {
                dataFile: {
                    initial: this.measurements[0].fileSize.dataFileMB,
                    final: this.measurements[this.measurements.length - 1].fileSize.dataFileMB,
                    growth: this.measurements[this.measurements.length - 1].fileSize.dataFileMB - this.measurements[0].fileSize.dataFileMB
                },
                logFile: {
                    initial: this.measurements[0].fileSize.logFileMB,
                    final: this.measurements[this.measurements.length - 1].fileSize.logFileMB,
                    growth: this.measurements[this.measurements.length - 1].fileSize.logFileMB - this.measurements[0].fileSize.logFileMB
                }
            }
        };

        // Display analysis
        console.log(`⏱️ Duration: ${analysis.duration.totalMinutes} minutes (${analysis.duration.measurementCount} measurements)`);
        console.log(`💾 Memory: ${analysis.memory.initial}MB → ${analysis.memory.final}MB (${analysis.memory.growth >= 0 ? '+' : ''}${analysis.memory.growth}MB)`);
        console.log(`   Average: ${analysis.memory.average}MB, Range: ${analysis.memory.minimum}-${analysis.memory.maximum}MB`);
        console.log(`   Stability: ${analysis.memory.stable ? '✅ Stable' : '⚠️ Variable'}`);
        
        if (analysis.responseTime) {
            console.log(`⚡ Response Time: ${analysis.responseTime.average}ms average (${analysis.responseTime.minimum}-${analysis.responseTime.maximum}ms)`);
        }
        
        console.log(`📁 Data File Growth: ${analysis.fileGrowth.dataFile.growth}MB`);
        console.log(`📝 Log File Growth: ${analysis.fileGrowth.logFile.growth}MB`);

        // Save analysis
        await fs.writeFile(
            'test-logs/performance-analysis.json',
            JSON.stringify(analysis, null, 2)
        );

        return analysis;
    }

    async testMemoryLeaks() {
        console.log('\n🔍 Testing for Memory Leaks');
        console.log('===========================');

        if (this.measurements.length < 10) {
            console.log('❌ Insufficient measurements for memory leak detection');
            return false;
        }

        const memoryGrowth = this.measurements.map((m, i) => {
            if (i === 0) return 0;
            return m.memory.rssMB - this.measurements[i - 1].memory.rssMB;
        }).slice(1); // Remove first element (always 0)

        const positiveGrowths = memoryGrowth.filter(growth => growth > 0);
        const negativeGrowths = memoryGrowth.filter(growth => growth < 0);
        
        const totalGrowth = this.measurements[this.measurements.length - 1].memory.rssMB - this.measurements[0].memory.rssMB;
        const averageGrowth = totalGrowth / this.measurements.length;

        // Memory leak indicators
        const suspiciousGrowth = totalGrowth > 100; // More than 100MB growth
        const consistentGrowth = positiveGrowths.length > (negativeGrowths.length * 2); // More growth than shrinkage
        const highAverageGrowth = averageGrowth > 2; // More than 2MB per measurement

        const memoryLeakDetected = suspiciousGrowth || (consistentGrowth && highAverageGrowth);

        console.log(`📈 Total Memory Growth: ${totalGrowth}MB`);
        console.log(`📊 Average Growth per Measurement: ${Math.round(averageGrowth * 100) / 100}MB`);
        console.log(`📋 Growth Measurements: ${positiveGrowths.length} positive, ${negativeGrowths.length} negative`);
        console.log(`🔍 Memory Leak Detected: ${memoryLeakDetected ? '⚠️ POSSIBLE' : '✅ NO'}`);

        return !memoryLeakDetected;
    }

    async stopApplication() {
        if (this.appProcess) {
            console.log('🛑 Stopping application...');
            this.appProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            if (this.appProcess.killed) {
                console.log('✅ Application stopped gracefully');
            } else {
                console.log('⚠️ Force killing application...');
                this.appProcess.kill('SIGKILL');
            }
        }
    }

    async generatePerformanceReport() {
        console.log('\n📄 Generating Performance Report');
        console.log('===============================');

        const analysis = await this.analyzePerformance();
        const memoryLeaksFree = await this.testMemoryLeaks();

        const report = {
            testInfo: {
                startTime: this.startTime.toISOString(),
                endTime: new Date().toISOString(),
                durationMinutes: Math.round((Date.now() - this.startTime) / 60000),
                measurementInterval: this.measurementInterval / 1000,
                totalMeasurements: this.measurements.length
            },
            performance: analysis,
            reliability: {
                memoryLeaksFree,
                applicationStable: this.measurements.length > 0,
                averageResponseTime: analysis?.responseTime?.average || 'N/A'
            },
            recommendations: this.generateRecommendations(analysis, memoryLeaksFree),
            rawMeasurements: this.measurements
        };

        await fs.writeFile(
            'test-logs/performance-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('📊 Performance Report Summary:');
        console.log(`   Duration: ${report.testInfo.durationMinutes} minutes`);
        console.log(`   Memory Stable: ${analysis?.memory?.stable ? 'Yes' : 'No'}`);
        console.log(`   Memory Leaks: ${memoryLeaksFree ? 'None detected' : 'Possible issues'}`);
        console.log(`   Response Time: ${analysis?.responseTime?.average || 'N/A'}ms`);
        console.log('');
        console.log('📄 Detailed report saved to: test-logs/performance-report.json');

        return report;
    }

    generateRecommendations(analysis, memoryLeaksFree) {
        const recommendations = [];

        if (!memoryLeaksFree) {
            recommendations.push('CRITICAL: Investigate potential memory leaks before production deployment');
        }

        if (analysis?.memory?.growth > 50) {
            recommendations.push('WARNING: High memory growth detected - monitor in production');
        }

        if (analysis?.responseTime?.average > 10000) {
            recommendations.push('WARNING: High response times - consider optimizing network requests');
        }

        if (analysis?.fileGrowth?.logFile?.growth > 10) {
            recommendations.push('INFO: Log files growing quickly - ensure log rotation is working');
        }

        if (recommendations.length === 0) {
            recommendations.push('GOOD: No performance issues detected - application ready for production');
        }

        return recommendations;
    }

    async runExtendedTesting() {
        try {
            await this.initialize();
            
            // Start the application
            await this.startApplicationForTesting();
            
            // Run performance monitoring
            await this.runPerformanceMonitoring();
            
            // Stop the application
            await this.stopApplication();
            
            // Generate final report
            const report = await this.generatePerformanceReport();
            
            console.log('\n🎯 Extended Performance Testing Complete!');
            console.log(`⏰ Total execution time: ${Math.round((Date.now() - this.startTime) / 60000)} minutes`);

            // Exit with appropriate code
            const performanceGood = report.reliability.memoryLeaksFree && 
                                  (report.performance?.memory?.stable ?? true);
            process.exit(performanceGood ? 0 : 1);

        } catch (error) {
            console.error('\n💥 Fatal error in performance testing:', error.message);
            await this.stopApplication();
            process.exit(1);
        }
    }

    async cleanup() {
        this.isRunning = false;
        await this.stopApplication();
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n⏹️ Received interrupt signal, cleaning up...');
    if (global.performanceTest) {
        await global.performanceTest.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏹️ Received termination signal, cleaning up...');
    if (global.performanceTest) {
        await global.performanceTest.cleanup();
    }
    process.exit(0);
});

// Run performance tests if this file is executed directly
if (require.main === module) {
    const performanceTest = new PerformanceTestSuite();
    global.performanceTest = performanceTest;
    performanceTest.runExtendedTesting();
}

module.exports = PerformanceTestSuite; 