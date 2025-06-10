/**
 * Email Service for Nintendo Switch 2 Stock Monitor
 * Handles email notifications using Resend API
 */

const { Resend } = require('resend');
const config = require('./config.js');

// Initialize Resend client with API key from environment
let resendClient;

try {
    resendClient = new Resend(config.RESEND_API_KEY);
} catch (error) {
    console.error('❌ Failed to initialize Resend client:', error.message);
    throw new Error('Resend client initialization failed');
}

/**
 * Send an email using Resend service
 * @param {string} subject - Email subject line
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content of the email (optional)
 * @returns {Promise<Object>} Result object with success status and optional error
 */
async function sendEmail(subject, htmlContent, textContent = null) {
    try {
        // Validate input parameters
        if (!subject || typeof subject !== 'string') {
            throw new Error('Subject is required and must be a string');
        }
        
        if (!htmlContent || typeof htmlContent !== 'string') {
            throw new Error('HTML content is required and must be a string');
        }

        // Prepare email data
        const emailData = {
            from: config.FROM_EMAIL,
            to: [config.TO_EMAIL],
            subject: subject,
            html: htmlContent
        };

        // Add text content if provided
        if (textContent && typeof textContent === 'string') {
            emailData.text = textContent;
        }

        console.log(`📧 Sending email: "${subject}" to ${config.TO_EMAIL}`);

        // Send email using Resend
        const result = await resendClient.emails.send(emailData);

        if (result.error) {
            console.error('❌ Resend API error:', result.error);
            return {
                success: false,
                error: result.error.message || 'Unknown Resend API error',
                timestamp: new Date().toISOString()
            };
        }

        console.log('✅ Email sent successfully:', result.data?.id || 'No ID returned');
        
        return {
            success: true,
            messageId: result.data?.id,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const errorMessage = error.message || 'Unknown email sending error';
        console.error('❌ Failed to send email:', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Send stock alert email when product becomes available
 * @param {string} productUrl - URL of the product page
 * @param {string} productName - Name of the product
 * @returns {Promise<Object>} Result object with success status
 */
async function sendStockAlert(productUrl, productName = 'Nintendo Switch 2') {
    try {
        // Validate input parameters
        if (!productUrl || typeof productUrl !== 'string') {
            throw new Error('Product URL is required and must be a string');
        }

        const timestamp = new Date().toISOString();
        const formattedTime = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        // Subject line
        const subject = '🎮 Nintendo Switch 2 is IN STOCK at Costco!';

        // HTML email template
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nintendo Switch 2 Stock Alert</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #0066cc, #004499);
            color: white;
            text-align: center;
            padding: 30px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px 20px;
            text-align: center;
        }
        .product-name {
            font-size: 24px;
            color: #333;
            font-weight: bold;
            margin: 0 0 20px 0;
        }
        .alert-message {
            font-size: 18px;
            color: #28a745;
            font-weight: bold;
            margin: 0 0 30px 0;
            padding: 15px;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 5px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            background: linear-gradient(135deg, #218838, #1e7e34);
            transform: translateY(-2px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        .product-url {
            font-size: 14px;
            color: #666;
            word-break: break-all;
            margin: 20px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .timestamp {
            font-size: 14px;
            color: #666;
            margin: 20px 0;
            font-style: italic;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
        .urgency {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 20px 15px;
            }
            .cta-button {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 STOCK ALERT! 🎮</h1>
        </div>
        
        <div class="content">
            <div class="product-name">${productName}</div>
            
            <div class="alert-message">
                🟢 NOW AVAILABLE AT COSTCO!
            </div>
            
            <div class="urgency">
                ⚡ Act Fast! Nintendo Switch 2 stock moves quickly!
            </div>
            
            <a href="${productUrl}" class="cta-button">
                🛒 SHOP NOW AT COSTCO
            </a>
            
            <div class="product-url">
                <strong>Direct Link:</strong><br>
                <a href="${productUrl}" style="color: #0066cc;">${productUrl}</a>
            </div>
            
            <div class="timestamp">
                ⏰ Stock detected on: ${formattedTime}
            </div>
        </div>
        
        <div class="footer">
            <p>This alert was generated by your Nintendo Switch 2 Stock Monitor.</p>
            <p>Happy gaming! 🎮✨</p>
        </div>
    </div>
</body>
</html>`;

        // Plain text version
        const textContent = `
🎮 NINTENDO SWITCH 2 STOCK ALERT! 🎮

${productName} is NOW AVAILABLE at Costco!

🟢 IN STOCK: Act fast, Nintendo Switch 2 stock moves quickly!

🛒 SHOP NOW: ${productUrl}

⏰ Stock detected on: ${formattedTime}

Direct link: ${productUrl}

This alert was generated by your Nintendo Switch 2 Stock Monitor.
Happy gaming! 🎮✨
`;

        console.log(`🚨 Sending stock alert for ${productName}...`);

        // Send the stock alert email
        const result = await sendEmail(subject, htmlContent, textContent);

        if (result.success) {
            console.log('🎉 Stock alert email sent successfully!');
        } else {
            console.log('❌ Failed to send stock alert email:', result.error);
        }

        return result;

    } catch (error) {
        const errorMessage = error.message || 'Failed to send stock alert';
        console.error('❌ Stock alert error:', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Send daily summary email with stock monitoring statistics
 * @param {Object} summaryData - Summary data object
 * @param {number} summaryData.totalChecks - Total number of checks performed
 * @param {number} summaryData.inStockCount - Number of times product was in stock
 * @param {number} summaryData.outOfStockCount - Number of times product was out of stock
 * @param {string} summaryData.date - Date in YYYY-MM-DD format
 * @param {Array} summaryData.checkHistory - Array of {timestamp, status} objects
 * @returns {Promise<Object>} Result object with success status
 */
async function sendDailySummary(summaryData) {
    try {
        // Validate input parameters
        if (!summaryData || typeof summaryData !== 'object') {
            throw new Error('Summary data is required and must be an object');
        }

        const {
            totalChecks = 0,
            inStockCount = 0,
            outOfStockCount = 0,
            date = new Date().toISOString().split('T')[0],
            checkHistory = []
        } = summaryData;

        // Validate required fields
        if (typeof totalChecks !== 'number' || totalChecks < 0) {
            throw new Error('totalChecks must be a non-negative number');
        }

        const reportTimestamp = new Date().toISOString();
        const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedReportTime = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        // Calculate percentages
        const inStockPercentage = totalChecks > 0 ? ((inStockCount / totalChecks) * 100).toFixed(1) : 0;
        const outOfStockPercentage = totalChecks > 0 ? ((outOfStockCount / totalChecks) * 100).toFixed(1) : 0;

        // Generate status changes timeline
        const statusChanges = [];
        if (checkHistory && checkHistory.length > 0) {
            let lastStatus = null;
            checkHistory.forEach(check => {
                if (check.status !== lastStatus) {
                    statusChanges.push({
                        timestamp: check.timestamp,
                        status: check.status,
                        formattedTime: new Date(check.timestamp).toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                        })
                    });
                    lastStatus = check.status;
                }
            });
        }

        // Subject line
        const subject = `📊 Daily Stock Check Summary - ${formattedDate}`;

        // HTML email template
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Stock Check Summary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f7;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-align: center;
            padding: 30px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header .date {
            margin: 10px 0 0 0;
            font-size: 18px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 0 0 40px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 25px 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e9ecef;
            transition: transform 0.2s ease;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: #2c3e50;
        }
        .stat-label {
            font-size: 14px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }
        .in-stock {
            color: #28a745;
        }
        .out-of-stock {
            color: #dc3545;
        }
        .section {
            margin: 40px 0;
        }
        .section h2 {
            font-size: 22px;
            margin: 0 0 20px 0;
            color: #2c3e50;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .percentage-bar {
            background: #e9ecef;
            border-radius: 10px;
            height: 30px;
            margin: 15px 0;
            overflow: hidden;
            position: relative;
        }
        .percentage-fill {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            transition: width 0.3s ease;
        }
        .in-stock-bar {
            background: linear-gradient(90deg, #28a745, #20c997);
        }
        .out-of-stock-bar {
            background: linear-gradient(90deg, #dc3545, #c82333);
        }
        .timeline {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .timeline-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #e9ecef;
        }
        .timeline-item.in-stock {
            border-left-color: #28a745;
        }
        .timeline-item.out-of-stock {
            border-left-color: #dc3545;
        }
        .timeline-time {
            font-weight: bold;
            color: #6c757d;
            min-width: 100px;
            font-size: 14px;
        }
        .timeline-status {
            margin-left: 15px;
            font-weight: 500;
        }
        .timeline-status.in-stock {
            color: #28a745;
        }
        .timeline-status.out-of-stock {
            color: #dc3545;
        }
        .no-changes {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 30px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        .footer-time {
            margin-top: 10px;
            font-size: 12px;
            color: #868e96;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 30px 20px;
            }
            .summary-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            .stat-card {
                padding: 20px 15px;
            }
            .timeline-item {
                flex-direction: column;
                align-items: flex-start;
            }
            .timeline-time {
                min-width: auto;
                margin-bottom: 5px;
            }
            .timeline-status {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Stock Summary</h1>
            <div class="date">${formattedDate}</div>
        </div>
        
        <div class="content">
            <!-- Summary Statistics -->
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalChecks}</div>
                    <div class="stat-label">Total Checks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number in-stock">${inStockCount}</div>
                    <div class="stat-label">In Stock</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number out-of-stock">${outOfStockCount}</div>
                    <div class="stat-label">Out of Stock</div>
                </div>
            </div>

            <!-- Stock Status Breakdown -->
            <div class="section">
                <h2>📈 Stock Status Breakdown</h2>
                
                ${totalChecks > 0 ? `
                <div style="margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>In Stock:</strong> ${inStockPercentage}%</span>
                        <span>${inStockCount} of ${totalChecks} checks</span>
                    </div>
                    <div class="percentage-bar">
                        <div class="percentage-fill in-stock-bar" style="width: ${inStockPercentage}%;">
                            ${inStockPercentage > 15 ? `${inStockPercentage}%` : ''}
                        </div>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Out of Stock:</strong> ${outOfStockPercentage}%</span>
                        <span>${outOfStockCount} of ${totalChecks} checks</span>
                    </div>
                    <div class="percentage-bar">
                        <div class="percentage-fill out-of-stock-bar" style="width: ${outOfStockPercentage}%;">
                            ${outOfStockPercentage > 15 ? `${outOfStockPercentage}%` : ''}
                        </div>
                    </div>
                </div>
                ` : `
                <div class="no-changes">
                    No stock checks performed today.
                </div>
                `}
            </div>

            <!-- Status Changes Timeline -->
            <div class="section">
                <h2>⏰ Stock Status Changes</h2>
                
                <div class="timeline">
                    ${statusChanges.length > 0 ? 
                        statusChanges.map(change => `
                        <div class="timeline-item ${change.status}">
                            <div class="timeline-time">${change.formattedTime}</div>
                            <div class="timeline-status ${change.status}">
                                ${change.status === 'in-stock' ? '🟢 Product became available' : '🔴 Product went out of stock'}
                            </div>
                        </div>
                        `).join('') : `
                        <div class="no-changes">
                            No status changes detected today.
                        </div>
                    `}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>This summary was generated by your Nintendo Switch 2 Stock Monitor.</p>
            <div class="footer-time">Report generated: ${formattedReportTime}</div>
        </div>
    </div>
</body>
</html>`;

        // Plain text version
        const textContent = `
📊 DAILY STOCK CHECK SUMMARY
${formattedDate}
${'='.repeat(50)}

SUMMARY STATISTICS:
• Total Checks: ${totalChecks}
• In Stock: ${inStockCount} (${inStockPercentage}%)
• Out of Stock: ${outOfStockCount} (${outOfStockPercentage}%)

STOCK STATUS BREAKDOWN:
${totalChecks > 0 ? `
📈 Availability Rate: ${inStockPercentage}% in stock
📉 Unavailability Rate: ${outOfStockPercentage}% out of stock

In Stock: ${'█'.repeat(Math.floor(inStockPercentage / 5))}${'░'.repeat(20 - Math.floor(inStockPercentage / 5))} ${inStockPercentage}%
Out of Stock: ${'█'.repeat(Math.floor(outOfStockPercentage / 5))}${'░'.repeat(20 - Math.floor(outOfStockPercentage / 5))} ${outOfStockPercentage}%
` : 'No stock checks performed today.'}

STOCK STATUS CHANGES:
${statusChanges.length > 0 ? 
    statusChanges.map(change => 
        `• ${change.formattedTime} - ${change.status === 'in-stock' ? '🟢 Product became available' : '🔴 Product went out of stock'}`
    ).join('\n') : '• No status changes detected today.'}

${'='.repeat(50)}
Report generated: ${formattedReportTime}
Generated by Nintendo Switch 2 Stock Monitor
`;

        console.log(`📊 Sending daily summary for ${formattedDate}...`);

        // Send the daily summary email
        const result = await sendEmail(subject, htmlContent, textContent);

        if (result.success) {
            console.log('📈 Daily summary email sent successfully!');
        } else {
            console.log('❌ Failed to send daily summary email:', result.error);
        }

        return result;

    } catch (error) {
        const errorMessage = error.message || 'Failed to send daily summary';
        console.error('❌ Daily summary error:', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Test email connection and configuration
 * Sends a basic test email to verify the service is working
 * @returns {Promise<Object>} Result object with success status
 */
async function testEmailConnection() {
    const testSubject = 'Nintendo Switch 2 Monitor - Email Service Test';
    const testHtmlContent = `
        <h2>🎮 Email Service Test</h2>
        <p>This is a test email from the Nintendo Switch 2 Stock Monitor.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
            <li>From: ${config.FROM_EMAIL}</li>
            <li>To: ${config.TO_EMAIL}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, the Resend integration is working correctly! ✅</p>
    `;
    const testTextContent = `
Nintendo Switch 2 Monitor - Email Service Test

This is a test email from the Nintendo Switch 2 Stock Monitor.

Configuration:
- From: ${config.FROM_EMAIL}
- To: ${config.TO_EMAIL}
- Timestamp: ${new Date().toISOString()}

If you received this email, the Resend integration is working correctly!
    `;

    console.log('🧪 Testing email connection...');
    
    try {
        const result = await sendEmail(testSubject, testHtmlContent, testTextContent);
        
        if (result.success) {
            console.log('✅ Email connection test successful');
        } else {
            console.log('❌ Email connection test failed:', result.error);
        }
        
        return result;
        
    } catch (error) {
        const errorMessage = error.message || 'Email connection test failed';
        console.error('❌ Email connection test error:', errorMessage);
        
        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get email service status and configuration info
 * @returns {Object} Service status information
 */
function getServiceInfo() {
    return {
        service: 'Resend',
        fromEmail: config.FROM_EMAIL,
        toEmail: config.TO_EMAIL,
        clientInitialized: !!resendClient,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    sendEmail,
    sendStockAlert,
    sendDailySummary,
    testEmailConnection,
    getServiceInfo
}; 