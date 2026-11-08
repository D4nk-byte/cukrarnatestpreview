@echo off
title Nahrat na GitHub - D4nk-byte
echo ========================================================
echo   Nahravam web na: https://github.com/D4nk-byte/cukrarnatestpreview
echo ========================================================
cd /d "%~dp0"
git branch -M main
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo   USPESNE NAHRANO!
  echo   Web bude za 1 minutu dostupny na:
  echo   https://d4nk-byte.github.io/cukrarnatestpreview/
  echo ========================================================
) else (
  echo.
  echo Pokud se zobrazila chyba 404, ujistete se, ze mate na
  echo https://github.com/new vytvoreny prazdny repozitar "cukrarnatestpreview".
)
pause
