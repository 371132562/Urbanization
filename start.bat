@echo off
chcp 65001 > nul
setlocal

ECHO.
ECHO =======================================================
ECHO  正在准备运行环境，请稍候...
ECHO  即将启动 Urbanization 应用...
ECHO =======================================================
ECHO.

SET "BASE_DIR=%~dp0"
SET "NODE_EXE_PATH=%BASE_DIR%node-portable\node.exe"
SET "ELECTRON_CLI_PATH=%BASE_DIR%node_modules\electron\cli.js"

cd /d "%BASE_DIR%electron"

rem 使用 start 命令来启动应用。
rem start 会让应用独立运行，脚本本身不等待。
rem /b 参数能防止启动时额外弹出一个新的黑框，让启动过程更干净。
start "" /b "%NODE_EXE_PATH%" "%ELECTRON_CLI_PATH%" .
