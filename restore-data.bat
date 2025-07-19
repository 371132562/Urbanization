@echo off
rem 设置控制台编码为 UTF-8 以便正确显示中文。
chcp 65001 > nul

echo.
echo =================================================================
echo.
echo              世界城镇化项目 - 数据恢复脚本
echo.
echo =================================================================
echo.

rem --- 检查 Docker 环境 ---
echo [1/4] 正在检查 Docker 环境...
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

rem --- 检查备份文件 ---
echo [2/4] 正在检查备份文件...
if not exist "backup\data-backup.tar.gz" (
    echo.
    echo [错误] 未找到备份文件！
    echo.
    echo 请确保 `backup\data-backup.tar.gz` 文件存在于当前目录。
    echo 您可以先运行 `backup-data.bat` 来创建一个备份。
    echo.
    pause
    exit /b
)
echo 找到备份文件 `backup\data-backup.tar.gz`。
echo.

rem --- 用户确认 ---
echo [3/4] 用户确认
echo.
echo ============================ 警告! ============================
echo.
echo  此操作将用备份文件中的数据覆盖当前所有数据，且此过程
echo  不可逆！
echo.
echo  强烈建议在执行此操作前，先运行一次备份脚本。
echo.
echo ===============================================================
echo.
set /p "confirm=您确定要继续吗? (输入 Y 确认): "
if /i not "%confirm%"=="Y" (
    echo.
    echo 操作已取消。
    echo.
    pause
    exit /b
)
echo.

rem --- 执行恢复 ---
echo [4/4] 正在从备份文件恢复数据...
echo.

rem 根据 docker-compose.yml 的配置，硬编码数据卷名称以确保一致性。
set VOLUME_NAME=urbanization_db

rem 停止当前正在运行的服务，以防文件占用
echo 正在停止相关服务，以安全恢复数据...
docker-compose down > nul

rem 使用一个临时的 alpine 容器来解压备份文件到数据卷
docker run --rm -v %VOLUME_NAME%:/volume -v "%cd%/backup":/backup alpine sh -c "cd /volume && tar -xzf /backup/data-backup.tar.gz"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 恢复失败！
    echo.
    echo 请检查 Docker 是否正常运行以及备份文件是否有效。
    echo.
    pause
    exit /b
)

echo.
echo =================================================================
echo.
echo             🎉 恭喜！数据已成功恢复！ 🎉
echo.
echo =================================================================
echo.
echo - 数据已从 `backup\data-backup.tar.gz` 成功恢复。
echo.
echo - 您现在可以运行 `start-app.bat` 来启动应用程序。
echo.
pause 