@echo off
move "src\app\api\matches\[matchId]\route.ts" "src\app\api\matches\[id]\route.ts" >nul 2>&1
rmdir "src\app\api\matches\[matchId]" >nul 2>&1
echo Listo
pause
