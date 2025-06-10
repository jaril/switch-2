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
    testEmailConnection,
    getServiceInfo
}; 