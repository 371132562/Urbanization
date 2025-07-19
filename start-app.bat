@echo off

:: 设置代码页为 UTF-8，以正确显示中文
chcp 65001 > nul

:: 获取批处理文件所在的目录
set "SCRIPT_DIR=%~dp0"

:: 定义 PortableGit 的路径
set "GIT_BASH_PATH=%SCRIPT_DIR%PortableGit\bin\bash.exe"

:: 检查 bash.exe 是否存在
if not exist "%GIT_BASH_PATH%" (
    echo.
    echo 错误：未在以下路径找到 Git Bash 环境：
    echo %GIT_BASH_PATH%
    echo.
    echo 请确认 PortableGit 已被解压到项目根目录下的 "PortableGit" 文件夹中。
    echo.
    pause
    exit /b 1
)

:: 使用 start 命令在新窗口中启动 bash 并执行 .sh 脚本
:: "启动应用" 是新窗口的标题
:: /d "%SCRIPT_DIR%" 设置新窗口的工作目录
:: --login -i: 让 bash 以交互式登录 shell 的方式启动，这样可以获得更好的环境和体验
echo 正在打开新的 Bash 窗口以启动应用...
start "启动应用" /d "%SCRIPT_DIR%" "%GIT_BASH_PATH%" --login -i -c "./start-app.sh; read -p '按 Enter 键关闭此窗口...'" 