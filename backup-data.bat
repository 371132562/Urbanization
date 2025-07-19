@echo off
rem 设置控制台编码为 UTF-8 以便正确显示中文。
chcp 65001 > nul
setlocal

echo.
echo =================================================================
echo.
echo              世界城镇化项目 - 数据备份脚本
echo.
echo =================================================================
echo.
echo 本脚本将把 Docker 中的数据备份到本地。
echo 请确保 Docker Desktop 正在运行。
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

rem --- 创建备份目录 ---
echo [2/3] 正在准备备份目录...
if not exist backup mkdir backup
echo 备份文件将保存在根目录的 `backup` 文件夹下。
echo.

rem --- 执行备份 ---
echo [3/3] 正在执行数据备份...
echo 这会将数据卷内容压缩为 `backup\data-backup.tar.gz`
echo.

rem 根据 docker-compose.yml 的配置，硬编码数据卷名称以确保一致性。
set VOLUME_NAME=urbanization_db

rem 使用一个临时的 alpine 容器来执行 tar 压缩备份
docker run --rm -v %VOLUME_NAME%:/volume -v "%cd%/backup":/backup alpine tar -czf /backup/data-backup.tar.gz -C /volume .

if %errorlevel% neq 0 (
    echo.
    echo [错误] 备份失败！
    echo.
    echo 请检查 Docker 是否正常运行，以及名为 '%VOLUME_NAME%' 的数据卷是否存在。
    echo.
    pause
    exit /b
)

echo.
echo =================================================================
echo.
echo            🎉 恭喜！数据已成功备份！ 🎉
echo.
echo =================================================================
echo.
echo - 备份文件路径: `backup\data-backup.tar.gz`
echo.
echo - 请妥善保管此文件。恢复数据时需要用到它。
echo.
pause 