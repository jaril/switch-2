# GitHub Actions Deployment Guide

🚀 **Complete guide for deploying Nintendo Switch 2 Stock Monitor to GitHub Actions**

This guide walks you through deploying the stock monitor to GitHub Actions using GitHub's free tier, including repository setup, secrets configuration, and workflow monitoring.

---

## 📋 Table of Contents

1. [GitHub Actions Overview](#-github-actions-overview)
2. [Repository Setup](#-repository-setup)
3. [Repository Secrets Configuration](#-repository-secrets-configuration)
4. [Enabling GitHub Actions](#-enabling-github-actions)
5. [Workflow Configuration](#-workflow-configuration)
6. [Migration from Local](#-migration-from-local)
7. [Monitoring and Troubleshooting](#-monitoring-and-troubleshooting)
8. [Free Tier Limitations](#-free-tier-limitations)
9. [Security Best Practices](#-security-best-practices)

---

## 🎯 GitHub Actions Overview

### What is GitHub Actions?

**GitHub Actions** is GitHub's built-in CI/CD platform that allows you to automate workflows directly in your repository. For the Nintendo Switch 2 Stock Monitor, it provides:

- **Scheduled Execution**: Run stock checks every 30 minutes automatically
- **Free Tier**: 2,000 minutes/month for public repositories, 500 minutes/month for private
- **No Server Management**: GitHub handles infrastructure and maintenance
- **Integrated Logging**: Built-in logs and artifact storage
- **Email Notifications**: Workflow failure notifications

### Deployment Architecture

```
GitHub Repository
├── Source Code
├── GitHub Actions Workflow (.github/workflows/stock-monitor.yml)
├── Secrets (Environment Variables)
└── Workflow Executions
    ├── Stock Check (every 30 minutes)
    ├── Daily Summary (midnight UTC)
    └── Health Check (manual trigger)
```

### Benefits vs Local Deployment

| Aspect | Local Deployment | GitHub Actions |
|--------|------------------|----------------|
| **Cost** | Electricity + Hardware | Free (with limits) |
| **Reliability** | Depends on your system | GitHub's infrastructure |
| **Maintenance** | Manual updates/restarts | Automatic |
| **Monitoring** | Local logs only | GitHub's web interface |
| **Accessibility** | Local network only | Accessible anywhere |

---

## 📦 Repository Setup

### Step 1: Create GitHub Repository

1. **Log in to GitHub**: [github.com](https://github.com)
2. **Create new repository**:
   - Click **"New"** or **"+"** → **"New repository"**
   - **Repository name**: `nintendo-switch-monitor` (or your preferred name)
   - **Visibility**: 
     - **Public**: 2,000 free minutes/month
     - **Private**: 500 free minutes/month (recommended for personal use)
   - **Initialize**: Don't add README, .gitignore, or license (we'll add our own)
   - Click **"Create repository"**

### Step 2: Upload Project Files

#### Option 1: Using Git Command Line

```bash
# Navigate to your local project directory
cd /path/to/nintendo-switch-monitor

# Initialize git repository (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/nintendo-switch-monitor.git

# Create .gitignore to exclude sensitive files
cat > .gitignore << EOF
# Environment files
.env
.env.local
.env.production

# Dependencies
node_modules/

# Logs
logs/*.log
*.log

# Data files (optional - you may want to keep these)
data/stock-checks.json

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
EOF

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Nintendo Switch 2 Stock Monitor"

# Push to GitHub
git push -u origin main
```

#### Option 2: Using GitHub Web Interface

1. **Navigate to your repository** on GitHub
2. **Upload files**:
   - Click **"uploading an existing file"**
   - Drag and drop your project files (exclude .env, node_modules, logs)
   - Add commit message: "Initial commit: Nintendo Switch 2 Stock Monitor"
   - Click **"Commit changes"**

### Step 3: Verify Repository Structure

Your GitHub repository should contain:

```
nintendo-switch-monitor/
├── .github/
│   └── workflows/
│       └── stock-monitor.yml        # GitHub Actions workflow
├── src/                             # Application source code
├── package.json                     # Updated with GitHub Actions scripts
├── package-lock.json               # Dependency lock file
├── README.md                       # Project documentation
├── SETUP.md                        # Local setup guide
├── RESEND-SETUP.md                 # Email setup guide
├── CONFIGURATION.md                # Configuration guide
├── GITHUB-DEPLOYMENT.md            # This file
└── .gitignore                      # Git ignore rules
```

---

## 🔐 Repository Secrets Configuration

GitHub repository secrets store sensitive environment variables securely. These are accessible to GitHub Actions but hidden from public view.

### Step 1: Access Repository Secrets

1. **Navigate to your repository** on GitHub
2. **Go to Settings**:
   - Click **"Settings"** tab (top of repository)
   - Click **"Secrets and variables"** in left sidebar
   - Click **"Actions"**

### Step 2: Add Required Secrets

Add each of the following secrets by clicking **"New repository secret"**:

#### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PRODUCT_URL` | Costco product page URL | `https://www.costco.com/nintendo-switch-2...` |
| `FROM_EMAIL` | Sender email (verified domain) | `alerts@yourdomain.com` |
| `TO_EMAIL` | Your notification email | `your-email@gmail.com` |
| `RESEND_API_KEY` | Resend service API key | `re_abc123def456...` |

#### Adding Each Secret

For each secret:

1. **Click "New repository secret"**
2. **Name**: Enter the secret name exactly as shown above
3. **Secret**: Enter the secret value (no quotes needed)
4. **Click "Add secret"**

### Step 3: Verify Secrets Configuration

After adding all secrets, you should see:

```
Repository secrets (4)
├── PRODUCT_URL              ************
├── FROM_EMAIL               ************  
├── TO_EMAIL                 ************
└── RESEND_API_KEY           ************
```

### Secret Security Notes

⚠️ **Important Security Information**:
- Secrets are encrypted and only accessible to GitHub Actions
- Repository collaborators with write access can use secrets in workflows
- Secrets are not visible in workflow logs
- Use different API keys for GitHub Actions vs local development

---

## ⚙️ Enabling GitHub Actions

### Step 1: Verify Actions are Enabled

1. **Go to repository "Actions" tab**
2. **Check status**:
   - If enabled: You'll see "Get started with GitHub Actions"
   - If disabled: You'll see a message about Actions being disabled

### Step 2: Enable Actions (if needed)

1. **Go to repository "Settings"**
2. **Click "Actions"** in left sidebar
3. **Click "General"**
4. **Under "Actions permissions"**:
   - Select **"Allow all actions and reusable workflows"** (recommended)
   - Or **"Allow select actions and reusable workflows"** (more restrictive)
5. **Click "Save"**

### Step 3: Configure Workflow Permissions

1. **Still in Settings → Actions → General**
2. **Scroll to "Workflow permissions"**
3. **Select**:
   - **"Read and write permissions"** (recommended for artifact uploads)
   - Check **"Allow GitHub Actions to create and approve pull requests"** if needed
4. **Click "Save"**

---

## 🔧 Workflow Configuration

The GitHub Actions workflow is defined in `.github/workflows/stock-monitor.yml` and includes three jobs:

### Job 1: Stock Check (Every 30 minutes)

```yaml
# Runs: Every 30 minutes (48 times per day)
# Duration: ~2-3 minutes per run
# Monthly usage: ~144-216 minutes
```

**Functionality**:
- Checks Nintendo Switch 2 stock status
- Sends email if stock status changes
- Uploads logs and data as artifacts
- Sends failure notification if workflow fails

### Job 2: Daily Summary (Midnight UTC)

```yaml
# Runs: Once per day at midnight UTC
# Duration: ~3-5 minutes per run  
# Monthly usage: ~93-155 minutes
```

**Functionality**:
- Downloads previous stock check data
- Merges data from multiple workflow runs
- Generates and sends daily summary email
- Uploads comprehensive logs and data

### Job 3: Health Check (Manual only)

```yaml
# Runs: Manual trigger only
# Duration: ~1-2 minutes per run
# Monthly usage: Minimal (user-triggered)
```

**Functionality**:
- Tests application health and configuration
- Validates email service connectivity
- Useful for troubleshooting workflow issues

### Workflow Features

#### Scheduling
- **Cron expressions** define when workflows run
- **UTC timezone** used for all schedules
- **Manual triggers** available for testing

#### Error Handling
- **Failure notifications** sent via email
- **Artifact uploads** preserve logs even on failure
- **Continue-on-error** for non-critical steps

#### Data Persistence
- **Artifacts** store logs and data between runs
- **7-day retention** for stock check logs
- **30-day retention** for daily summary data

---

## 🔄 Migration from Local

### Step 1: Test Local Setup First

Before migrating, ensure your local setup works correctly:

```bash
# Test configuration
npm run stock-check

# Verify email functionality
# Check that you receive test emails

# Review logs
cat logs/error.log
```

### Step 2: Update package.json

The application needs GitHub Actions-compatible scripts. Update your `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "stock-check": "node src/github-stock-check.js",
    "daily-summary": "node src/github-daily-summary.js", 
    "health-check": "node src/github-health-check.js",
    "notify-failure": "node src/github-notify-failure.js"
  }
}
```

### Step 3: Migration Process

1. **Stop local application** (if running)
2. **Upload code to GitHub** (see Repository Setup)
3. **Configure secrets** (see Secrets Configuration)
4. **Test workflow manually**:
   - Go to Actions tab
   - Click "Nintendo Switch 2 Stock Monitor"
   - Click "Run workflow"
   - Select "stock-check" and click "Run workflow"
5. **Monitor first runs** and verify functionality
6. **Enable scheduled runs** by ensuring workflow file is in main branch

### Step 4: Verify Migration

Check that GitHub Actions deployment works:

- [ ] **Manual workflow runs successfully**
- [ ] **Stock check emails received**
- [ ] **No errors in workflow logs**
- [ ] **Artifacts uploaded correctly**
- [ ] **Scheduled runs execute on time**

---

## 📊 Monitoring and Troubleshooting

### Monitoring Workflow Executions

#### GitHub Actions Dashboard

1. **Go to repository "Actions" tab**
2. **View workflow runs**:
   - **Green checkmark**: Successful run
   - **Red X**: Failed run  
   - **Yellow circle**: Running
   - **Gray circle**: Queued

#### Workflow Run Details

Click any workflow run to see:
- **Summary**: Overall status and timing
- **Jobs**: Individual job status (stock-check, daily-summary)
- **Steps**: Detailed step-by-step execution
- **Artifacts**: Uploaded logs and data files

#### Log Analysis

```bash
# Download artifacts from GitHub
# Click on workflow run → Artifacts section → Download

# Extract and analyze
unzip stock-check-logs-*.zip
cat logs/error.log
cat data/stock-checks.json | jq '.'
```

### Common Issues and Solutions

#### Issue 1: Workflow Not Running

**Symptoms**: No scheduled workflow executions

**Causes**:
- Repository is private and out of free minutes
- Workflow file syntax errors
- Actions disabled in repository settings

**Solutions**:
```bash
# Check workflow file syntax
yamllint .github/workflows/stock-monitor.yml

# Verify file is in main branch
git branch
git log --oneline | head -5
```

#### Issue 2: Secret Not Found Errors

**Symptoms**: 
```
Error: Environment variable RESEND_API_KEY is not set
```

**Solutions**:
1. **Verify secret names** match exactly (case-sensitive)
2. **Check secret values** don't have extra spaces
3. **Ensure secrets are added** to correct repository

#### Issue 3: Email Not Sending

**Symptoms**: Workflow succeeds but no emails received

**Debugging**:
1. **Check spam folder** first
2. **Verify Resend domain** is still verified
3. **Test API key** in Resend dashboard
4. **Review workflow logs** for email errors

#### Issue 4: Artifact Upload Failures

**Symptoms**: 
```
Error: Artifact upload failed
```

**Solutions**:
- **Check file paths** in workflow
- **Verify directories exist** before upload
- **Ensure artifacts are under 500MB**

### Troubleshooting Commands

```bash
# Test workflow syntax locally
act --list  # Requires 'act' tool

# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('.github/workflows/stock-monitor.yml'))"

# Test secret access (in workflow)
echo "Testing secret access:"
echo "FROM_EMAIL length: ${#FROM_EMAIL}"
echo "API_KEY starts with: ${RESEND_API_KEY:0:3}"
```

---

## 💰 Free Tier Limitations

### GitHub Actions Free Tier

#### Public Repositories
- **2,000 minutes/month** free
- **Unlimited** workflow runs
- **1 GB** artifact storage

#### Private Repositories  
- **500 minutes/month** free
- **Unlimited** workflow runs
- **500 MB** artifact storage

### Usage Calculations

#### Current Workflow Usage

**Stock Check Job**:
- **Frequency**: Every 30 minutes (48 times/day)
- **Duration**: ~2-3 minutes per run
- **Monthly**: 48 × 30 × 2.5 = **3,600 minutes**

**Daily Summary Job**:
- **Frequency**: Once per day
- **Duration**: ~3-5 minutes per run  
- **Monthly**: 30 × 4 = **120 minutes**

**Total Monthly Usage**: ~3,720 minutes

#### ⚠️ Important: Exceeds Free Tier

The current 30-minute schedule **exceeds** GitHub's free tier limits. Consider these alternatives:

### Alternative Schedules (Within Free Tier)

#### Option 1: Hourly Checks (Recommended)
```yaml
schedule:
  - cron: '0 * * * *'  # Every hour
```
**Usage**: 24 × 30 × 2.5 = **1,800 minutes/month** ✅

#### Option 2: Every 2 Hours  
```yaml
schedule:
  - cron: '0 */2 * * *'  # Every 2 hours
```
**Usage**: 12 × 30 × 2.5 = **900 minutes/month** ✅

#### Option 3: Business Hours Only
```yaml
schedule:
  - cron: '0 9-17 * * 1-5'  # 9 AM - 5 PM, weekdays only
```
**Usage**: 9 × 5 × 4.3 × 2.5 = **483 minutes/month** ✅

### Managing Usage

#### Monitor Usage
1. **Go to GitHub Settings** (your profile, not repository)
2. **Click "Billing and plans"**
3. **View "Plans and usage"**
4. **Check Actions minutes** used

#### Usage Optimization
- **Reduce frequency** during low-activity periods
- **Optimize job duration** by reducing dependencies
- **Use conditional runs** to skip unnecessary executions
- **Consider paid plan** if frequent monitoring is critical

---

## 🔒 Security Best Practices

### Repository Security

#### Public vs Private Repositories

**Public Repository**:
- ✅ More free minutes (2,000 vs 500)
- ✅ Better for open source projects
- ❌ Code is publicly visible
- ❌ Potential security risks

**Private Repository** (Recommended):
- ✅ Code remains private
- ✅ Better security
- ❌ Fewer free minutes (500)
- ❌ May need paid plan for frequent runs

#### Access Control

```yaml
# Limit workflow permissions
permissions:
  contents: read
  actions: read
```

### Secret Management

#### Secret Rotation
- **Rotate API keys** monthly
- **Use different keys** for different environments
- **Monitor key usage** in Resend dashboard

#### Secret Validation
```bash
# Add secret validation to workflows
- name: Validate secrets
  run: |
    if [ -z "$RESEND_API_KEY" ]; then
      echo "Error: RESEND_API_KEY not set"
      exit 1
    fi
    if [[ ! "$RESEND_API_KEY" =~ ^re_ ]]; then
      echo "Error: Invalid RESEND_API_KEY format"
      exit 1
    fi
```

### Network Security

#### Outbound Connections
GitHub Actions runners only make outbound connections to:
- Costco website (stock checking)
- Resend API (email sending)
- GitHub itself (artifacts, logs)

#### Data Privacy
- **No personal data** stored beyond email addresses
- **Stock data** contains only public information
- **Logs** contain operational data only

---

## 📈 Advanced Configuration

### Custom Schedules by Region

Different schedules based on when restocks typically occur:

```yaml
# Multiple schedules for different purposes
schedule:
  # Peak restock times (more frequent)
  - cron: '0 6,12,18 * * *'    # 6 AM, noon, 6 PM UTC
  
  # Regular monitoring (less frequent)  
  - cron: '30 */2 * * *'       # Every 2 hours at :30
  
  # Daily summary
  - cron: '0 0 * * *'          # Midnight UTC
```

### Environment-Specific Configuration

```yaml
# Different behavior for different events
env:
  STOCK_CHECK_INTERVAL: ${{ github.event.schedule == '*/30 * * * *' && '1800000' || '3600000' }}
  LOG_LEVEL: ${{ github.event_name == 'workflow_dispatch' && 'debug' || 'info' }}
```

### Artifact Management

```yaml
# Intelligent artifact retention
- name: Upload artifacts with smart retention
  uses: actions/upload-artifact@v4
  with:
    name: logs-${{ github.run_number }}
    path: logs/
    retention-days: ${{ github.event.schedule == '0 0 * * *' && 30 || 7 }}
```

---

## 🎯 Success Checklist

Before going live with GitHub Actions deployment:

### Repository Setup ✅
- [ ] **Repository created** on GitHub
- [ ] **All source code uploaded** (excluding .env, node_modules)
- [ ] **Workflow file present** at `.github/workflows/stock-monitor.yml`
- [ ] **`.gitignore configured** to exclude sensitive files

### Secrets Configuration ✅
- [ ] **All required secrets added** (PRODUCT_URL, FROM_EMAIL, TO_EMAIL, RESEND_API_KEY)
- [ ] **Secret names match exactly** (case-sensitive)
- [ ] **Secret values are correct** (no extra spaces/quotes)
- [ ] **API key format validated** (starts with `re_`)

### GitHub Actions Setup ✅
- [ ] **Actions enabled** in repository settings
- [ ] **Workflow permissions configured** (read/write access)
- [ ] **First manual run successful**
- [ ] **Stock check email received**
- [ ] **Artifacts uploaded correctly**

### Monitoring Setup ✅
- [ ] **Workflow executions visible** in Actions tab
- [ ] **Email notifications working** for successes
- [ ] **Failure notifications configured**
- [ ] **Usage monitoring enabled** (billing dashboard)

---

## 📞 Getting Help

### GitHub-Specific Issues

1. **GitHub Actions Documentation**: [docs.github.com/actions](https://docs.github.com/actions)
2. **Workflow Syntax**: [docs.github.com/actions/reference/workflow-syntax-for-github-actions](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)
3. **GitHub Community**: [github.community](https://github.community)

### Application Issues

1. **Check workflow logs** first (Actions tab → specific run)
2. **Download artifacts** for detailed error analysis
3. **Test locally** with same environment variables
4. **Review application documentation** (README.md, SETUP.md)

### Common Support Scenarios

| Issue | First Check | Solution |
|-------|-------------|----------|
| No emails | Spam folder | Check Resend dashboard |
| Workflow fails | Secrets configured | Verify secret names/values |
| High usage | Billing dashboard | Reduce frequency or upgrade |
| No scheduled runs | Actions enabled | Check repository settings |

---

*GitHub deployment guide last updated: June 10, 2025* 