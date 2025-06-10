/**
 * Environment Configuration
 * Loads and validates environment variables for the Nintendo Switch 2 Stock Monitor
 */

// Load environment variables from .env file
require('dotenv').config();

/**
 * Configuration object containing all environment variables
 */
const config = {
    // Resend API key for sending email notifications
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    
    // Email address to send notifications from (must be verified in Resend)
    FROM_EMAIL: process.env.FROM_EMAIL,
    
    // Email address to receive stock notifications
    TO_EMAIL: process.env.TO_EMAIL,
    
    // Costco product URL to monitor for Nintendo Switch 2 availability
    PRODUCT_URL: process.env.PRODUCT_URL
};

/**
 * Validate that all required environment variables are present
 * Throws an error if any required variables are missing
 */
function validateConfiguration() {
    const requiredVariables = [
        'RESEND_API_KEY',
        'FROM_EMAIL', 
        'TO_EMAIL',
        'PRODUCT_URL'
    ];
    
    const missingVariables = requiredVariables.filter(varName => {
        const value = config[varName];
        return !value || value.trim() === '';
    });
    
    if (missingVariables.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVariables.join(', ')}\n` +
            'Please create a .env file based on .env.example and set all required variables.'
        );
    }
}

// Validate configuration when module is loaded
validateConfiguration();

// Export the configuration object
module.exports = config; 