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
    testEmailConnection,
    getServiceInfo
}; 