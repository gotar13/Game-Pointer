@echo off
REM Generate self-signed SSL certificate for localhost (Windows version)
REM Requires OpenSSL to be installed

echo.
echo Generating self-signed SSL certificate for localhost...
echo.

REM Create certs directory if it doesn't exist
if not exist "certs" mkdir certs

REM Generate private key and certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout certs\private.key ^
  -out certs\certificate.crt ^
  -subj "/C=HU/ST=Hungary/L=Budapest/O=GamePointer/CN=localhost" ^
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1"

if errorlevel 1 (
    echo.
    echo ERROR: OpenSSL not found! Install it from: https://slproweb.com/products/Win32OpenSSL.html
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] SSL certificate created successfully!
echo.
echo Certificate files:
echo   - certs\certificate.crt (Public certificate)
echo   - certs\private.key (Private key)
echo.
echo Next steps:
echo   1. Run: make up
echo   2. Open: https://localhost
echo   3. Ignore SSL warning (click Advanced, then Proceed)
echo.
pause
