# Nintendo Switch 2 Stock Monitor

🎮 **Automated stock monitoring and notification system for Nintendo Switch 2 at Costco**

A comprehensive Node.js application that continuously monitors Nintendo Switch 2 availability at Costco and sends instant email notifications when the product becomes available for purchase.

---

## 🌟 Features

### Core Functionality
- **🔍 Automated Stock Monitoring** - Continuously checks Nintendo Switch 2 availability at Costco
- **📧 Instant Email Alerts** - Immediate notifications when stock becomes available
- **📊 Daily Summary Reports** - Comprehensive daily statistics and monitoring summaries
- **💾 Historical Data Logging** - Complete history of all stock checks with timestamps
- **🔄 Reliable Scheduling** - Configurable monitoring intervals with precise timing

### Enterprise-Grade Reliability
- **🛡️ Error Handling & Resilience** - Comprehensive error handling with automatic recovery
- **🔄 Retry Logic** - Exponential backoff retry for network failures (3 attempts)
- **⚡ Circuit Breaker** - Email service protection preventing spam during outages
- **📬 Email Queue** - Failed email retry system with background processing
- **🏥 Health Monitoring** - Real-time component health checks and status reporting
- **📝 Comprehensive Logging** - Categorized error logging with automatic rotation

### Production-Ready Features
- **🔐 Secure Configuration** - Environment-based configuration with API key protection
- **🧹 Automatic Maintenance** - Log rotation, cleanup, and system maintenance
- **📈 Performance Monitoring** - Application metrics and performance tracking
- **🔧 Easy Management** - Simple start/stop commands with graceful shutdown
- **📱 Mobile-Friendly Emails** - Responsive HTML email templates

---

## 📋 Prerequisites

### System Requirements
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Operating System**: macOS, Linux, or Windows
- **Internet Connection**: Required for stock monitoring and email sending
- **Email Service**: Resend account with verified domain

### Required Accounts
- **Resend Account** - For sending email notifications ([resend.com](https://resend.com))
- **Domain Access** - For email domain verification (if using custom domain)

---

## 🚀 Quick Start

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd nintendo-switch-monitor

# Install dependencies
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see Configuration section below)
nano .env
```

### 3. Set Up Email Service
Follow the detailed [Resend Setup Guide](RESEND-SETUP.md) to configure email notifications.

### 4. Run the Application
```bash
# Start monitoring
npm start

# Or run in development mode
npm run dev
```

### 5. Verify Operation
- Check console output for successful initialization
- Monitor `data/stock-checks.json` for logged checks
- Look for email notifications when status changes

---

## ⚙️ Configuration

### Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the project root:

```env
# Product Monitoring Configuration
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html

# Email Configuration
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key_here

# Monitoring Schedule (optional)
STOCK_CHECK_INTERVAL=300000  # 5 minutes in milliseconds
DAILY_SUMMARY_TIME=09:00     # Time for daily summary (HH:MM format)
```

### Configuration Details

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PRODUCT_URL` | ✅ | Nintendo Switch 2 product page URL | Costco product URL |
| `FROM_EMAIL` | ✅ | Sender email address (must be verified domain) | `alerts@yourdomain.com` |
| `TO_EMAIL` | ✅ | Recipient email address | `you@gmail.com` |
| `RESEND_API_KEY` | ✅ | Resend service API key | `re_abc123...` |
| `STOCK_CHECK_INTERVAL` | ❌ | Check interval in milliseconds | `300000` (5 min) |
| `DAILY_SUMMARY_TIME` | ❌ | Daily summary time (24h format) | `09:00` |

### Security Best Practices

⚠️ **Important Security Notes:**
- Never commit your `.env` file to version control
- Keep your Resend API key secure and don't share it
- Use environment-specific API keys for different deployments
- Regularly rotate API keys for enhanced security

---

## 📖 Usage Instructions

### Starting the Application

```bash
# Standard start
npm start

# Development mode with detailed logging
npm run dev

# Background process (Linux/macOS)
nohup npm start > app.log 2>&1 &
```

### Stopping the Application

```bash
# Graceful shutdown (Ctrl+C or SIGTERM)
# The application will:
# 1. Stop accepting new monitoring tasks
# 2. Complete current operations
# 3. Save all data
# 4. Perform maintenance tasks
# 5. Exit cleanly
```

### Monitoring Operation

#### Console Output
The application provides detailed console logging:
```
🎮 Nintendo Switch 2 Stock Monitor with Enhanced Resilience
=========================================================
🚀 Starting application at 2025-06-10T22:55:09.996Z

✅ Error logging system initialized
✅ Configuration loaded successfully
✅ Data logger initialized with resilience features
✅ Health checks configured
✅ Application initialized successfully with enhanced resilience!

🔍 Performing integrated stock check...
📊 Current status: Out of Stock
✅ Stock check logged successfully
```

#### Data Files
- **`data/stock-checks.json`** - Complete history of all stock checks
- **`logs/error.log`** - Error logs with detailed stack traces
- **`logs/error-summary.json`** - Daily error statistics

### Understanding Email Notifications

#### Stock Alert Email
Sent immediately when Nintendo Switch 2 becomes available:
- **Subject**: 🎮 Nintendo Switch 2 is IN STOCK at Costco!
- **Content**: Professional HTML email with direct purchase link
- **Timing**: Instant notification when status changes from "Out of Stock" to "In Stock"

#### Daily Summary Email
Sent daily at configured time (default: 9:00 AM):
- **Subject**: 📊 Nintendo Switch 2 Stock Monitor - Daily Summary
- **Content**: Comprehensive statistics, check counts, status changes
- **Data**: Previous 24-hour monitoring summary

### Health Monitoring

#### Application Health
Check application health:
```bash
# The application automatically monitors:
# - Stock checker network connectivity
# - Data logger file system access
# - Email circuit breaker status
# - Application state integrity
```

#### Log Analysis
Monitor application performance:
```bash
# View recent stock checks
tail -f data/stock-checks.json

# Monitor error logs
tail -f logs/error.log

# Check daily error summary
cat logs/error-summary.json
```

---

## 📁 Project Structure

```
nintendo-switch-monitor/
├── src/                          # Source code
│   ├── index.js                  # Main application with lifecycle management
│   ├── config.js                 # Configuration management
│   ├── stockChecker.js           # Stock monitoring logic
│   ├── emailService.js           # Email notification system
│   ├── dataLogger.js             # Data persistence and logging
│   ├── scheduler.js              # Task scheduling system
│   └── errorHandler.js           # Error handling and resilience
├── data/                         # Data storage
│   ├── stock-checks.json         # Historical stock check data
│   └── backups/                  # Backup files
├── logs/                         # Log files
│   ├── error.log                 # Error logs
│   ├── error-summary.json        # Error statistics
│   └── daily-summary-*.txt       # Daily summaries
├── .env                          # Environment configuration
├── .env.example                  # Configuration template
├── package.json                  # Project dependencies
├── README.md                     # This documentation
├── SETUP.md                      # Detailed setup guide
└── RESEND-SETUP.md              # Email service setup guide
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **Application Won't Start**

**Symptoms**: Error on `npm start`
```bash
Error: Missing required configuration: RESEND_API_KEY
```

**Solutions**:
- Verify `.env` file exists and contains all required variables
- Check that `RESEND_API_KEY` is correctly set
- Ensure no syntax errors in `.env` file (no spaces around `=`)

#### 2. **No Email Notifications**

**Symptoms**: Application runs but emails not received

**Debugging Steps**:
```bash
# Check email configuration
cat .env | grep EMAIL

# Verify logs for email errors
cat logs/error.log | grep email

# Check circuit breaker status in application logs
# Look for "Circuit breaker" messages
```

**Common Causes**:
- Invalid Resend API key
- Unverified sender domain
- Network connectivity issues
- Circuit breaker is open due to previous failures

#### 3. **Stock Checks Failing**

**Symptoms**: Continuous network errors in logs
```
❌ Stock check failed after retries: Request timeout
```

**Solutions**:
- Check internet connectivity
- Verify Costco website accessibility
- Wait for automatic retry with exponential backoff
- Check if Costco has changed their product page structure

#### 4. **High Memory Usage**

**Symptoms**: Application consuming excessive memory

**Solutions**:
- Check log file sizes (`logs/` directory)
- Verify log rotation is working
- Review `data/stock-checks.json` file size
- Restart application to reset memory usage

#### 5. **Permission Errors**

**Symptoms**: File system errors
```
EACCES: permission denied, mkdir 'data'
```

**Solutions**:
```bash
# Fix directory permissions
chmod 755 .
mkdir -p data logs
chmod 755 data logs
```

### Advanced Troubleshooting

#### Enable Debug Logging
Add to `.env`:
```env
DEBUG=true
NODE_ENV=development
```

#### Verify Configuration
```bash
# Test configuration loading
node -e "console.log(require('./src/config.js'))"
```

#### Test Email Service
```bash
# Run email test (if implemented)
npm run test:email
```

#### Health Check
The application provides built-in health monitoring. Check console output for:
- Component health status
- Circuit breaker states
- Error rates and patterns

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**: Review `logs/error.log` for detailed error information
2. **Verify configuration**: Ensure all environment variables are correctly set
3. **Test components individually**: Verify network, email service, and file permissions
4. **Check system resources**: Ensure adequate memory and disk space
5. **Review recent changes**: Check if any configuration or system changes were made

---

## 📊 Performance and Monitoring

### Expected Performance
- **Memory Usage**: 50-100 MB during normal operation
- **CPU Usage**: < 5% during stock checks
- **Network**: ~1 KB per stock check
- **Storage**: ~10 MB for 30 days of logs

### Monitoring Recommendations
- Monitor log file sizes in `logs/` directory
- Check `data/stock-checks.json` for successful entries
- Review daily error summaries for patterns
- Ensure circuit breaker remains closed for email service

---

## 🔒 Security Considerations

### API Key Security
- Store API keys in environment variables only
- Never commit `.env` files to version control
- Use different API keys for development and production
- Regularly rotate API keys

### Network Security
- Application makes HTTPS requests only
- No sensitive data transmitted in stock checks
- Email content contains only public product information

### Data Privacy
- No personal data collected beyond configured email addresses
- Stock check data contains only timestamps and availability status
- Local data storage only (no external data transmission)

---

## 📝 License and Support

### License
This project is for educational and personal use. Please respect Costco's terms of service and rate limiting.

### Responsible Usage
- Maintain reasonable monitoring intervals (5+ minutes recommended)
- Don't overload Costco's servers with excessive requests
- Use for personal stock monitoring only

### Disclaimer
This application is not affiliated with Nintendo or Costco. Product availability is subject to change and not guaranteed to be accurate.

---

## 📚 Additional Documentation

- **[Detailed Setup Guide](SETUP.md)** - Step-by-step installation instructions
- **[Resend Email Setup](RESEND-SETUP.md)** - Email service configuration guide
- **[Task Documentation](TASK-14-COMPLETE.md)** - Technical implementation details

---

*Last updated: June 10, 2025* 