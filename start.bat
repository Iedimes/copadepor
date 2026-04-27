@echo off
REM Script para iniciar el servidor Next.js

set PATH=C:\nvm4w\nodejs;%PATH%

echo ✅ Node.js disponible
node --version
npm --version

echo.
echo 🚀 Iniciando servidor...
echo.

call npm run dev

pause
