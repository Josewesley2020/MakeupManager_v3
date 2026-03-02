@echo off
echo Iniciando WhatsApp Server com Node.js 18...
cd /d "C:\GitHub\MakeupManager"
call nvm use 18.20.4
echo Versao do Node:
node --version
echo.
echo Iniciando servidor WhatsApp...
node whatsapp-server.js
pause