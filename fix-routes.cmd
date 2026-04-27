@echo off
setlocal enabledelayedexpansion
set "file=C:\wamp64\www\copadepor\src\app\api\matches\[id]\route.ts"
if exist "%file%" (
  powershell -Command "(Get-Content '%file%') -replace '\[matchId\]', '[id]' | Set-Content '%file%'"
  echo Reemplazado exitosamente
) else (
  echo Archivo no encontrado
)
for /d %%d in ("C:\wamp64\www\copadepor\src\app\api\matches\[matchId]") do rmdir "%%d"
echo Listo
pause
