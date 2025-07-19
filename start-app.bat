@echo off

:: 设置 cmd 窗口代码页为 UTF-8
chcp 65001 > nul

:: 获取批处理文件所在的完整路径
set "SCRIPT_PATH=%~dpn0.ps1"

:: 使用 powershell.exe 执行对应的 .ps1 脚本
:: -NoProfile: 不加载用户配置文件，启动更快
:: -ExecutionPolicy Bypass: 临时绕过执行策略限制，允许运行未签名的本地脚本
:: -File: 指定要运行的脚本文件
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" 