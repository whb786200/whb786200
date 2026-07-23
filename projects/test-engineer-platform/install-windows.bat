@echo off
chcp 65001 >nul
setlocal

set "TARGET=%USERPROFILE%\Desktop\试验工程师智能平台"

echo 将安装到：
echo %TARGET%
echo.

if not exist "%TARGET%" mkdir "%TARGET%"

robocopy "%~dp0" "%TARGET%" /E /XD ".git" "deploy-build" "deploy-build-full" /XF "deploy-test-engineer*.tar.gz" "deploy-test-engineer*.zip" >nul

if errorlevel 8 (
  echo 安装复制失败。
  pause
  exit /b 1
)

echo 安装完成。
echo 请双击桌面文件夹中的 start-windows.bat 启动。
echo.
pause
