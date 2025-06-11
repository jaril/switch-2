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

        // Add random delay (1-3 seconds) to avoid being detected as a bot
        const delay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
        await new Promise(resolve => setTimeout(resolve, delay));

        // Make HTTP request with enhanced browser-like headers to avoid bot detection
        const response = await axios.get(productUrl, {
            timeout: 15000, // 15 second timeout (increased)
            maxRedirects: 5, // Handle redirects
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'DNT': '1',
                'Referer': 'https://www.costco.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Sec-CH-UA': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1'
            },
            // Add random delay to seem more human-like
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Only accept 2xx status codes
            }
        });

        // Check if HTTP request was successful
        if (response.status !== 200) {
            return {
                inStock: false,
                error: `HTTP request failed with status ${response.status}: ${response.statusText}`,
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