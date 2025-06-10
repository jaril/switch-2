#!/usr/bin/env node

/**
 * Task 17: Production Readiness Validation
 * Final validation that the application is ready for GitHub Actions deployment
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

class ProductionReadinessValidator {
    constructor() {
        this.startTime = new Date();
        this.validationResults = [];
        this.config = require('./src/config');
    }

    async initialize() {
        console.log('🔐 Production Readiness Validation Suite');
        console.log('=======================================');
        console.log(`🚀 Starting validation at ${this.startTime.toISOString()}`);
        console.log('');

        // Create validation logs directory
        await fs.mkdir('test-logs', { recursive: true });
    }

    async validateCheck(checkName, validationFunction) {
        console.log(`\n🔍 Validating: ${checkName}`);
        console.log('-'.repeat(50));
        
        const checkStart = Date.now();
        try {
            const result = await validationFunction();
            const duration = Date.now() - checkStart;
            
            this.validationResults.push({
                name: checkName,
                status: 'PASSED',
                duration,
                result
            });
            
            console.log(`✅ ${checkName} - PASSED (${duration}ms)`);
            return result;
        } catch (error) {
            const duration = Date.now() - checkStart;
            
            this.validationResults.push({
                name: checkName,
                status: 'FAILED',
                duration,
                error: error.message
            });
            
            console.log(`❌ ${checkName} - FAILED (${duration}ms): ${error.message}`);
            return null;
        }
    }

    async validateSecurityConfiguration() {
        return await this.validateCheck('Security Configuration', async () => {
            const checks = [];

            // Check for .env file security
            try {
                await fs.access('.env');
                checks.push({ check: '.env file exists', status: true });
            } catch (error) {
                checks.push({ check: '.env file exists', status: false, error: 'No .env file found' });
            }

            // Check .gitignore includes .env
            try {
                const gitignoreContent = await fs.readFile('.gitignore', 'utf8');
                const envIgnored = gitignoreContent.includes('.env');
                checks.push({ check: '.env in .gitignore', status: envIgnored });
            } catch (error) {
                checks.push({ check: '.env in .gitignore', status: false, error: 'No .gitignore file' });
            }

            // Check API key format
            const apiKeyValid = this.config.RESEND_API_KEY && this.config.RESEND_API_KEY.startsWith('re_');
            checks.push({ check: 'API key format valid', status: apiKeyValid });

            // Check email addresses format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const fromEmailValid = emailRegex.test(this.config.FROM_EMAIL || '');
            const toEmailValid = emailRegex.test(this.config.TO_EMAIL || '');
            checks.push({ check: 'FROM_EMAIL format valid', status: fromEmailValid });
            checks.push({ check: 'TO_EMAIL format valid', status: toEmailValid });

            // Check for hardcoded credentials in source files
            const sourceFiles = ['src/index.js', 'src/config.js', 'src/emailService.js'];
            let hardcodedCredentials = false;
            for (const file of sourceFiles) {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    if (content.includes('re_') && !content.includes('process.env')) {
                        hardcodedCredentials = true;
                        break;
                    }
                } catch (error) {
                    // File doesn't exist
                }
            }
            checks.push({ check: 'No hardcoded credentials', status: !hardcodedCredentials });

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`Security validation failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { securityChecks: checks, allPassed };
        });
    }

    async validateGitHubActionsCompatibility() {
        return await this.validateCheck('GitHub Actions Compatibility', async () => {
            const checks = [];

            // Check workflow file exists
            try {
                await fs.access('.github/workflows/stock-monitor.yml');
                checks.push({ check: 'Workflow file exists', status: true });
            } catch (error) {
                checks.push({ check: 'Workflow file exists', status: false });
            }

            // Check GitHub Actions scripts exist
            const githubScripts = [
                'src/github-stock-check.js',
                'src/github-daily-summary.js',
                'src/github-health-check.js',
                'src/github-notify-failure.js'
            ];

            for (const script of githubScripts) {
                try {
                    await fs.access(script);
                    checks.push({ check: `${script} exists`, status: true });
                } catch (error) {
                    checks.push({ check: `${script} exists`, status: false });
                }
            }

            // Check package.json has GitHub Actions scripts
            try {
                const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
                const requiredScripts = ['stock-check', 'daily-summary', 'health-check', 'notify-failure'];
                for (const script of requiredScripts) {
                    const scriptExists = packageJson.scripts && packageJson.scripts[script];
                    checks.push({ check: `npm script "${script}" exists`, status: !!scriptExists });
                }
            } catch (error) {
                checks.push({ check: 'package.json validation', status: false, error: error.message });
            }

            // Test GitHub Actions environment variable handling
            process.env.GITHUB_ACTIONS = 'true';
            try {
                const GitHubStockCheck = require('./src/github-stock-check');
                checks.push({ check: 'GitHub stock check loadable', status: true });
            } catch (error) {
                checks.push({ check: 'GitHub stock check loadable', status: false, error: error.message });
            } finally {
                delete process.env.GITHUB_ACTIONS;
            }

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`GitHub Actions compatibility failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { githubActionsChecks: checks, allPassed };
        });
    }

    async validateApplicationStability() {
        return await this.validateCheck('Application Stability', async () => {
            const checks = [];

            // Check all required modules can be loaded
            const requiredModules = [
                'src/index.js',
                'src/config.js',
                'src/stockChecker.js',
                'src/emailService.js',
                'src/dataLogger.js',
                'src/errorHandler.js',
                'src/scheduler.js'
            ];

            for (const module of requiredModules) {
                try {
                    require(`./${module}`);
                    checks.push({ check: `${module} loads correctly`, status: true });
                } catch (error) {
                    checks.push({ check: `${module} loads correctly`, status: false, error: error.message });
                }
            }

            // Check error handling module
            try {
                const errorHandler = require('./src/errorHandler');
                const initResult = errorHandler.initializeErrorLogging();
                checks.push({ check: 'Error handler initializes', status: initResult.success });
            } catch (error) {
                checks.push({ check: 'Error handler initializes', status: false, error: error.message });
            }

            // Check data logger functionality
            try {
                const dataLogger = require('./src/dataLogger');
                const testData = { inStock: false, timestamp: new Date().toISOString() };
                const logResult = dataLogger.logStockCheck(testData);
                checks.push({ check: 'Data logger functional', status: logResult.success });
            } catch (error) {
                checks.push({ check: 'Data logger functional', status: false, error: error.message });
            }

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`Application stability failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { stabilityChecks: checks, allPassed };
        });
    }

    async validateDocumentation() {
        return await this.validateCheck('Documentation Completeness', async () => {
            const checks = [];

            // Check required documentation files
            const requiredDocs = [
                'README.md',
                'SETUP.md',
                'CONFIGURATION.md',
                'RESEND-SETUP.md',
                'GITHUB-DEPLOYMENT.md',
                'TROUBLESHOOTING.md'
            ];

            for (const doc of requiredDocs) {
                try {
                    const stats = await fs.stat(doc);
                    const sizeKB = Math.round(stats.size / 1024);
                    checks.push({ 
                        check: `${doc} exists`, 
                        status: true, 
                        size: `${sizeKB}KB` 
                    });
                } catch (error) {
                    checks.push({ check: `${doc} exists`, status: false });
                }
            }

            // Check README is concise (should be under 200 lines after cleanup)
            try {
                const readmeContent = await fs.readFile('README.md', 'utf8');
                const lineCount = readmeContent.split('\n').length;
                const concise = lineCount < 200;
                checks.push({ 
                    check: 'README is concise', 
                    status: concise, 
                    lines: lineCount 
                });
            } catch (error) {
                checks.push({ check: 'README is concise', status: false });
            }

            // Check package.json has proper metadata
            try {
                const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
                const hasName = !!packageJson.name;
                const hasDescription = !!packageJson.description;
                const hasDependencies = !!packageJson.dependencies;
                checks.push({ check: 'package.json has name', status: hasName });
                checks.push({ check: 'package.json has description', status: hasDescription });
                checks.push({ check: 'package.json has dependencies', status: hasDependencies });
            } catch (error) {
                checks.push({ check: 'package.json validation', status: false });
            }

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`Documentation validation failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { documentationChecks: checks, allPassed };
        });
    }

    async validateProductionEnvironment() {
        return await this.validateCheck('Production Environment', async () => {
            const checks = [];

            // Check Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
            const nodeVersionOK = majorVersion >= 18;
            checks.push({ 
                check: 'Node.js version >= 18', 
                status: nodeVersionOK, 
                version: nodeVersion 
            });

            // Check required dependencies
            try {
                const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
                const requiredDeps = ['axios', 'cheerio', 'dotenv', 'node-cron', 'resend'];
                for (const dep of requiredDeps) {
                    const depExists = packageJson.dependencies && packageJson.dependencies[dep];
                    checks.push({ 
                        check: `Dependency ${dep} listed`, 
                        status: !!depExists,
                        version: depExists || 'missing'
                    });
                }
            } catch (error) {
                checks.push({ check: 'Dependencies validation', status: false });
            }

            // Check file structure
            const requiredDirs = ['src', 'data', 'logs'];
            for (const dir of requiredDirs) {
                try {
                    await fs.access(dir);
                    checks.push({ check: `Directory ${dir} exists`, status: true });
                } catch (error) {
                    // Try to create directory
                    try {
                        await fs.mkdir(dir, { recursive: true });
                        checks.push({ check: `Directory ${dir} exists`, status: true, created: true });
                    } catch (createError) {
                        checks.push({ check: `Directory ${dir} exists`, status: false });
                    }
                }
            }

            // Check .gitignore is properly configured
            try {
                const gitignoreContent = await fs.readFile('.gitignore', 'utf8');
                const importantIgnores = ['.env', 'node_modules/', 'logs/', '*.log'];
                for (const ignore of importantIgnores) {
                    const isIgnored = gitignoreContent.includes(ignore);
                    checks.push({ check: `${ignore} in .gitignore`, status: isIgnored });
                }
            } catch (error) {
                checks.push({ check: '.gitignore validation', status: false });
            }

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`Production environment failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { environmentChecks: checks, allPassed };
        });
    }

    async validateEmailConfiguration() {
        return await this.validateCheck('Email Configuration', async () => {
            const checks = [];

            // Check email service can be initialized
            try {
                const emailService = require('./src/emailService');
                const serviceInfo = emailService.getServiceInfo();
                checks.push({ check: 'Email service initializes', status: serviceInfo.clientInitialized });
            } catch (error) {
                checks.push({ check: 'Email service initializes', status: false, error: error.message });
            }

            // Validate email addresses
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            checks.push({ 
                check: 'FROM_EMAIL format valid', 
                status: emailRegex.test(this.config.FROM_EMAIL || ''),
                email: this.config.FROM_EMAIL
            });
            checks.push({ 
                check: 'TO_EMAIL format valid', 
                status: emailRegex.test(this.config.TO_EMAIL || ''),
                email: this.config.TO_EMAIL
            });

            // Check API key format
            const apiKeyValid = this.config.RESEND_API_KEY && this.config.RESEND_API_KEY.startsWith('re_');
            checks.push({ 
                check: 'Resend API key format', 
                status: apiKeyValid,
                format: this.config.RESEND_API_KEY ? 'valid' : 'missing'
            });

            // Check emails are different (to avoid self-sending)
            const emailsDifferent = this.config.FROM_EMAIL !== this.config.TO_EMAIL;
            checks.push({ 
                check: 'FROM_EMAIL != TO_EMAIL', 
                status: emailsDifferent 
            });

            const allPassed = checks.every(check => check.status);
            if (!allPassed) {
                const failedChecks = checks.filter(check => !check.status);
                throw new Error(`Email configuration failed: ${failedChecks.map(c => c.check).join(', ')}`);
            }

            return { emailChecks: checks, allPassed };
        });
    }

    async generateReadinessReport() {
        console.log('\n📊 Generating Production Readiness Report');
        console.log('========================================');

        const endTime = new Date();
        const totalDuration = endTime - this.startTime;
        
        const passedValidations = this.validationResults.filter(check => check.status === 'PASSED');
        const failedValidations = this.validationResults.filter(check => check.status === 'FAILED');
        
        const readinessScore = Math.round((passedValidations.length / this.validationResults.length) * 100);
        const productionReady = failedValidations.length === 0;

        const report = {
            summary: {
                startTime: this.startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalDuration,
                totalValidations: this.validationResults.length,
                passedValidations: passedValidations.length,
                failedValidations: failedValidations.length,
                readinessScore: `${readinessScore}%`,
                productionReady
            },
            validationResults: this.validationResults,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                timestamp: endTime.toISOString()
            },
            recommendations: this.generateRecommendations(failedValidations, productionReady)
        };

        // Save report to file
        await fs.writeFile(
            'test-logs/production-readiness-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log(`\n📈 Production Readiness Summary:`);
        console.log(`   Readiness Score: ${report.summary.readinessScore}`);
        console.log(`   Validations Passed: ${report.summary.passedValidations}/${report.summary.totalValidations}`);
        console.log(`   Production Ready: ${productionReady ? '✅ YES' : '❌ NO'}`);
        console.log(`   Duration: ${Math.round(totalDuration / 1000)}s`);

        if (failedValidations.length > 0) {
            console.log(`\n❌ Failed Validations:`);
            failedValidations.forEach(validation => {
                console.log(`   - ${validation.name}: ${validation.error}`);
            });
        }

        if (report.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            report.recommendations.forEach(rec => {
                console.log(`   - ${rec}`);
            });
        }

        console.log(`\n📄 Detailed report saved to: test-logs/production-readiness-report.json`);
        
        return report;
    }

    generateRecommendations(failedValidations, productionReady) {
        const recommendations = [];

        if (!productionReady) {
            recommendations.push('CRITICAL: Fix all failed validations before deploying to production');
        }

        // Check for specific failure types
        const securityFailed = failedValidations.some(v => v.name.includes('Security'));
        const githubFailed = failedValidations.some(v => v.name.includes('GitHub'));
        const stabilityFailed = failedValidations.some(v => v.name.includes('Stability'));

        if (securityFailed) {
            recommendations.push('SECURITY: Review and fix security configuration issues');
        }

        if (githubFailed) {
            recommendations.push('DEPLOYMENT: Fix GitHub Actions compatibility issues');
        }

        if (stabilityFailed) {
            recommendations.push('STABILITY: Resolve application stability issues');
        }

        if (productionReady) {
            recommendations.push('SUCCESS: Application is ready for GitHub Actions deployment');
            recommendations.push('NEXT: Proceed with Task 17 GitHub Actions deployment');
        }

        return recommendations;
    }

    async runProductionReadinessValidation() {
        try {
            await this.initialize();

            console.log('\n🔐 Running Production Readiness Validations');
            console.log('===========================================');
            
            // Run all validation checks
            await this.validateSecurityConfiguration();
            await this.validateGitHubActionsCompatibility();
            await this.validateApplicationStability();
            await this.validateDocumentation();
            await this.validateProductionEnvironment();
            await this.validateEmailConfiguration();

            // Generate final report
            const report = await this.generateReadinessReport();
            
            console.log('\n🎯 Production Readiness Validation Complete!');
            console.log(`⏰ Total execution time: ${Math.round((new Date() - this.startTime) / 1000)}s`);

            // Exit with appropriate code
            process.exit(report.summary.productionReady ? 0 : 1);

        } catch (error) {
            console.error('\n💥 Fatal error in production readiness validation:', error.message);
            process.exit(1);
        }
    }
}

// Run validation if this file is executed directly
if (require.main === module) {
    const validator = new ProductionReadinessValidator();
    validator.runProductionReadinessValidation();
}

module.exports = ProductionReadinessValidator; 