#!/usr/bin/env node

/**
 * GitHub Actions Failure Notification - One-shot execution
 * Sends failure notification emails when GitHub Actions workflows fail
 */

require('dotenv').config();
const config = require('./config');
const { Resend } = require('resend');

class GitHubFailureNotifier {
    constructor() {
        this.config = config;
        this.resend = new Resend(this.config.RESEND_API_KEY);
        this.failureMessage = process.argv[2] || 'GitHub Actions workflow failed';
    }

    async initialize() {
        try {
            console.log('⚠️ GitHub Actions Failure Notifier - One-shot Execution');
            console.log('========================================================');
            console.log(`🚀 Starting at ${new Date().toISOString()}`);
            console.log(`📧 Failure message: ${this.failureMessage}`);
            
            // Validate configuration
            this.validateConfiguration();
            console.log('✅ Configuration validated');

            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            process.exit(1);
        }
    }

    validateConfiguration() {
        const required = ['FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        if (!this.config.RESEND_API_KEY.startsWith('re_')) {
            throw new Error('Invalid RESEND_API_KEY format');
        }

        console.log('📧 Email configured:', `${this.config.FROM_EMAIL} → ${this.config.TO_EMAIL}`);
    }

    generateFailureEmail() {
        const now = new Date();
        const gitHubInfo = this.getGitHubActionInfo();
        
        const subject = `🚨 Nintendo Switch 2 Monitor - Workflow Failure Alert`;
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Failure Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6; }
        .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table th, .info-table td { padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .info-table th { background: #e9ecef; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; padding: 15px; color: #6c757d; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 Workflow Failure Alert</h1>
        <p>Nintendo Switch 2 Stock Monitor</p>
    </div>
    
    <div class="content">
        <div class="alert-box">
            <strong>⚠️ Alert:</strong> ${this.failureMessage}
        </div>
        
        <p>A GitHub Actions workflow for the Nintendo Switch 2 Stock Monitor has failed. Please review the details below and take appropriate action.</p>
        
        <table class="info-table">
            <tr>
                <th>Failure Time</th>
                <td>${now.toLocaleString()} (${now.toISOString()})</td>
            </tr>
            <tr>
                <th>Workflow</th>
                <td>${gitHubInfo.workflowName}</td>
            </tr>
            <tr>
                <th>Repository</th>
                <td>${gitHubInfo.repository}</td>
            </tr>
            <tr>
                <th>Run ID</th>
                <td>${gitHubInfo.runId}</td>
            </tr>
            <tr>
                <th>Job</th>
                <td>${gitHubInfo.job}</td>
            </tr>
            <tr>
                <th>Actor</th>
                <td>${gitHubInfo.actor}</td>
            </tr>
            <tr>
                <th>Event</th>
                <td>${gitHubInfo.eventName}</td>
            </tr>
        </table>
        
        <h3>📋 Recommended Actions:</h3>
        <ul>
            <li><strong>Check Workflow Logs:</strong> Review the detailed logs in GitHub Actions</li>
            <li><strong>Verify Configuration:</strong> Ensure all repository secrets are correctly set</li>
            <li><strong>Test Components:</strong> Run the health check workflow manually</li>
            <li><strong>Check Service Status:</strong> Verify Resend and Costco website accessibility</li>
            <li><strong>Review Recent Changes:</strong> Check if any recent code changes caused the failure</li>
        </ul>
        
        ${gitHubInfo.actionUrl ? `
        <div style="text-align: center; margin: 20px 0;">
            <a href="${gitHubInfo.actionUrl}" class="btn">View Workflow Run</a>
        </div>
        ` : ''}
        
        <h3>🔧 Quick Troubleshooting:</h3>
        <ul>
            <li><strong>Repository Secrets:</strong> Verify PRODUCT_URL, FROM_EMAIL, TO_EMAIL, and RESEND_API_KEY are set</li>
            <li><strong>API Key:</strong> Ensure Resend API key is valid and not expired</li>
            <li><strong>Domain Verification:</strong> Check that your sending domain is still verified in Resend</li>
            <li><strong>Rate Limits:</strong> Confirm you haven't exceeded GitHub Actions or Resend rate limits</li>
        </ul>
        
        <div class="alert-box">
            <strong>💡 Note:</strong> This is an automated notification. The stock monitoring will attempt to continue on the next scheduled run.
        </div>
    </div>
    
    <div class="footer">
        <p>Nintendo Switch 2 Stock Monitor | GitHub Actions Failure Notification</p>
        <p>Generated at ${now.toISOString()}</p>
    </div>
</body>
</html>
        `;

        const textContent = `
🚨 WORKFLOW FAILURE ALERT 🚨

Nintendo Switch 2 Stock Monitor - GitHub Actions Failure

Failure Details:
- Time: ${now.toLocaleString()} (${now.toISOString()})
- Message: ${this.failureMessage}
- Workflow: ${gitHubInfo.workflowName}
- Repository: ${gitHubInfo.repository}
- Run ID: ${gitHubInfo.runId}
- Job: ${gitHubInfo.job}
- Actor: ${gitHubInfo.actor}
- Event: ${gitHubInfo.eventName}

Recommended Actions:
1. Check workflow logs in GitHub Actions
2. Verify all repository secrets are correctly set
3. Run the health check workflow manually
4. Check Resend and Costco website accessibility
5. Review any recent code changes

Quick Troubleshooting:
- Verify repository secrets: PRODUCT_URL, FROM_EMAIL, TO_EMAIL, RESEND_API_KEY
- Ensure Resend API key is valid and not expired
- Check that your sending domain is still verified in Resend
- Confirm you haven't exceeded GitHub Actions or Resend rate limits

${gitHubInfo.actionUrl ? `View Workflow Run: ${gitHubInfo.actionUrl}` : ''}

This is an automated notification. The stock monitoring will attempt to continue on the next scheduled run.

Nintendo Switch 2 Stock Monitor | GitHub Actions Failure Notification
Generated at ${now.toISOString()}
        `;

        return {
            subject,
            html: htmlContent,
            text: textContent
        };
    }

    getGitHubActionInfo() {
        // Extract GitHub Actions environment information
        return {
            workflowName: process.env.GITHUB_WORKFLOW || 'Nintendo Switch 2 Stock Monitor',
            repository: process.env.GITHUB_REPOSITORY || 'Unknown Repository',
            runId: process.env.GITHUB_RUN_ID || 'Unknown',
            job: process.env.GITHUB_JOB || 'Unknown Job',
            actor: process.env.GITHUB_ACTOR || 'Unknown Actor',
            eventName: process.env.GITHUB_EVENT_NAME || 'Unknown Event',
            sha: process.env.GITHUB_SHA || 'Unknown SHA',
            ref: process.env.GITHUB_REF || 'Unknown Ref',
            actionUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID 
                ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
                : null
        };
    }

    async sendFailureNotification() {
        console.log('\n📧 Sending failure notification email...');
        
        try {
            const emailContent = this.generateFailureEmail();
            
            const emailData = {
                from: this.config.FROM_EMAIL,
                to: this.config.TO_EMAIL,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
            };

            const result = await this.resend.emails.send(emailData);
            
            if (result.error) {
                throw new Error(`Email API error: ${result.error.message}`);
            }

            console.log('✅ Failure notification sent successfully');
            console.log(`📬 Email ID: ${result.data?.id || 'Unknown'}`);
            
            return result;

        } catch (error) {
            console.error('❌ Failed to send failure notification:', error.message);
            
            // Don't fail the entire workflow if notification fails
            // This prevents infinite failure loops
            console.log('⚠️ Continuing despite notification failure to prevent infinite loops');
            return null;
        }
    }

    async cleanup() {
        try {
            console.log('\n🧹 Cleanup completed');
            console.log('\n🎯 GitHub Actions failure notification completed!');
            console.log(`⏰ Execution time: ${new Date().toISOString()}`);
            
        } catch (error) {
            console.error('⚠️ Cleanup warning:', error.message);
            // Don't fail on cleanup errors
        }
    }

    async run() {
        try {
            // Initialize the notifier
            await this.initialize();
            
            // Send failure notification
            await this.sendFailureNotification();
            
            // Cleanup and exit
            await this.cleanup();
            
            // Always exit with success to prevent workflow failure loops
            process.exit(0);
            
        } catch (error) {
            console.error('💥 Fatal error in GitHub Actions failure notifier:', error.message);
            
            // Even if the notifier fails, don't fail the workflow
            // This prevents infinite failure notification loops
            console.log('⚠️ Exiting with success to prevent failure loops');
            process.exit(0);
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    // Don't fail to prevent notification loops
    process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't fail to prevent notification loops
    process.exit(0);
});

// Run the GitHub Actions failure notifier
if (require.main === module) {
    const githubFailureNotifier = new GitHubFailureNotifier();
    githubFailureNotifier.run();
}

module.exports = GitHubFailureNotifier; 