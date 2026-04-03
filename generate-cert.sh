#!/bin/bash

# Generate self-signed SSL certificate for localhost
# Run this once before starting Docker containers

echo "🔐 Generating self-signed SSL certificate for localhost..."

# Create certs directory if it doesn't exist
mkdir -p ./certs

# Generate private key and certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/private.key \
  -out ./certs/certificate.crt \
  -subj "/C=HU/ST=Hungary/L=Budapest/O=GamePointer/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1"

echo "✅ SSL certificate created successfully!"
echo ""
echo "📁 Certificate files:"
echo "  - ./certs/certificate.crt (Public certificate)"
echo "  - ./certs/private.key (Private key)"
echo ""
echo "🚀 Now you can run: make up"
echo ""
echo "⚠️  NOTE: Browser will show SSL warning on https://localhost"
echo "    This is normal for self-signed certificates."
echo "    Click 'Advanced' → 'Proceed to localhost' to continue."
