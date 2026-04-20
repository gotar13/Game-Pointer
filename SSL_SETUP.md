# 🔐 SSL Setup for Local Development & Production

## Quick Start - Local Development

Your project is configured with **nginx** and **SSL/TLS** for local development using self-signed certificates.

### On Windows:
```bash
./generate-cert.bat
```

### On Linux/Mac:
```bash
bash generate-cert.sh
```

Or use make command:
```bash
make cert
```

Then start your app:
```bash
make up
```

Access at: `https://localhost`

---

## 🌍 Production Setup - Let's Encrypt

Follow these steps to set up **Let's Encrypt** SSL for your real domain.

### Prerequisites
- A real domain (e.g., `yourdomain.com`)
- Your domain points to the server's public IP
- Server running on Linux (Ubuntu/Debian recommended)
- Docker & Docker Compose installed
- Port 80 and 443 accessible from the internet

### Step 1: Install Certbot (on your server)

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Obtain Let's Encrypt Certificate

**Option A: Standalone Mode (Recommended for Docker)**

Stop your containers first:
```bash
make down
```

Get the certificate:
```bash
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

**Option B: Webroot Mode (if running on host)**

```bash
sudo certbot certonly --webroot \
  -w /path/to/webroot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### Step 3: Update nginx Configuration

Edit [nginx/default.conf](nginx/default.conf) and replace:
- `YOUR_DOMAIN.com` with your actual domain

Example:
```nginx
server_name myapp.com www.myapp.com;
ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;
```

### Step 4: Update Docker Compose

The [docker-compose.yml](docker-compose.yml) is already configured to mount Let's Encrypt certificates:

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Step 5: Update Frontend API URL

Edit your `.env` file or `docker-compose.yml`:

```yaml
environment:
  - REACT_APP_API_URL=https://kezdikosz.ro/api
```

### Step 6: Start Your Application

```bash
make up
```

Visit: `https://kezdikosz.ro` ✅

---

## 🔄 Auto-Renewal Setup

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

### On Linux Server

Create a cron job to renew certificates:
```bash
sudo crontab -e
```

Add this line (runs daily at 2 AM):
```cron
0 2 * * * certbot renew --quiet && systemctl reload docker
```

Or use systemd timer:
```bash
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

### In Docker (Docker Compose)

Add a renewal service to your `docker-compose.yml`:

```yaml
certbot:
  image: certbot/certbot:latest
  container_name: certbot
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt
    - /var/lib/letsencrypt:/var/lib/letsencrypt
  entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;"
  restart: always
```

---

## 📋 Security Checklist

✅ **SSL/TLS Setup**
- [ ] Domain points to server IP
- [ ] Certbot installed
- [ ] Certificate obtained from Let's Encrypt
- [ ] nginx configured with correct domain
- [ ] Docker volumes mounted correctly

✅ **HTTPS Redirect**
- [ ] HTTP (port 80) redirects to HTTPS (port 443)
- [ ] Let's Encrypt validation path configured (/.well-known/acme-challenge/)

✅ **Security Headers**
- [ ] TLS 1.2+ enabled
- [ ] Strong ciphers configured
- [ ] CORS headers set appropriately

✅ **Certificate Renewal**
- [ ] Auto-renewal configured
- [ ] Renew check scheduled (at least monthly)

---

## 🔧 Troubleshooting

### Certificate not found error
```bash
# Check certificate exists
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Verify permissions
sudo chmod -R 755 /etc/letsencrypt/
```

### nginx won't start
```bash
# Check nginx syntax
docker exec nginx nginx -t

# View nginx logs
make logs nginx
```

### Certificate renewal failed
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Check renewal log
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### Mixed content warning (HTTP assets on HTTPS page)
Update `REACT_APP_API_URL` to use `https://`

---

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [nginx SSL Configuration](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OWASP SSL Configuration](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

---

## 💡 Quick Reference

| Task | Command |
|------|---------|
| Generate self-signed cert | `make cert` |
| Get Let's Encrypt cert | `sudo certbot certonly --standalone -d yourdomain.com` |
| Test renewal | `sudo certbot renew --dry-run` |
| Check renewal status | `sudo certbot certificates` |
| Update certs | `make down && make up` |
| View nginx logs | `make logs nginx` |
   make up
   ```

## Useful Commands

```bash
make up              # Start containers
make down            # Stop containers
make logs            # View all logs
make ps              # Show running containers
make rebuild         # Rebuild without cache
make reset           # Full reset (delete everything)
```

## Troubleshooting

**Certificate not found?**
```bash
# Regenerate certificates
make cert
```

**Nginx not starting?**
```bash
# Check nginx logs
docker-compose logs nginx
```

**API calls failing?**
- Make sure backend is running: `docker-compose logs backend`
- Check browser console (F12) for CORS errors
- Verify firewall isn't blocking port 443

---

Questions? Check the main README.md
