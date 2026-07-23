@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"
set "PORT=3001"

if exist "%~dp0runtime\node\node.exe" (
  set "NODE_EXE=%~dp0runtime\node\node.exe"
) else (
  for /f "delims=" %%i in ('where node 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%i"
  )
)

if not defined NODE_EXE (
  echo 未找到 Node.js。
  echo 请安装 Node.js 20 或更高版本，或使用带 runtime\node 的一键安装包。
  echo 下载地址：https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\express" (
  echo 首次运行：正在安装依赖，请稍候...
  if exist "%~dp0runtime\node\npm.cmd" (
    call "%~dp0runtime\node\npm.cmd" install --omit=dev
  ) else (
    call npm install --omit=dev
  )
  if errorlevel 1 (
    echo 依赖安装失败。请检查网络或使用完整一键安装包。
    pause
    exit /b 1
  )
)

echo 正在启动试验工程师数据自动化平台...
echo 地址：http://localhost:%PORT%/
echo 默认管理员：admin / admin123
echo.
start "" "http://localhost:%PORT%/"
set "PORT=%PORT%"
"%NODE_EXE%" server.js

echo.
echo 服务已停止。
pause
