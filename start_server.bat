@echo off
echo =========================================
echo Khởi động máy chủ GAP ATS
echo =========================================

:: Thêm E:\Nodejs vào PATH tạm thời cho session này
set PATH=E:\Nodejs;%PATH%

:: Chuyển đến thư mục chứa project
cd /d "%~dp0"

echo Dang chay npm run dev...
npm run dev

pause
