@echo off
REM ============================================================
REM  One-time: let your phone reach the admin console.
REM  RIGHT-CLICK this file -> "Run as administrator".
REM ============================================================
REM  Windows Firewall blocks incoming connections on port 5173,
REM  so the dev server is reachable from this PC but not from
REM  your phone. This adds one narrow rule:
REM
REM    - inbound TCP, port 5173 only
REM    - PRIVATE profile only (your home Wi-Fi), never Public,
REM      so it does nothing on a cafe or airport network
REM
REM  To undo it later:
REM    Remove-NetFirewallRule -DisplayName "Sambramo admin dev server (5173)"
REM ============================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo.
  echo   This needs Administrator.
  echo   Close this, RIGHT-CLICK the file, choose "Run as administrator".
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -Command "Remove-NetFirewallRule -DisplayName 'Sambramo admin dev server (5173)' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'Sambramo admin dev server (5173)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private | Out-Null; Write-Host ''; Write-Host '   Done. Your phone can now reach the console on your Wi-Fi.'; Write-Host ''"
pause
