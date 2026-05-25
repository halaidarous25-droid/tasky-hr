@echo off
chcp 65001 > nul
echo ================================================
echo   نشر نظام إدارة المسؤوليات على Firebase
echo ================================================
echo.

:: التحقق من Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت!
    echo يرجى تحميله من: https://nodejs.org
    pause & exit /b 1
)

:: تثبيت Firebase CLI إذا لم يكن موجوداً
where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo [1] تثبيت Firebase CLI...
    npm install -g firebase-tools
)

echo.
echo [2] تسجيل الدخول بحساب Google...
echo     سيفتح المتصفح - سجّل بـ halaidarous25@gmail.com
firebase login

echo.
echo [3] إنشاء مشروع Firebase...
echo     اضغط Enter لاستخدام مشروع موجود أو أنشئ جديداً
firebase projects:list

echo.
set /p PROJECT_ID="أدخل Firebase Project ID (أو اضغط Enter لإنشاء جديد): "

if "%PROJECT_ID%"=="" (
    echo إنشاء مشروع جديد...
    firebase projects:create hr-responsibility-system-%RANDOM%
    echo تم! راجع: https://console.firebase.google.com
) else (
    echo استخدام المشروع: %PROJECT_ID%
    echo {"projects":{"default":"%PROJECT_ID%"}} > .firebaserc
)

echo.
echo [4] نشر الموقع...
firebase deploy --only hosting

echo.
echo ================================================
echo   ✓ تم النشر بنجاح!
echo   رابط موقعك: https://[project-id].web.app
echo ================================================
pause
