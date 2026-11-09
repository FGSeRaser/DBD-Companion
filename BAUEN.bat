@echo off
rem DBD Companion – EXE selbst bauen (braucht das .NET 8 SDK). von FGSeRaser – https://github.com/FGSeRaser
title DBD Companion - EXE bauen
cd /d "%~dp0"
where dotnet >nul 2>nul || (echo .NET 8 SDK fehlt - bitte installieren: https://dotnet.microsoft.com/download & start https://dotnet.microsoft.com/download & pause & exit /b)
dotnet publish DBDCompanion.vbproj -c Release -r win-x64 --self-contained true -o veroeffentlicht
if errorlevel 1 (echo. & echo FEHLER beim Bauen. & pause & exit /b)
echo Fertig! Im Ordner "veroeffentlicht" liegt "DBD Companion.exe".
start "" "veroeffentlicht"
pause
