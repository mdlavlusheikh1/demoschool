@echo off
REM Vercel Deployment Script for Windows
echo.
echo ========================================
echo   Vercel Deployment Script
echo ========================================
echo.

REM Step 1: Check prerequisites
echo [Step 1] Checking Prerequisites...
echo ----------------------------------------

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [OK] Git: Installed
echo [OK] Node.js: Installed
echo [OK] npm: Installed
echo.

REM Step 2: Check Vercel CLI
echo [Step 2] Checking Vercel CLI...
echo ----------------------------------------

where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Vercel CLI is not installed
    echo [INFO] Installing Vercel CLI...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Vercel CLI
        pause
        exit /b 1
    )
) else (
    echo [OK] Vercel CLI: Installed
)
echo.

REM Step 3: Check Git status
echo [Step 3] Checking Git Repository...
echo ----------------------------------------

if exist .git (
    git status --porcelain >nul 2>&1
    if %errorlevel% equ 0 (
        for /f %%i in ('git status --porcelain') do (
            echo [WARN] You have uncommitted changes
            set /p commit="Do you want to commit and push changes? (y/n): "
            if /i "!commit!"=="y" (
                echo [INFO] Staging changes...
                call git add .
                echo [INFO] Committing changes...
                call git commit -m "Deploy to Vercel"
                echo [INFO] Pushing to remote...
                call git push
            )
            goto :continue
        )
    )
    echo [OK] Git repository is clean
    :continue
) else (
    echo [WARN] Not a Git repository
    echo [INFO] Initialize Git and push to GitHub first
    pause
    exit /b 1
)
echo.

REM Step 4: Environment variables check
echo [Step 4] Environment Variables Check...
echo ----------------------------------------

if exist .env.local (
    echo [OK] Found .env.local file
) else (
    echo [WARN] .env.local file not found
)

echo [INFO] Make sure to add environment variables to Vercel Dashboard:
echo        Project Settings -^> Environment Variables
echo.
echo [INFO] Required Environment Variables:
echo        - NEXT_PUBLIC_FIREBASE_API_KEY
echo        - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
echo        - NEXT_PUBLIC_FIREBASE_PROJECT_ID
echo        - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
echo        - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
echo        - NEXT_PUBLIC_FIREBASE_APP_ID
echo        - FIREBASE_ADMIN_PROJECT_ID
echo        - FIREBASE_ADMIN_PRIVATE_KEY
echo        - FIREBASE_ADMIN_CLIENT_EMAIL
echo        - NEXT_PUBLIC_SCHOOL_ID
echo        - NEXT_PUBLIC_SCHOOL_NAME
echo.
echo [INFO] See VERCEL_ENV_VARIABLES.md for complete list
echo.

REM Step 5: Build project
echo [Step 5] Building Project...
echo ----------------------------------------

echo [INFO] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Please fix errors before deploying.
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

REM Step 6: Deploy to Vercel
echo [Step 6] Deploying to Vercel...
echo ----------------------------------------

echo [INFO] Choose deployment method:
echo        1. Deploy to preview (vercel)
echo        2. Deploy to production (vercel --prod)
echo        3. Skip (deploy manually from Vercel Dashboard)
echo.
set /p choice="Enter choice (1/2/3): "

if "%choice%"=="1" (
    echo.
    echo [INFO] Deploying to preview...
    call vercel
) else if "%choice%"=="2" (
    echo.
    echo [INFO] Deploying to production...
    call vercel --prod
) else if "%choice%"=="3" (
    echo.
    echo [INFO] Manual Deployment Steps:
    echo        1. Go to https://vercel.com/dashboard
    echo        2. Click "Add New..." -^> "Project"
    echo        3. Import your GitHub repository
    echo        4. Add environment variables
    echo        5. Click "Deploy"
    echo.
    echo [INFO] See DEPLOY_VERCEL.md for detailed guide
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
echo [OK] Deployment process completed!
echo [OK] Check your Vercel dashboard for deployment status
echo.
pause

