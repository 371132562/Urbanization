# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 备份Docker卷数据的PowerShell脚本
# 适用于Windows 10环境下的Docker Desktop

Write-Host "==== 数据备份工具 ====" -ForegroundColor Green

# 获取当前日期和时间，用于备份文件命名
$dateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFileName = "urbanization_backup_$dateStamp.tar"

# 创建备份目录（如果不存在）
$backupDir = ".\backups"
if (-not (Test-Path -Path $backupDir)) {
    Write-Host "创建备份目录: $backupDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# 检查Docker是否运行
try {
    docker info | Out-Null
    Write-Host "Docker运行正常，准备进行备份..." -ForegroundColor Green
} catch {
    Write-Host "Docker未运行，请先启动Docker Desktop后再尝试备份。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 检查卷是否存在
$volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "urbanization_db"

if (-not $volumeExists) {
    Write-Host "未找到数据卷(urbanization_db)，请确保系统已经至少启动过一次。" -ForegroundColor Red
    exit 1
}

# 创建一个临时容器来访问卷数据并备份
Write-Host "正在备份数据卷urbanization_db..." -ForegroundColor Yellow
Write-Host "备份文件将保存为: $backupDir\$backupFileName" -ForegroundColor Cyan

try {
    # 创建临时容器并将卷挂载到容器中的/data目录，然后将/data目录打包成tar文件
    docker run --rm -v urbanization_db:/data -v ${PWD}/$backupDir:/backup alpine tar -cf /backup/$backupFileName -C /data .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "备份成功完成！" -ForegroundColor Green
        Write-Host "备份文件: $backupDir\$backupFileName" -ForegroundColor Green
        
        # 显示备份文件大小
        $fileInfo = Get-Item "$backupDir\$backupFileName"
        $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "备份文件大小: $fileSizeMB MB" -ForegroundColor Green
    } else {
        Write-Host "备份过程中出现错误。" -ForegroundColor Red
    }
} catch {
    Write-Host "备份过程中出现异常: $_" -ForegroundColor Red
}

Write-Host "==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 