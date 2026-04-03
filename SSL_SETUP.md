# 🔐 SSL Setup for Local Development

Your project is now configured with **nginx** and **SSL/TLS** for local development using self-signed certificates.

## Setup Steps (Do this FIRST)

### On Windows:
```bash
# Generate self-signed certificate
./generate-cert.bat
```

### On Linux/Mac:
```bash
# Generate self-signed certificate
bash generate-cert.sh
```

Or use make command:
```bash
make cert
```

## Start the Application

```bash
# Start all containers
make up

# View logs
make logs
```

## Access Your App

Open your browser and go to:
```
https://localhost
```

⚠️ **Browser Warning**: You'll see a certificate warning because it's self-signed. 
- Click **Advanced** → **Proceed to localhost** (or equivalent in your browser)
- This is normal and safe for local development

## How It Works

```
Your Browser
    ↓
https://localhost:443 (nginx - port 443)
    ↓
Routes requests to:
├── /api  → Backend (3001)
└── /     → Frontend (3000)
```

## Directory Structure

```
project/
├── certs/
│   ├── certificate.crt  ← Self-signed public cert
│   └── private.key      ← Private key
├── nginx/
│   └── default.conf     ← nginx configuration
├── docker-compose.yml   ← Uses certs from ./certs
└── generate-cert.sh/bat ← Generates self-signed certs
```

## Switching to Real Domain

When you get a domain and ready for production:

1. **Get SSL from Let's Encrypt**
   ```bash
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Update nginx/default.conf**
   ```nginx
   ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
   server_name yourdomain.com www.yourdomain.com;
   ```

3. **Update docker-compose.yml**
   ```yaml
   volumes:
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

4. **Update REACT_APP_API_URL**
   ```yaml
   environment:
     - REACT_APP_API_URL=https://yourdomain.com/api
   ```

5. **Deploy!**
   ```bash
   make down
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
