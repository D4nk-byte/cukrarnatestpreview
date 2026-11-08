@echo off
title Cukrarstvi Madel - Localhost Server
echo ===================================================
echo   Spoustim Cukrarstvi Madel na http://localhost:3000
echo ===================================================
cd /d "%~dp0"
start http://localhost:3000
node server.js
pause
