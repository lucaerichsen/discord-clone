@echo off
title Discord
cd /d "%~dp0"
start "" /b node server.js
timeout /t 1 >nul
start "" msedge.exe --app="http://localhost:3000" --app-window-size=1280,800
exit
