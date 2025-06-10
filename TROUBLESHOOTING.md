# Troubleshooting Guide

🔧 **Comprehensive troubleshooting guide for Nintendo Switch 2 Stock Monitor**

---

## 📋 Common Issues

### 1. Application Won't Start

**Symptoms**: Error on `npm start`
```bash
Error: Missing required configuration: RESEND_API_KEY
```

**Solutions**:
- ✅ Verify `.env` file exists and contains all required variables
- ✅ Check that `RESEND_API_KEY` is correctly set
- ✅ Ensure no syntax errors in `.env` file (no spaces around `=`)
- ✅ Verify Node.js version is 18.0.0 or higher: `node --version`

**Check Configuration**:
```bash
# Verify all required variables are set
cat .env | grep -E "PRODUCT_URL|FROM_EMAIL|TO_EMAIL|RESEND_API_KEY"

# Test configuration loading
node -e "console.log(require('./src/config.js'))"
```

### 2. No Email Notifications

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

**Common Causes & Solutions**:
- **Invalid Resend API key**: Verify key starts with `re_` and is valid in Resend dashboard
- **Unverified sender domain**: Check domain verification in Resend console
- **Network connectivity issues**: Test internet connection and DNS resolution
- **Circuit breaker open**: Wait for automatic reset or restart application
- **Rate limiting**: Check Resend usage limits and current usage

**Email Service Test**:
```bash
# Verify Resend API key format
echo $RESEND_API_KEY | grep "^re_" && echo "✅ API key format valid" || echo "❌ Invalid API key format"
```

### 3. Stock Checks Failing

**Symptoms**: Continuous network errors in logs
```
❌ Stock check failed after retries: Request timeout
```

**Solutions**:
- ✅ Check internet connectivity: `ping google.com`
- ✅ Verify Costco website accessibility: `curl -I https://www.costco.com`
- ✅ Wait for automatic retry with exponential backoff
- ✅ Check if Costco has changed their product page structure
- ✅ Verify PRODUCT_URL is still valid

**Network Diagnostics**:
```bash
# Test network connectivity
ping -c 3 www.costco.com

# Test HTTP connectivity
curl -I "$PRODUCT_URL"

# Check DNS resolution
nslookup www.costco.com
```

### 4. High Memory Usage

**Symptoms**: Application consuming excessive memory (>200MB)

**Solutions**:
- ✅ Check log file sizes: `du -sh logs/`
- ✅ Verify log rotation is working
- ✅ Review `data/stock-checks.json` file size: `ls -lh data/`
- ✅ Restart application to reset memory usage
- ✅ Clear old logs if excessive: `find logs/ -name "*.log" -mtime +7 -delete`

**Memory Monitoring**:
```bash
# Check memory usage
ps aux | grep node

# Monitor log file sizes
find logs/ -name "*.log" -exec ls -lh {} \;

# Check data file size
ls -lh data/stock-checks.json
```

### 5. Permission Errors

**Symptoms**: File system errors
```
EACCES: permission denied, mkdir 'data'
ENOENT: no such file or directory, open 'logs/error.log'
```

**Solutions**:
```bash
# Fix directory permissions
chmod 755 .
mkdir -p data logs
chmod 755 data logs

# Fix file permissions
chmod 644 data/*.json 2>/dev/null || true
chmod 644 logs/*.log 2>/dev/null || true
```

**Permission Verification**:
```bash
# Check current permissions
ls -la data/ logs/

# Test write permissions
echo "test" > data/test.txt && rm data/test.txt && echo "✅ Data directory writable"
echo "test" > logs/test.log && rm logs/test.log && echo "✅ Logs directory writable"
```

### 6. Application Crashes

**Symptoms**: Application exits unexpectedly

**Debugging**:
```bash
# Check for crash logs
cat logs/error.log | tail -20

# Run with detailed logging
DEBUG=true NODE_ENV=development npm start

# Check system resources
free -h  # Linux
top -l 1 | head -10  # macOS
```

**Common Causes**:
- Out of memory
- Unhandled promise rejections
- Network timeouts
- Configuration errors

### 7. Emails Going to Spam

**Symptoms**: Emails sent but going to spam folder

**Solutions**:
- ✅ Verify sending domain is properly authenticated in Resend
- ✅ Check DKIM and SPF records are correctly configured
- ✅ Ensure FROM_EMAIL uses a verified domain
- ✅ Avoid spam trigger words in email content
- ✅ Add sending domain to email whitelist

**Domain Verification Check**:
```bash
# Check DNS records for your domain
dig TXT yourdomain.com | grep -E "(spf|dkim)"
```

---

## 🔍 Advanced Troubleshooting

### Enable Debug Logging

Add to `.env` for detailed debugging:
```env
DEBUG=true
NODE_ENV=development
LOG_LEVEL=debug
```

### Health Check Commands

```bash
# Application health status
# Check console output for:
# - Component health status
# - Circuit breaker states
# - Error rates and patterns

# Manual health checks
node -e "
const config = require('./src/config.js');
console.log('Configuration loaded:', !!config.RESEND_API_KEY);
"
```

### Log Analysis

```bash
# View recent stock checks
tail -f data/stock-checks.json

# Monitor error logs in real-time
tail -f logs/error.log

# Check daily error summary
cat logs/error-summary.json | jq '.'

# Search for specific errors
grep -i "timeout" logs/error.log
grep -i "resend" logs/error.log
```

### Configuration Validation

```bash
# Validate environment variables
node -e "
const config = require('./src/config.js');
const required = ['PRODUCT_URL', 'FROM_EMAIL', 'TO_EMAIL', 'RESEND_API_KEY'];
required.forEach(key => {
  console.log(\`\${key}: \${config[key] ? '✅ Set' : '❌ Missing'}\`);
});
"

# Check email format
node -e "
const config = require('./src/config.js');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
console.log('FROM_EMAIL valid:', emailRegex.test(config.FROM_EMAIL));
console.log('TO_EMAIL valid:', emailRegex.test(config.TO_EMAIL));
"
```

### Network Diagnostics

```bash
# Test Costco connectivity
curl -v "$PRODUCT_URL" 2>&1 | head -20

# Test Resend API connectivity
curl -v "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  2>&1 | head -10
```

---

## 📊 Performance Monitoring

### Expected Performance Metrics

| Metric | Normal Range | Alert If |
|--------|--------------|----------|
| Memory Usage | 50-100 MB | > 200 MB |
| CPU Usage | < 5% | > 20% |
| Response Time | < 5 seconds | > 15 seconds |
| Log File Size | < 50 MB | > 100 MB |

### Monitoring Commands

```bash
# Memory usage
ps -o pid,ppid,%mem,%cpu,cmd -p $(pgrep -f "node.*nintendo")

# Disk usage
du -sh data/ logs/

# Check file handles
lsof -p $(pgrep -f "node.*nintendo") | wc -l
```

---

## 🚨 Emergency Procedures

### Application Won't Stop

```bash
# Find process ID
ps aux | grep "node.*nintendo"

# Graceful shutdown
kill -TERM <PID>

# Force kill if necessary (wait 30 seconds first)
kill -9 <PID>
```

### Corrupted Data Files

```bash
# Backup current data
cp data/stock-checks.json data/stock-checks.backup.$(date +%Y%m%d_%H%M%S).json

# Validate JSON format
cat data/stock-checks.json | jq '.' > /dev/null && echo "✅ Valid JSON" || echo "❌ Corrupted JSON"

# Reset if corrupted
echo "[]" > data/stock-checks.json
```

### Log Files Too Large

```bash
# Rotate logs manually
mv logs/error.log logs/error.log.$(date +%Y%m%d_%H%M%S)
touch logs/error.log

# Clean old logs
find logs/ -name "*.log.*" -mtime +7 -delete
```

---

## 🔧 System-Specific Issues

### macOS Issues

**M1/M2 Mac Compatibility**:
```bash
# If npm install fails
npm install --target_arch=arm64

# If Node.js version issues
brew install node@18
brew link node@18
```

### Linux Issues

**SystemD Service** (if running as service):
```bash
# Check service status
systemctl status nintendo-switch-monitor

# View service logs
journalctl -u nintendo-switch-monitor -f
```

### Windows Issues

**PowerShell Execution Policy**:
```powershell
# If script execution is blocked
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Path Issues**:
```cmd
# If Node.js not found
where node
where npm
```

---

## 📞 Getting Help

### Before Asking for Help

1. **Check the logs**: Review `logs/error.log` for detailed error information
2. **Verify configuration**: Ensure all environment variables are correctly set
3. **Test components individually**: Verify network, email service, and file permissions
4. **Check system resources**: Ensure adequate memory and disk space
5. **Review recent changes**: Check if any configuration or system changes were made

### Information to Include

When reporting issues, include:
- **Error messages**: Full error text from logs
- **System information**: OS, Node.js version
- **Configuration**: Sanitized `.env` file (remove API keys)
- **Logs**: Recent entries from `logs/error.log`
- **Steps to reproduce**: What you did before the error occurred

### Useful Diagnostic Commands

```bash
# Generate diagnostic report
echo "=== System Information ===" > diagnostic.txt
node --version >> diagnostic.txt
npm --version >> diagnostic.txt
uname -a >> diagnostic.txt
echo "" >> diagnostic.txt

echo "=== Configuration Check ===" >> diagnostic.txt
cat .env | grep -v "API_KEY" >> diagnostic.txt
echo "" >> diagnostic.txt

echo "=== Recent Errors ===" >> diagnostic.txt
tail -20 logs/error.log >> diagnostic.txt
echo "" >> diagnostic.txt

echo "=== File Permissions ===" >> diagnostic.txt
ls -la data/ logs/ >> diagnostic.txt

echo "Diagnostic report saved to diagnostic.txt"
```

---

## 🔄 Recovery Procedures

### Complete Reset

If all else fails, perform a complete reset:

```bash
# Stop application
pkill -f "node.*nintendo"

# Backup important data
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp -r data/ logs/ .env backups/$(date +%Y%m%d_%H%M%S)/

# Clean slate
rm -rf data/ logs/
mkdir -p data logs

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart
npm start
```

### Configuration Reset

```bash
# Reset to default configuration
cp .env.example .env

# Edit with your values
nano .env

# Test configuration
npm start
```

---

*Troubleshooting guide last updated: June 10, 2025* 