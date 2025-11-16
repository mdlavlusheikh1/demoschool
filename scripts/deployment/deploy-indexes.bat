@echo off
echo 🚀 Deploying Firestore indexes to Firebase...
echo Project: iqra-nuranu-academy
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if logged in to Firebase
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to Firebase. Please login first:
    echo firebase login
    pause
    exit /b 1
)

REM Set the project
echo 📋 Setting Firebase project to iqra-nuranu-academy...
firebase use iqra-nuranu-academy

if errorlevel 1 (
    echo ❌ Failed to set project. Make sure you have access to iqra-nuranu-academy project.
    echo Available projects:
    firebase projects:list
    pause
    exit /b 1
)

REM Deploy indexes
echo.
echo 📊 Deploying Firestore indexes...
firebase deploy --only firestore:indexes

if %errorlevel% equ 0 (
    echo.
    echo ✅ Firestore indexes deployed successfully!
    echo.
    echo 📝 Indexes created for:
    echo    • users collection ^(with schoolId, createdAt, isActive, role filters^)
    echo    • attendanceRecords collection
    echo    • students collection
    echo    • classes collection
    echo    • notifications collection
    echo    • attendanceSessions collection
    echo.
    echo 🔗 You can view the indexes in Firebase Console:
    echo    https://console.firebase.google.com/project/iqra-nuranu-academy/firestore/indexes
    echo.
    echo ⚠️  Note: It may take a few minutes for indexes to be built.
) else (
    echo.
    echo ❌ Failed to deploy indexes. Check the error above.
    echo.
    echo 💡 Common issues:
    echo    • Make sure you have Editor/Owner permissions for the project
    echo    • Check if firestore.indexes.json syntax is valid
    echo    • Ensure you're connected to the internet
)

echo.
echo Press any key to continue...
pause >nul