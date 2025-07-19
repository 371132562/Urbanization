@echo off
rem 设置控制台编码为 UTF-8 以便正确显示中文。
chcp 65001 > nul
setlocal

echo.
echo =================================================================
echo.
echo         欢迎使用世界城镇化项目一键启动脚本 (Windows)
echo.
echo =================================================================
echo.
echo 本脚本将使用 Docker Compose 启动整个应用程序。
echo 请确保您已安装并运行 Docker Desktop。
echo.

rem --- 检查 Docker 环境 ---
echo [1/3] 正在检查 Docker 环境...
docker info > nul 2> nul
if %errorlevel% neq 0 (
    echo.
    echo [错误] Docker 服务未启动或未正确安装。
    echo.
    echo 请先启动 Docker Desktop，然后再重新运行此脚本。
    echo.
    pause
    exit /b
)
echo Docker 环境正常。
echo.

rem --- 拉取最新镜像 ---
echo [2/3] 正在拉取最新的应用程序镜像...
echo 这可能需要一些时间，具体取决于您的网络速度。
echo.
docker-compose pull
if %errorlevel% neq 0 (
    echo.
    echo [错误] 拉取镜像失败！
    echo.
    echo 请检查您的网络连接是否正常，以及是否能访问 Docker Hub。
    echo.
    pause
    exit /b
)
echo 最新镜像已成功拉取。
echo.

rem --- 启动服务 ---
echo [3/3] 正在后台启动应用程序容器...
echo.
docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动容器失败！
    echo.
    echo 请检查 Docker 日志以获取详细错误信息。
    echo.
    pause
    exit /b
)

echo.
echo =================================================================
echo.
echo            🎉 恭喜！世界城镇化项目已成功启动！ 🎉
echo.
echo =================================================================
echo.
echo - 您现在可以通过浏览器访问应用程序: http://localhost:3333
echo.
echo - 如何停止服务: 直接退出 Docker Desktop 即可自动停止所有服务。
echo.
echo - 如何更新服务: 当有新版本发布时，再次运行此脚本即可自动更新。
echo.
echo   您可以随时关闭此窗口，应用程序将在后台继续运行。
echo.
pause 