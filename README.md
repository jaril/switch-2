# Nintendo Switch 2 Stock Monitor

🎮 **Automated stock monitoring and email notifications for Nintendo Switch 2 at Costco**

---

## Quick Start

### 1. Install & Configure
```bash
git clone <repository-url>
cd nintendo-switch-monitor
npm install
cp .env.example .env
```

### 2. Set Up Email Service
Follow the [Resend Setup Guide](RESEND-SETUP.md) to configure email notifications.

### 3. Configure Environment
Edit `.env` with your settings:
```env
PRODUCT_URL=https://www.costco.com/nintendo-switch-2...
FROM_EMAIL=alerts@yourdomain.com
TO_EMAIL=your-email@gmail.com
RESEND_API_KEY=re_your_api_key_here
```

### 4. Run
```bash
npm start
```

---

## Features

- **🔍 Automated Monitoring** - Continuously checks Nintendo Switch 2 stock at Costco
- **📧 Instant Alerts** - Email notifications when stock becomes available
- **📊 Daily Summaries** - Daily reports with monitoring statistics
- **🛡️ Enterprise Reliability** - Error handling, retries, circuit breakers
- **📱 Mobile-Friendly** - Responsive HTML email templates

---

## Deployment Options

### Local Development
```bash
npm start  # Local monitoring
```

### GitHub Actions (Free Cloud Hosting)
1. Follow the [GitHub Deployment Guide](GITHUB-DEPLOYMENT.md)
2. Set up repository secrets
3. Deploy to GitHub Actions free tier

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PRODUCT_URL` | ✅ | Nintendo Switch 2 product page URL |
| `FROM_EMAIL` | ✅ | Verified sender email address |
| `TO_EMAIL` | ✅ | Your notification email |
| `RESEND_API_KEY` | ✅ | Resend service API key |
| `STOCK_CHECK_INTERVAL` | ❌ | Check interval (default: 5 minutes) |
| `DAILY_SUMMARY_TIME` | ❌ | Daily summary time (default: 09:00) |

---

## Documentation

- **[Setup Guide](SETUP.md)** - Detailed installation and configuration
- **[Email Setup](RESEND-SETUP.md)** - Resend service configuration
- **[Configuration Guide](CONFIGURATION.md)** - Environment variables and security
- **[GitHub Deployment](GITHUB-DEPLOYMENT.md)** - Cloud deployment with GitHub Actions
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions

---

## Project Structure

```
nintendo-switch-monitor/
├── src/                  # Application source code
├── data/                 # Stock check history
├── logs/                 # Application logs
├── .env                  # Configuration (create from .env.example)
└── docs/                 # Documentation
```

---

## Quick Troubleshooting

**Not receiving emails?**
- Check spam folder
- Verify Resend domain is verified
- Check `logs/error.log`

**Application not starting?**
- Verify all required environment variables in `.env`
- Check Node.js version (18.0.0+ required)

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## License

Personal and educational use only. Respect Costco's terms of service. 