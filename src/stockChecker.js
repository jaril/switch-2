/**
 * Stock Checker for Nintendo Switch 2 at Costco
 * Checks if the product is available for purchase by looking for the add-to-cart button
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Check if Nintendo Switch 2 is in stock at the given Costco URL
 * @param {string} productUrl - The Costco product page URL to check
 * @returns {Promise<Object>} Object with inStock status, timestamp, and optional error
 */
async function checkStock(productUrl) {
    const timestamp = new Date();
    
    try {
        // Validate URL parameter
        if (!productUrl || typeof productUrl !== 'string') {
            return {
                inStock: false,
                error: 'Invalid product URL provided',
                timestamp
            };
        }

        // Make HTTP request with browser-like headers
        const response = await axios.get(productUrl, {
            timeout: 5000, // 5 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        // Check if HTTP request was successful
        if (response.status !== 200) {
            return {
                inStock: false,
                error: `HTTP request failed with status ${response.status}`,
                timestamp
            };
        }

        // Parse HTML with cheerio
        const $ = cheerio.load(response.data);
        
        // Look for the add-to-cart button with id="add-to-cart-btn"
        const addToCartButton = $('#add-to-cart-btn');
        
        // Check if the add-to-cart button exists and is not disabled
        const buttonExists = addToCartButton.length > 0;
        const buttonDisabled = addToCartButton.prop('disabled') || 
                              addToCartButton.hasClass('disabled') ||
                              addToCartButton.attr('aria-disabled') === 'true';

        // Product is in stock if button exists and is not disabled
        const inStock = buttonExists && !buttonDisabled;

        return {
            inStock,
            timestamp
        };

    } catch (error) {
        // Handle different types of errors
        let errorMessage = 'Unknown error occurred';
        
        if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout - server took too long to respond';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Network error - could not connect to server';
        } else if (error.response) {
            errorMessage = `HTTP error ${error.response.status}: ${error.response.statusText}`;
        } else if (error.message.includes('Parse')) {
            errorMessage = 'HTML parsing error - could not parse page content';
        } else {
            errorMessage = error.message;
        }

        return {
            inStock: false,
            error: errorMessage,
            timestamp
        };
    }
}

module.exports = {
    checkStock
}; 