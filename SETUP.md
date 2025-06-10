# Nintendo Switch 2 Stock Monitor - Detailed Setup Guide

📖 **Complete step-by-step setup instructions for new users**

This guide will walk you through setting up the Nintendo Switch 2 Stock Monitor from scratch, including all prerequisites and configuration steps.

---

## 📋 Table of Contents

1. [System Requirements](#-system-requirements)
2. [Node.js Installation](#-nodejs-installation)
3. [Project Installation](#-project-installation)
4. [Email Service Setup](#-email-service-setup)
5. [Environment Configuration](#-environment-configuration)
6. [First-Time Run](#-first-time-run)
7. [Verification Steps](#-verification-steps)
8. [Common Setup Issues](#-common-setup-issues)

---

## 🖥️ System Requirements

### Minimum Requirements
- **RAM**: 512 MB available memory
- **Storage**: 100 MB free disk space
- **Network**: Stable internet connection
- **Permissions**: Ability to install software and create files

### Supported Operating Systems
- **macOS**: 10.14 (Mojave) or later
- **Windows**: Windows 10 or later
- **Linux**: Ubuntu 18.04+, CentOS 7+, or equivalent

### Prerequisites Checklist
Before starting, ensure you have:
- [ ] Administrator/sudo access on your computer
- [ ] Stable internet connection
- [ ] Email address for receiving notifications
- [ ] Text editor for editing configuration files

---

## 🟢 Node.js Installation

Node.js is required to run the stock monitor. Follow the instructions for your operating system:

### macOS Installation

#### Option 1: Official Installer (Recommended)
1. **Visit the Node.js website**: [nodejs.org](https://nodejs.org/)
2. **Download the LTS version** (Long Term Support - most stable)
3. **Run the installer**: Double-click the downloaded `.pkg` file
4. **Follow the installation wizard**: Accept defaults
5. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

#### Option 2: Using Homebrew
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version
npm --version
```

### Windows Installation

#### Option 1: Official Installer (Recommended)
1. **Visit the Node.js website**: [nodejs.org](https://nodejs.org/)
2. **Download the Windows Installer** (.msi file)
3. **Run the installer**: Right-click and "Run as administrator"
4. **Follow the installation wizard**:
   - Accept the license agreement
   - Choose installation directory (default is fine)
   - Ensure "Add to PATH" is checked
5. **Restart your computer** (recommended)
6. **Verify installation** in Command Prompt:
   ```cmd
   node --version
   npm --version
   ```

#### Option 2: Using Chocolatey
```cmd
# Install Chocolatey if not already installed
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs

# Verify installation
node --version
npm --version
```

### Linux Installation

#### Ubuntu/Debian
```bash
# Update package index
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version

# If versions are too old, use NodeSource repository:
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL/Fedora
```bash
# CentOS/RHEL
sudo yum install nodejs npm

# Fedora
sudo dnf install nodejs npm

# Verify installation
node --version
npm --version
```

#### Using Node Version Manager (NVM) - All Linux Distributions
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.bashrc

# Install latest LTS Node.js
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

### Version Verification

After installation, verify you have compatible versions:
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v8.0.0 or higher
```

If your versions are lower than required, please update Node.js to the latest LTS version.

---

## 📦 Project Installation

### Step 1: Download the Project

#### Option 1: Git Clone (if you have Git)
```bash
# Clone the repository
git clone <repository-url>
cd nintendo-switch-monitor
```

#### Option 2: Download ZIP
1. Download the project ZIP file
2. Extract to your desired location
3. Open terminal/command prompt in the project folder

### Step 2: Install Dependencies

```bash
# Navigate to project directory (if not already there)
cd nintendo-switch-monitor

# Install all required packages
npm install
```

**Expected output:**
```
added 150 packages, and audited 151 packages in 15s
found 0 vulnerabilities
```

### Step 3: Verify Project Structure

After installation, your directory should look like:
```
nintendo-switch-monitor/
├── src/                    # Application source code
├── data/                   # Data storage (created automatically)
├── logs/                   # Log files (created automatically)
├── node_modules/           # Installed dependencies
├── package.json            # Project configuration
├── package-lock.json       # Dependency lock file
├── .env.example            # Environment template
├── README.md               # Documentation
├── SETUP.md                # This file
└── RESEND-SETUP.md         # Email setup guide
```

### Step 4: Create Data Directories

The application will create these automatically, but you can create them manually:
```bash
# Create directories
mkdir -p data logs

# Verify creation
ls -la
```

---

## 📧 Email Service Setup

The stock monitor uses Resend for sending email notifications. Follow these steps to set up email service:

### Step 1: Create Resend Account

1. **Visit Resend**: [resend.com](https://resend.com)
2. **Sign up** for a free account
3. **Verify your email address** when prompted
4. **Complete account setup**

### Step 2: Domain Setup (Recommended)

For reliable email delivery, use a custom domain:

#### If You Own a Domain (like jaril.com):
1. **Follow the detailed [Resend Setup Guide](RESEND-SETUP.md)**
2. **Configure DNS records** for your domain
3. **Verify domain** in Resend dashboard

#### If You Don't Own a Domain:
You can use Resend's shared domain temporarily:
1. **Skip domain verification** for now
2. **Use a Resend shared domain** email address
3. **Note**: Lower delivery rates with shared domains

### Step 3: Generate API Key

1. **Log in to Resend dashboard**
2. **Navigate to "API Keys"** section
3. **Click "Create API Key"**
4. **Name it**: "Nintendo Switch Monitor"
5. **Set permissions**: "Full access" or "Send emails"
6. **Copy the API key** (starts with `re_`)
7. **Save it securely** - you won't see it again

**Important**: Keep your API key secret and never share it publicly.

---

## ⚙️ Environment Configuration

### Step 1: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Or create manually
touch .env
```

### Step 2: Edit Configuration

Open `.env` in your preferred text editor:

#### macOS/Linux:
```bash
# Using nano
nano .env

# Using vim
vim .env

# Using VS Code (if installed)
code .env
```

#### Windows:
```cmd
# Using notepad
notepad .env

# Using VS Code (if installed)
code .env
```

### Step 3: Configure Variables

Add the following configuration to your `.env` file:

```env
# Product Monitoring Configuration
PRODUCT_URL=https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html

# Email Configuration
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key_here

# Optional: Monitoring Schedule
STOCK_CHECK_INTERVAL=300000
DAILY_SUMMARY_TIME=09:00
```

### Step 4: Customize Your Configuration

#### Required Variables:

**PRODUCT_URL**
- **Description**: The Costco product page to monitor
- **Default**: Nintendo Switch 2 Mario Kart World Bundle
- **Note**: Update if monitoring different products

**FROM_EMAIL**
- **Description**: Sender email address
- **Requirements**: Must be from verified domain
- **Example**: `alerts@yourdomain.com`
- **Note**: Use your verified domain from Resend

**TO_EMAIL**
- **Description**: Your email address for notifications
- **Example**: `your-personal-email@gmail.com`
- **Note**: Where you'll receive stock alerts

**RESEND_API_KEY**
- **Description**: Your Resend service API key
- **Format**: Starts with `re_`
- **Example**: `re_abc123def456...`
- **Security**: Keep this secret!

#### Optional Variables:

**STOCK_CHECK_INTERVAL** (optional)
- **Description**: Time between stock checks in milliseconds
- **Default**: 300000 (5 minutes)
- **Minimum recommended**: 300000 (5 minutes)
- **Example**: 600000 (10 minutes)

**DAILY_SUMMARY_TIME** (optional)
- **Description**: Time to send daily summary (24-hour format)
- **Default**: 09:00 (9:00 AM)
- **Format**: HH:MM
- **Example**: 18:30 (6:30 PM)

### Step 5: Validate Configuration

Save your `.env` file and validate the configuration:

```bash
# Check file exists and has content
cat .env

# Verify no syntax errors (no output means success)
node -e "require('dotenv').config(); console.log('✅ Configuration valid')"
```

---

## 🚀 First-Time Run

### Step 1: Test Configuration

Before running the full application, test your configuration:

```bash
# Test configuration loading
node -e "
const config = require('./src/config.js');
console.log('✅ Configuration loaded successfully');
console.log('📍 Product URL:', config.PRODUCT_URL ? '✅ Set' : '❌ Missing');
console.log('📧 From Email:', config.FROM_EMAIL ? '✅ Set' : '❌ Missing');
console.log('📧 To Email:', config.TO_EMAIL ? '✅ Set' : '❌ Missing');
console.log('🔑 API Key:', config.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
"
```

### Step 2: Initial Application Run

Start the application for the first time:

```bash
# Run the application
npm start
```

### Step 3: Monitor Initial Output

You should see output similar to:
```
🎮 Nintendo Switch 2 Stock Monitor with Enhanced Resilience
=========================================================
🚀 Starting application at 2025-06-10T22:55:09.996Z

🚨 Initializing error logging system...
✅ Error logging system initialized

⚙️  Verifying configuration...
✅ Configuration loaded successfully
📍 Product URL: https://www.costco.com/nintendo-switch-2--mario-kart-world-bundle.product.4000369992.html
📧 Email configured: alerts@yourdomain.com → your-email@gmail.com

📊 Initializing data logger with backup mechanisms...
💾 Data backup mechanisms initialized
✅ Data logger initialized with resilience features

🔧 Verifying module imports...
✅ All modules loaded successfully

🏥 Setting up health checks...
✅ Health checks configured

🛡️  Setting up shutdown handlers...
✅ Shutdown handlers configured

🔍 Running initial health check...
🏥 Running health checks...
✅ Initial health check completed - Status: healthy

🎯 Application initialized successfully with enhanced resilience!
```

### Step 4: Monitor First Stock Check

The application will perform its first stock check shortly after starting:
```
🔍 Performing integrated stock check...
📡 Checking stock status with resilience...
✅ Stock check completed successfully
📊 Current status: Out of Stock
🔄 Updating application state with resilience...
✅ Application state updated successfully
📝 Logging stock check result with resilience...
✅ Stock check logged successfully
ℹ️ No alert needed (first check)
```

---

## ✅ Verification Steps

### Step 1: Check Application Health

Verify the application is running correctly:

1. **Console Output**: Should show successful initialization
2. **No Error Messages**: Look for any red error text
3. **Health Status**: Should report "healthy" status

### Step 2: Verify Data Creation

Check that data files are being created:

```bash
# Check data directory
ls -la data/
# Should show: stock-checks.json

# Check logs directory
ls -la logs/
# Should show: error.log, error-summary.json

# View first stock check
cat data/stock-checks.json
# Should contain JSON array with stock check data
```

### Step 3: Test Email Functionality

#### Option 1: Trigger a Test (Manual)
If you want to test email functionality, you can modify the product URL temporarily to trigger a state change.

#### Option 2: Wait for Daily Summary
The daily summary email will be sent at your configured time (default 9:00 AM).

#### Option 3: Check Email Logs
```bash
# Check for email-related logs
cat logs/error.log | grep -i email
# Should show no errors if email is configured correctly
```

### Step 4: Monitor Performance

Let the application run for 10-15 minutes and verify:

1. **Regular Stock Checks**: New entries in `data/stock-checks.json`
2. **No Memory Leaks**: Stable memory usage
3. **No Error Accumulation**: Minimal errors in `logs/error.log`

### Step 5: Test Graceful Shutdown

Test the shutdown process:

```bash
# Press Ctrl+C in the terminal running the application
# Should see graceful shutdown messages:
```
```
📊 Process shutdown initiated
🔍 Reason: SIGINT

🔧 Performing maintenance tasks...
✅ Maintenance tasks completed

🛑 Stopping Nintendo Switch 2 Stock Monitor Application...
⏸️ Stopping schedulers...
✅ Stock monitoring scheduler stopped
✅ Daily summary scheduler stopped
⏳ Waiting for in-progress operations...
✅ All operations completed
🧹 Cleaning up application state...
✅ Application state cleaned up
🎯 Application shutdown completed successfully!
👋 Process terminating...
```

---

## 🔧 Common Setup Issues

### Issue 1: Node.js Version Too Old

**Error Message**:
```
Error: The engine "node" is incompatible with this module.
```

**Solution**:
1. Update Node.js to version 18.0.0 or higher
2. Use Node Version Manager (nvm) for easy version management
3. Verify version with `node --version`

### Issue 2: Missing Dependencies

**Error Message**:
```
Error: Cannot find module 'axios'
```

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Permission Errors

**Error Message**:
```
EACCES: permission denied, mkdir 'data'
```

**Solution**:
```bash
# Fix permissions (macOS/Linux)
chmod 755 .
mkdir -p data logs
chmod 755 data logs

# Windows: Run Command Prompt as Administrator
```

### Issue 4: Environment File Not Found

**Error Message**:
```
Error: Missing required configuration: RESEND_API_KEY
```

**Solution**:
1. Verify `.env` file exists in project root
2. Check file has correct format (no spaces around `=`)
3. Ensure all required variables are set

### Issue 5: Network Connection Issues

**Error Message**:
```
Stock check failed after retries: ENOTFOUND
```

**Solution**:
1. Check internet connectivity
2. Verify firewall isn't blocking Node.js
3. Test URL accessibility in browser
4. Wait for automatic retry

### Issue 6: Email Delivery Issues

**Symptoms**: No emails received despite no errors

**Troubleshooting**:
1. **Check Spam Folder**: Emails might be filtered
2. **Verify API Key**: Ensure it's correctly copied
3. **Check Domain Verification**: Must be verified in Resend
4. **Review Logs**: Check `logs/error.log` for email errors

**Solutions**:
```bash
# Check email configuration
grep EMAIL .env

# Review email errors
cat logs/error.log | grep -i email

# Verify circuit breaker status
# Look for "Circuit breaker" messages in console output
```

### Issue 7: Application Crashes

**Symptoms**: Application exits unexpectedly

**Debugging Steps**:
1. **Check Error Logs**: Review `logs/error.log`
2. **Run in Development Mode**: Use `npm run dev` for detailed logging
3. **Check System Resources**: Ensure adequate memory/disk space

**Common Causes**:
- Out of memory
- Disk space full
- Network connectivity issues
- Invalid configuration

### Issue 8: High CPU/Memory Usage

**Symptoms**: System performance degradation

**Solutions**:
1. **Increase Check Interval**: Set `STOCK_CHECK_INTERVAL` to higher value
2. **Monitor Log Sizes**: Check `logs/` directory for large files
3. **Restart Application**: Fresh start can resolve memory leaks

---

## 🎯 Next Steps

After successful setup:

1. **Let it Run**: Allow the application to monitor for several hours
2. **Monitor Logs**: Regularly check `data/stock-checks.json` and `logs/`
3. **Test Email Delivery**: Wait for daily summary or status change
4. **Optimize Settings**: Adjust monitoring interval based on your needs
5. **Read Full Documentation**: Review [README.md](README.md) for advanced usage

### Recommended Schedule
- **Check Interval**: 5-10 minutes (balance between responsiveness and politeness)
- **Daily Summary**: Morning time when you check email regularly
- **Log Review**: Weekly check of error logs for issues

---

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. **Check Error Logs**: Always start with `logs/error.log`
2. **Verify Configuration**: Double-check all environment variables
3. **Test Components**: Try testing email service separately
4. **Check System Resources**: Ensure adequate memory and disk space
5. **Review Documentation**: Check [README.md](README.md) troubleshooting section

---

*Setup guide last updated: June 10, 2025* 