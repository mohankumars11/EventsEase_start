@echo off
REM ============================================================
REM  Sambramo admin console - local
REM ============================================================
REM  Double-click this file any time you want the console.
REM  Leave the black window open while you use it; closing the
REM  window stops the server.
REM
REM  Serves on this PC AND on your Wi-Fi, so your phone can
REM  open it too. Two things were wrong before:
REM    - Vite's default binds IPv6 (::1) only, so a browser that
REM      resolves "localhost" to IPv4 got "cannot be reached".
REM    - 127.0.0.1 means "this device". On a phone that is the
REM      PHONE, which is why it refused the connection there.
REM
REM  Anyone on your Wi-Fi can now REACH it -- but not USE it:
REM  every screen still requires signing in as an admin, and the
REM  database enforces that, not the network.
REM ============================================================
cd /d "%~dp0"
echo.
echo   Starting the Sambramo admin console...
echo.
echo   When it says "ready", open:
echo.
echo     On this PC : http://127.0.0.1:5173/dashboard/admin
echo     On a phone : http://192.168.1.21:5173/dashboard/admin
echo.
echo   (If the phone says "refused", run allow-admin-port.cmd once,
echo    as administrator. Phone must be on the same Wi-Fi.)
echo.
echo   Sign in as mohanaec038@gmail.com (real email code, not a bypass)
echo.
echo   Keep this window open. Ctrl+C or close it to stop.
echo.
REM  VITE_DEV_AUTH_BYPASS=false turns REAL sign-in back on.
REM  Without it the dev server hands out a fake "preview" identity
REM  with role=customer and no Supabase token, so /dashboard/admin
REM  bounces to /dashboard/customer and nothing can read the database.
set VITE_DEV_AUTH_BYPASS=false
call npx vite --host 0.0.0.0 --port 5173
echo.
echo   The server has stopped.
pause
