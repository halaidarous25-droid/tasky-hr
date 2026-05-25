@echo off
chcp 65001 > nul
echo ================================================
echo   بناء نظام إدارة المسؤوليات
echo   HR Responsibility Management System
echo ================================================
echo.

:: التحقق من وجود Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت!
    echo يرجى تحميله من: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] التحقق من Node.js...
node --version
npm --version

echo.
echo [2/4] الانتقال لمجلد التطبيق...
cd /d "%~dp0app"

echo.
echo [3/4] تثبيت المكتبات (قد يستغرق 2-5 دقائق)...
npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo [خطأ] فشل تثبيت المكتبات!
    pause
    exit /b 1
)

echo.
echo [4/4] بناء التطبيق...
npm run build

if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء التطبيق!
    pause
    exit /b 1
)

echo.
echo ================================================
echo   ✓ تم البناء بنجاح!
echo.
echo   الملفات الجاهزة في: app\dist\
echo   لتجربة التطبيق: npm run preview
echo ================================================
echo.
pause
