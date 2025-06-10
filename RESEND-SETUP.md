# Resend Email Service Setup Guide

📧 **Complete guide for configuring Resend email service for Nintendo Switch 2 Stock Monitor**

This guide provides step-by-step instructions for setting up Resend email service, including account creation, domain verification, DNS configuration, and API key management.

---

## 📋 Table of Contents

1. [What is Resend?](#-what-is-resend)
2. [Create Resend Account](#-create-resend-account)
3. [Domain Verification Process](#-domain-verification-process)
4. [DNS Record Setup](#-dns-record-setup)
5. [API Key Generation](#-api-key-generation)
6. [Email Testing](#-email-testing)
7. [Security Best Practices](#-security-best-practices)
8. [Troubleshooting](#-troubleshooting)

---

## 📬 What is Resend?

**Resend** is a modern email API service designed for developers to send transactional emails reliably. It offers:

- **High Delivery Rates**: Industry-leading email deliverability
- **Simple API**: Easy integration with minimal code
- **Domain Authentication**: Full SPF, DKIM, and DMARC support
- **Real-time Analytics**: Track email delivery and engagement
- **Free tier**: Generous limits for personal projects

### Why Resend for Stock Monitoring?

- **Reliability**: Ensures stock alerts reach your inbox
- **Speed**: Near-instant email delivery
- **Deliverability**: Professional email authentication
- **Monitoring**: Track email success/failure rates
- **Cost-effective**: Free tier covers typical stock monitoring needs

---

## 🎯 Create Resend Account

### Step 1: Visit Resend Website

1. **Navigate to**: [resend.com](https://resend.com)
2. **Click "Get Started"** or **"Sign Up"**

### Step 2: Account Registration

1. **Enter your information**:
   - **Email Address**: Use a reliable email you check regularly
   - **Password**: Choose a strong, unique password
   - **Name**: Your full name or company name

2. **Complete registration**:
   - Click **"Create Account"**
   - Accept terms of service and privacy policy

### Step 3: Email Verification

1. **Check your email** for verification message from Resend
2. **Click the verification link** in the email
3. **Confirm your account** is verified

### Step 4: Initial Setup

1. **Log into your Resend dashboard**
2. **Complete onboarding** if prompted
3. **Familiarize yourself** with the dashboard layout

---

## 🏠 Domain Verification Process

Domain verification is **highly recommended** for reliable email delivery. This process proves you own the domain you're sending emails from.

### Option 1: Use Your Own Domain (Recommended)

If you own a domain (like `jaril.com`), follow these steps:

#### Step 1: Add Domain to Resend

1. **In Resend Dashboard**, click **"Domains"** in the sidebar
2. **Click "Add Domain"**
3. **Enter your domain name**: `jaril.com` (without subdomain)
4. **Click "Add Domain"**

#### Step 2: Choose Authentication Method

Resend will show DNS records you need to add. You'll see:

**Required DNS Records**:
- **SPF Record** (TXT): Authorizes Resend to send emails for your domain
- **DKIM Record** (TXT): Cryptographic signature for email authentication
- **DMARC Record** (TXT): Email authentication policy
- **MX Record** (Optional): For receiving bounce notifications

### Option 2: Use Resend Subdomain

If you don't own a domain, you can use Resend's shared sending domain:

1. **Skip domain verification** for now
2. **Use provided Resend domain** for sending
3. **Note**: Lower deliverability than verified domains

---

## 🌐 DNS Record Setup

This section explains how to add the required DNS records to verify your domain. Instructions vary by DNS provider.

### Understanding DNS Records

**SPF (Sender Policy Framework)**:
- **Purpose**: Authorizes Resend to send emails on behalf of your domain
- **Type**: TXT record
- **Name**: `@` or your domain name
- **Value**: `v=spf1 include:_spf.resend.com ~all`

**DKIM (DomainKeys Identified Mail)**:
- **Purpose**: Adds cryptographic signature to emails
- **Type**: TXT record
- **Name**: Provided by Resend (e.g., `resend._domainkey`)
- **Value**: Long cryptographic key provided by Resend

**DMARC (Domain-based Message Authentication)**:
- **Purpose**: Defines policy for email authentication failures
- **Type**: TXT record
- **Name**: `_dmarc`
- **Value**: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

### DNS Provider Instructions

#### Cloudflare (Popular Choice)

1. **Log in to Cloudflare Dashboard**
2. **Select your domain**
3. **Go to DNS section**
4. **Add each record**:

**For SPF Record**:
- **Type**: TXT
- **Name**: `@`
- **Content**: `v=spf1 include:_spf.resend.com ~all`
- **TTL**: Auto

**For DKIM Record**:
- **Type**: TXT
- **Name**: `resend._domainkey` (or as provided by Resend)
- **Content**: [Long key provided by Resend]
- **TTL**: Auto

**For DMARC Record**:
- **Type**: TXT
- **Name**: `_dmarc`
- **Content**: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
- **TTL**: Auto

#### GoDaddy

1. **Log in to GoDaddy Account**
2. **Go to My Products → DNS**
3. **Manage DNS for your domain**
4. **Add TXT records** with the same values as above

#### Namecheap

1. **Log in to Namecheap Account**
2. **Manage Domain**
3. **Advanced DNS tab**
4. **Add New Record** for each TXT record

#### Google Domains

1. **Log in to Google Domains**
2. **Select your domain**
3. **DNS section**
4. **Custom records** → Add TXT records

### DNS Propagation

After adding DNS records:

1. **Wait for propagation**: Can take 5 minutes to 48 hours
2. **Check propagation status**:
   ```bash
   # Check SPF record
   dig TXT yourdomain.com | grep spf
   
   # Check DKIM record
   dig TXT resend._domainkey.yourdomain.com
   
   # Check DMARC record
   dig TXT _dmarc.yourdomain.com
   ```

3. **Use online tools**: [whatsmydns.net](https://whatsmydns.net) for checking propagation

---

## 🔑 API Key Generation

### Step 1: Navigate to API Keys

1. **In Resend Dashboard**, click **"API Keys"** in the sidebar
2. **Review existing keys** (if any)

### Step 2: Create New API Key

1. **Click "Create API Key"**
2. **Configure the key**:
   - **Name**: `Nintendo Switch Monitor` (descriptive name)
   - **Permission**: Select appropriate level:
     - **Sending access**: Recommended for stock monitor
     - **Full access**: If you need additional features
   - **Domain restriction**: Select your verified domain (optional but recommended)

3. **Click "Create"**

### Step 3: Copy and Secure API Key

⚠️ **Important**: You can only see the API key once!

1. **Copy the API key** immediately (starts with `re_`)
2. **Store it securely** in your password manager
3. **Add to your project's `.env` file**:
   ```env
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

### API Key Format

Valid Resend API keys:
- **Start with**: `re_`
- **Length**: Approximately 50-60 characters
- **Characters**: Letters, numbers, and underscores
- **Example**: `re_123abc456def789ghi012jkl345mno678pqr901stu`

---

## 🧪 Email Testing

### Step 1: Test Domain Verification

Before testing with your application, verify domain setup:

1. **In Resend Dashboard**:
   - Go to **"Domains"**
   - Check your domain status
   - Should show **"Verified"** with green checkmark

2. **If not verified**:
   - Review DNS records
   - Wait for DNS propagation
   - Use DNS checking tools

### Step 2: Send Test Email via Dashboard

1. **In Resend Dashboard**, go to **"Emails"**
2. **Click "Send Test Email"** or similar option
3. **Configure test email**:
   - **From**: `alerts@yourdomain.com`
   - **To**: Your personal email
   - **Subject**: `Test Email from Resend`
   - **Content**: Simple test message

4. **Send and verify** you receive the email

### Step 3: Test with Stock Monitor Application

1. **Configure your `.env` file** with:
   ```env
   FROM_EMAIL=alerts@yourdomain.com
   TO_EMAIL=your-personal-email@gmail.com
   RESEND_API_KEY=re_your_api_key_here
   ```

2. **Run the application**:
   ```bash
   npm start
   ```

3. **Wait for daily summary** or trigger a test email

### Step 4: Verify Email Delivery

1. **Check your inbox** for emails from your domain
2. **Check spam folder** if not in inbox
3. **Review email headers** to confirm authentication

Expected email authentication:
- **SPF**: `PASS`
- **DKIM**: `PASS`
- **DMARC**: `PASS`

---

## 🔒 Security Best Practices

### API Key Security

1. **Never commit API keys** to version control
2. **Use environment variables** only
3. **Rotate keys regularly** (monthly recommended)
4. **Use least privilege**: Grant minimum required permissions
5. **Monitor usage** in Resend dashboard

### Domain Security

1. **Secure DNS management**: Use strong passwords for DNS provider
2. **Enable 2FA** on DNS provider account
3. **Monitor DNS changes**: Set up alerts for unauthorized changes
4. **Review DMARC reports**: Monitor for unauthorized sending

### Email Security

1. **Verify recipient emails**: Only send to intended recipients
2. **Monitor sending patterns**: Watch for unusual activity
3. **Implement rate limiting**: Don't exceed Resend's limits
4. **Log email activity**: Track successful/failed sends

### Environment Security

```env
# ✅ Good - Environment variables
RESEND_API_KEY=re_your_key_here

# ❌ Bad - Hardcoded in code
const apiKey = "re_your_key_here";
```

---

## 🔧 Troubleshooting

### Issue 1: Domain Not Verifying

**Symptoms**: Domain shows "Pending" or "Failed" status

**Solutions**:
1. **Check DNS records**: Verify all TXT records are added correctly
2. **Wait for propagation**: Can take up to 48 hours
3. **Check for typos**: Ensure exact values from Resend dashboard
4. **Test DNS propagation**: Use online tools to verify records

**Debugging Commands**:
```bash
# Check SPF record
dig TXT yourdomain.com | grep resend

# Check DKIM record
dig TXT resend._domainkey.yourdomain.com

# Use online checker
# Visit: mxtoolbox.com/spf.aspx
```

### Issue 2: Emails Not Delivered

**Symptoms**: No emails received despite no errors

**Common Causes**:
1. **Unverified domain**: Using unverified sending domain
2. **Incorrect FROM_EMAIL**: Not matching verified domain
3. **API key issues**: Invalid or insufficient permissions
4. **Spam filtering**: Emails going to spam folder

**Solutions**:
1. **Verify domain status** in Resend dashboard
2. **Check FROM_EMAIL** matches verified domain:
   ```env
   # ✅ Correct - matches verified domain
   FROM_EMAIL=alerts@yourdomain.com
   
   # ❌ Incorrect - unverified domain
   FROM_EMAIL=alerts@gmail.com
   ```
3. **Check spam folder** and mark as not spam
4. **Review API key permissions**

### Issue 3: API Key Errors

**Error Messages**:
```
401 Unauthorized: Invalid API key
403 Forbidden: Insufficient permissions
```

**Solutions**:
1. **Verify API key format**: Should start with `re_`
2. **Check key permissions**: Ensure "Sending access" is enabled
3. **Generate new key**: If old key is compromised
4. **Update .env file**: Ensure no extra spaces or quotes

### Issue 4: Rate Limiting

**Error Messages**:
```
429 Too Many Requests: Rate limit exceeded
```

**Solutions**:
1. **Check your limits** in Resend dashboard
2. **Implement exponential backoff** (already done in stock monitor)
3. **Reduce email frequency** if needed
4. **Upgrade plan** if hitting limits regularly

### Issue 5: DNS Propagation Issues

**Symptoms**: DNS records not appearing in online checkers

**Solutions**:
1. **Wait longer**: DNS propagation can take 24-48 hours
2. **Clear DNS cache**:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemctl restart systemd-resolved
   ```
3. **Check with multiple tools**: Different DNS servers may have different timing

### Issue 6: DMARC Policy Issues

**Symptoms**: Emails marked as spam or rejected

**Solutions**:
1. **Start with relaxed policy**:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```
2. **Monitor DMARC reports** before tightening policy
3. **Gradually increase policy** from `none` → `quarantine` → `reject`

---

## 📊 Monitoring and Analytics

### Resend Dashboard Analytics

1. **Email Overview**: Total sent, delivered, bounced
2. **Delivery Rates**: Success percentage over time
3. **Error Analysis**: Common failure reasons
4. **Domain Health**: Authentication success rates

### What to Monitor

1. **Delivery Rate**: Should be >95% for good setup
2. **Bounce Rate**: Should be <5%
3. **Authentication**: SPF/DKIM/DMARC should pass
4. **API Usage**: Stay within rate limits

### Setting Up Monitoring

1. **Enable webhooks** in Resend for real-time notifications
2. **Set up DMARC reporting** to monitor domain usage
3. **Regular review** of dashboard analytics
4. **Alert on unusual patterns** (high bounce rates, etc.)

---

## 🎯 Domain Verification for jaril.com

Since the user mentioned `jaril.com`, here's a specific example:

### DNS Records for jaril.com

Add these TXT records to your `jaril.com` DNS:

```
# SPF Record
Name: @
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all

# DKIM Record (example - use actual value from Resend)
Name: resend._domainkey
Type: TXT
Value: k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...

# DMARC Record
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@jaril.com
```

### Email Configuration for jaril.com

In your `.env` file:
```env
FROM_EMAIL=alerts@jaril.com
TO_EMAIL=your-personal-email@gmail.com
RESEND_API_KEY=re_your_api_key_here
```

---

## 📞 Getting Help

### Resend Support Resources

1. **Documentation**: [resend.com/docs](https://resend.com/docs)
2. **Community**: Discord/Slack channels
3. **Support Email**: For paid plans
4. **GitHub Issues**: For technical problems

### DNS Provider Support

1. **Cloudflare**: Comprehensive documentation and community
2. **GoDaddy**: Phone and chat support
3. **Namecheap**: Knowledge base and ticket system
4. **Google Domains**: Help center and community forums

### Additional Resources

1. **MX Toolbox**: [mxtoolbox.com](https://mxtoolbox.com) - DNS testing tools
2. **What's My DNS**: [whatsmydns.net](https://whatsmydns.net) - DNS propagation checker
3. **DMARC Analyzer**: [dmarcanalyzer.com](https://dmarcanalyzer.com) - DMARC testing

---

## ✅ Verification Checklist

Before completing Resend setup, verify:

- [ ] **Resend account created and verified**
- [ ] **Domain added to Resend**
- [ ] **All DNS records added (SPF, DKIM, DMARC)**
- [ ] **DNS propagation completed** (check with online tools)
- [ ] **Domain status shows "Verified"** in Resend dashboard
- [ ] **API key generated and secured**
- [ ] **Test email sent successfully**
- [ ] **FROM_EMAIL configured correctly** in `.env`
- [ ] **No authentication failures** in email headers
- [ ] **Stock monitor application configured** with email settings

---

*Resend setup guide last updated: June 10, 2025* 