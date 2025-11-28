@echo off
REM Quick deployment script for Windows
REM This prepares your code for deployment to cPanel

echo.
echo ======================================
echo   Vibe Edutainment - Deployment Setup
echo ======================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/4] Staging all files...
git add .
if errorlevel 1 (
    echo ERROR: Failed to stage files
    pause
    exit /b 1
)

echo [2/4] Committing changes...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
git commit -m "Production deployment - %mydate% %mytime%"

echo [3/4] Pushing to repository...
git push origin main
if errorlevel 1 (
    echo WARNING: Push failed. Check your git configuration.
    echo Run: git config --global user.email "your@email.com"
    echo Run: git config --global user.name "Your Name"
)

echo.
echo [4/4] Creating environment file backup...
if exist .env (
    copy .env .env.backup
    echo Backup created: .env.backup
)

echo.
echo ======================================
echo   ✅ Deployment package ready!
echo ======================================
echo.
echo Next steps:
echo 1. Log in to cPanel at: https://techitoan.name.vn:2083
echo 2. Navigate to: Node.js Manager (or Node.js icon)
echo 3. Click: "Create Application"
echo 4. Fill in the form:
echo    - Node.js version: 18.x or higher
echo    - Application mode: Production
echo    - Startup file: src/server.js
echo    - Application root: ~/public_html/app
echo 5. Click "Create"
echo 6. Click "NPM install" when prompted
echo 7. Click "Start" to run the application
echo.
echo Your app will be available at:
echo https://techitoan.name.vn
echo.
pause
