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

:: 使用 PortableGit 的 bash.exe 执行对应的 .sh 脚本
echo 正在启动应用...
"%GIT_BASH_PATH%" -c "cd '%SCRIPT_DIR%' && ./start-app.sh" 