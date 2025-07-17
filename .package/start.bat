@echo off
chcp 65001 > nul
setlocal

REM 获取脚本所在的目录 (release 目录)
set "BASE_DIR=%~dp0"
set "NODE_EXEC=%BASE_DIR%node-portable\node.exe"
set "APP_DIR=%BASE_DIR%app"
set "BACKEND_DIR=%APP_DIR%\backend"

echo =======================================================
echo        Urbanization 应用 - 启动程序
echo =======================================================
echo.

echo [1/2] 正在准备和更新数据库...
REM 切换到后端目录以运行 Prisma 命令, Prisma 会自动找到 schema.prisma
cd /d "%BACKEND_DIR%"
"%NODE_EXEC%" ".\node_modules\prisma\build\index.js" migrate deploy

if %errorlevel% neq 0 (
    echo.
    echo ❌ 数据库更新失败! 请检查以上错误信息。
    pause
    exit /b %errorlevel%
)
echo ✅ 数据库已是最新状态。
echo.

echo [2/2] 正在启动后台服务...
echo      服务启动后, 请在浏览器中打开 http://localhost:3000
echo      (请不要关闭此窗口)
echo.

REM 切换到 app 目录作为 NestJS 的工作目录, 这对于解析静态文件路径至关重要
cd /d "%APP_DIR%"

REM 使用自带的 node.exe 启动 NestJS 服务
"%NODE_EXEC%" "backend\dist\main.js"

pause
endlocal