# Environment Configuration Guide

⚙️ **Complete guide for configuring the Nintendo Switch 2 Stock Monitor**

This guide explains all configuration options, provides examples, and covers security best practices for setting up your environment variables.

---

## 📋 Table of Contents

1. [Configuration Overview](#-configuration-overview)
2. [Required Variables](#-required-variables)
3. [Optional Variables](#-optional-variables)
4. [Example Configuration](#-example-configuration)
5. [Security Best Practices](#-security-best-practices)
6. [Configuration Validation](#-configuration-validation)
7. [Common Issues](#-common-issues)

---

## 🎯 Configuration Overview

The Nintendo Switch 2 Stock Monitor uses environment variables for configuration. This approach provides:

- **Security**: Sensitive data (API keys) separate from code
- **Flexibility**: Easy configuration for different environments
- **Portability**: Works across different operating systems
- **Safety**: No accidental commit of sensitive information

### Configuration File: `.env`

Create a `.env` file in your project root with your configuration:

```bash
# Create the configuration file
touch .env

# Edit with your preferred editor
nano .env
```

---

## ✅ Required Variables

These variables **must** be set for the application to work:

### `PRODUCT_URL`

**Description**: The Costco product page URL to monitor for stock changes

**Format**: Valid HTTPS URL to Costco product page

**Example**:
```env
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
```

**Notes**:
- Must be a Costco product page
- URL should be the main product page, not search results
- Product must be available for online purchase

### `FROM_EMAIL`

**Description**: The email address used as sender for notifications

**Format**: Valid email address from a verified domain

**Requirements**:
- Must be from a domain verified in your Resend account
- Cannot use free email providers (Gmail, Yahoo, etc.)
- Must match exactly with your Resend domain setup

**Examples**:
```env
# ✅ Good - verified domain
FROM_EMAIL=alerts@yourdomain.com
FROM_EMAIL=nintendo-alerts@yourcompany.com
FROM_EMAIL=stockmonitor@mybusiness.org

# ❌ Bad - unverified/free domains
FROM_EMAIL=alerts@gmail.com
FROM_EMAIL=test@example.com
```

### `TO_EMAIL`

**Description**: Your email address where notifications will be sent

**Format**: Any valid email address

**Examples**:
```env
TO_EMAIL=your-personal-email@gmail.com
TO_EMAIL=john.doe@yourcompany.com
TO_EMAIL=notifications@yourdomain.com
```

**Notes**:
- Can be any email provider (Gmail, Outlook, Yahoo, etc.)
- Should be an email you check regularly
- Will receive stock alerts and daily summaries

### `RESEND_API_KEY`

**Description**: Your Resend service API key for sending emails

**Format**: String starting with `re_` followed by alphanumeric characters

**Example**:
```env
RESEND_API_KEY=re_abc123def456ghi789jkl012mno345pqr678stu901
```

**Security Requirements**:
- Keep this secret and never share it
- Never commit to version control
- Rotate regularly for security
- Use different keys for development/production

**Getting Your API Key**:
1. Log in to [Resend Dashboard](https://resend.com)
2. Go to "API Keys" section
3. Click "Create API Key"
4. Name it "Nintendo Switch Monitor"
5. Set permissions to "Sending access"
6. Copy the key (you'll only see it once!)

---

## ⚙️ Optional Variables

These variables have default values but can be customized:

### `STOCK_CHECK_INTERVAL`

**Description**: Time between stock checks in milliseconds

**Default**: `300000` (5 minutes)

**Range**: Minimum `300000` (5 minutes) - Maximum `3600000` (1 hour)

**Examples**:
```env
# 5 minutes (default, recommended)
STOCK_CHECK_INTERVAL=300000

# 10 minutes (less frequent)
STOCK_CHECK_INTERVAL=600000

# 15 minutes (conservative)
STOCK_CHECK_INTERVAL=900000

# 30 minutes (very conservative)
STOCK_CHECK_INTERVAL=1800000
```

**Recommendations**:
- **5 minutes**: Good balance between responsiveness and politeness
- **10 minutes**: Conservative but still responsive
- **15+ minutes**: Very conservative, may miss brief stock periods

### `DAILY_SUMMARY_TIME`

**Description**: Time to send daily summary email in 24-hour format

**Default**: `09:00` (9:00 AM)

**Format**: `HH:MM` (24-hour format)

**Examples**:
```env
# Morning summary (default)
DAILY_SUMMARY_TIME=09:00

# Evening summary
DAILY_SUMMARY_TIME=18:00

# Late evening
DAILY_SUMMARY_TIME=22:30

# Early morning
DAILY_SUMMARY_TIME=07:15
```

**Notes**:
- Uses your system's local timezone
- Summary covers the previous 24-hour period
- Sent regardless of stock status

### Development Options

These are typically only used during development:

```env
# Enable debug logging
DEBUG=true

# Set development environment
NODE_ENV=development
```

---

## 📄 Example Configuration

### Complete `.env` File Example

```env
# Nintendo Switch 2 Stock Monitor Configuration
# =============================================================================

# Required Configuration
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=alerts@jaril.com
TO_EMAIL=your-personal-email@gmail.com
RESEND_API_KEY=re_abc123def456ghi789jkl012mno345pqr678stu901

# Optional Configuration
STOCK_CHECK_INTERVAL=300000
DAILY_SUMMARY_TIME=09:00

# Development (uncomment if needed)
# DEBUG=true
# NODE_ENV=development
```

### Configuration for Different Use Cases

#### Personal Use (Recommended)
```env
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key
STOCK_CHECK_INTERVAL=300000
DAILY_SUMMARY_TIME=09:00
```

#### Conservative Monitoring
```env
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key
STOCK_CHECK_INTERVAL=900000
DAILY_SUMMARY_TIME=18:00
```

#### Development/Testing
```env
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=test-alerts@yourdomain.com
TO_EMAIL=developer@yourdomain.com
RESEND_API_KEY=re_test_api_key
STOCK_CHECK_INTERVAL=600000
DAILY_SUMMARY_TIME=10:00
DEBUG=true
NODE_ENV=development
```

---

## 🔒 Security Best Practices

### API Key Security

1. **Never commit `.env` files** to version control:
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use strong, unique API keys**:
   - Generate separate keys for development and production
   - Rotate keys monthly
   - Use minimum required permissions

3. **Environment-specific keys**:
   ```env
   # Development
   RESEND_API_KEY=re_dev_key_here
   
   # Production
   RESEND_API_KEY=re_prod_key_here
   ```

### File Security

1. **Set proper file permissions**:
   ```bash
   # Restrict access to .env file
   chmod 600 .env
   ```

2. **Backup securely**:
   - Store backups in encrypted locations
   - Use password managers for API keys
   - Document configuration but not secrets

### Email Security

1. **Verify email addresses**:
   ```env
   # ✅ Good - verified addresses
   FROM_EMAIL=alerts@verified-domain.com
   TO_EMAIL=your-verified-email@gmail.com
   
   # ❌ Bad - unverified/test addresses
   FROM_EMAIL=test@example.com
   TO_EMAIL=fake@nowhere.com
   ```

2. **Monitor usage**:
   - Check Resend dashboard regularly
   - Monitor for unusual sending patterns
   - Set up usage alerts

---

## ✅ Configuration Validation

### Manual Validation

Check your configuration before running:

```bash
# View your configuration (without API key)
cat .env | grep -v RESEND_API_KEY

# Check for required variables
grep -E "^(PRODUCT_URL|FROM_EMAIL|TO_EMAIL|RESEND_API_KEY)=" .env
```

### Automated Validation

Test configuration loading:

```bash
# Test configuration (run from project directory)
node -e "
try {
  require('dotenv').config();
  const config = require('./src/config.js');
  console.log('✅ Configuration loaded successfully');
  console.log('📍 Product URL:', config.PRODUCT_URL ? '✅ Set' : '❌ Missing');
  console.log('📧 From Email:', config.FROM_EMAIL ? '✅ Set' : '❌ Missing');
  console.log('📧 To Email:', config.TO_EMAIL ? '✅ Set' : '❌ Missing');
  console.log('🔑 API Key:', config.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('⏰ Check Interval:', config.STOCK_CHECK_INTERVAL, 'ms');
  console.log('📅 Daily Summary:', config.DAILY_SUMMARY_TIME);
} catch (error) {
  console.error('❌ Configuration error:', error.message);
}
"
```

### Validation Checklist

Before running the application:

- [ ] **`.env` file exists** in project root
- [ ] **All required variables set** (no "your_" placeholders)
- [ ] **Resend domain verified** and matches FROM_EMAIL
- [ ] **API key valid** and has correct permissions
- [ ] **Email addresses valid** and accessible
- [ ] **Product URL accessible** and correct
- [ ] **Check interval reasonable** (5+ minutes)
- [ ] **File permissions secure** (600 or similar)

---

## 🔧 Common Issues

### Issue 1: Missing Environment File

**Error**: `Cannot find module` or `Missing required configuration`

**Solution**:
```bash
# Create .env file if missing
touch .env

# Add required configuration
echo "PRODUCT_URL=https://www.costco.com/nintendo-switch-2..." >> .env
echo "FROM_EMAIL=alerts@yourdomain.com" >> .env
echo "TO_EMAIL=your-email@gmail.com" >> .env
echo "RESEND_API_KEY=re_your_key_here" >> .env
```

### Issue 2: Invalid API Key Format

**Error**: `401 Unauthorized` or `Invalid API key`

**Common Problems**:
```env
# ✅ Correct format
RESEND_API_KEY=re_abc123def456

# ❌ Common mistakes
RESEND_API_KEY="re_abc123def456"  # Extra quotes
RESEND_API_KEY= re_abc123def456   # Extra space
RESEND_API_KEY=abc123def456       # Missing 're_' prefix
```

### Issue 3: Unverified Domain

**Error**: `403 Forbidden` or emails not delivered

**Solution**:
```env
# Ensure FROM_EMAIL matches verified domain
FROM_EMAIL=alerts@your-verified-domain.com

# Check domain status in Resend dashboard
# Follow RESEND-SETUP.md for domain verification
```

### Issue 4: Invalid Time Format

**Error**: `Invalid time format` or scheduler issues

**Solutions**:
```env
# ✅ Correct formats
DAILY_SUMMARY_TIME=09:00
DAILY_SUMMARY_TIME=18:30
DAILY_SUMMARY_TIME=07:15

# ❌ Invalid formats
DAILY_SUMMARY_TIME=9:00        # Missing leading zero
DAILY_SUMMARY_TIME=21:75       # Invalid minutes
DAILY_SUMMARY_TIME=9:00 AM     # 12-hour format not supported
```

### Issue 5: Environment Variables Not Loading

**Symptoms**: Variables show as `undefined`

**Solutions**:
1. **Check file location**: `.env` must be in project root
2. **Check file syntax**: No spaces around `=`
3. **Restart application**: Changes require restart
4. **Check file permissions**: Must be readable

```bash
# Debug environment loading
node -e "require('dotenv').config(); console.log(process.env.FROM_EMAIL);"
```

---

## 🎯 Configuration Templates

### Quick Start Template

Copy this to your `.env` file and replace with your values:

```env
# Quick Start Configuration - Replace with your values
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key_here
```

### Production Template

For production deployments:

```env
# Production Configuration
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_production_api_key_here
STOCK_CHECK_INTERVAL=300000
DAILY_SUMMARY_TIME=09:00
```

### Development Template

For development and testing:

```env
# Development Configuration
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
FROM_EMAIL=dev-alerts@yourdomain.com
TO_EMAIL=developer@yourdomain.com
RESEND_API_KEY=re_development_api_key_here
STOCK_CHECK_INTERVAL=600000
DAILY_SUMMARY_TIME=10:00
DEBUG=true
NODE_ENV=development
```

---

## 📞 Getting Help

If you're having configuration issues:

1. **Check syntax**: Ensure no typos or formatting errors
2. **Validate required fields**: All required variables must be set
3. **Test API key**: Verify in Resend dashboard
4. **Check domain**: Ensure domain is verified in Resend
5. **Review logs**: Check `logs/error.log` for specific errors

For additional help:
- Review [SETUP.md](SETUP.md) for detailed setup instructions
- Check [RESEND-SETUP.md](RESEND-SETUP.md) for email configuration
- See [README.md](README.md) troubleshooting section

---

*Configuration guide last updated: June 10, 2025* 