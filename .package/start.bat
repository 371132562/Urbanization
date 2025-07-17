    @echo off
    setlocal

    REM 获取脚本所在的目录
    set "BASE_DIR=%~dp0"

    REM 切换到 app 目录
    cd /d "%BASE_DIR%app"

    echo =======================================================
    echo  正在启动 Urbanization 应用, 请稍候...
    echo  启动成功后, 请在浏览器中打开 http://localhost:3000
    echo  请不要关闭此窗口
    echo =======================================================

    REM 使用我们自带的 node.exe 启动 NestJS 服务
    "%BASE_DIR%node-portable\node.exe" "backend/dist/main.js"

    pause
    endlocal