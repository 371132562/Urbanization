﻿@echo off
chcp 65001 > nul
setlocal

ECHO.
ECHO =======================================================
ECHO  正在准备启动 NestJS 后端服务...
ECHO =======================================================
ECHO.

REM 设置基础目录为脚本所在目录
SET "BASE_DIR=%~dp0"

REM 设置便携式 Node 和 NPM 的路径
SET "NODE_EXE_PATH=%BASE_DIR%node-portable\node.exe"
SET "NPM_CMD_PATH=%BASE_DIR%node-portable\npm.cmd"

REM 将便携式Node目录添加到PATH环境变量的最前面，确保npm能找到正确的node.exe
SET "PATH=%BASE_DIR%node-portable;%PATH%"

REM 切换到后端项目目录
cd /d "%BASE_DIR%backend"

ECHO 正在使用便携版 NPM 启动 NestJS 开发服务器...
ECHO 您可以在浏览器中访问 http://localhost:3000 (或其他配置的端口)
ECHO 按 CTRL+C 可以停止服务器。
ECHO.

REM 使用 call 命令来执行另一个批处理文件，这样可以确保在子脚本执行完毕后，控制权能返回到当前脚本
call "%NPM_CMD_PATH%" run start:dev

REM 在脚本末尾添加pause，以便在出错时能看到控制台输出
pause
endlocal
