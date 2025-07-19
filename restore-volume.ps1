# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 从备份恢复Docker卷数据的PowerShell脚本
# 适用于Windows 10环境下的Docker Desktop

Write-Host "==== 数据恢复工具 ====" -ForegroundColor Green

# 检查Docker是否运行
try {
    docker info | Out-Null
    Write-Host "Docker运行正常，准备进行恢复..." -ForegroundColor Green
} catch {
    Write-Host "Docker未运行，请先启动Docker Desktop后再尝试恢复。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 定义备份目录
$backupDir = ".\backups"

# 检查备份目录是否存在
if (-not (Test-Path -Path $backupDir)) {
    Write-Host "未找到备份目录: $backupDir" -ForegroundColor Red
    Write-Host "请确保已经创建过备份。" -ForegroundColor Red
    exit 1
}

# 获取备份文件列表
$backupFiles = Get-ChildItem -Path $backupDir -Filter "urbanization_backup_*.tar" | Sort-Object LastWriteTime -Descending

if ($backupFiles.Count -eq 0) {
    Write-Host "未找到任何备份文件。请先运行备份脚本创建备份。" -ForegroundColor Red
    exit 1
}

# 显示可用的备份文件
Write-Host "可用的备份文件:" -ForegroundColor Cyan
for ($i = 0; $i -lt $backupFiles.Count; $i++) {
    $file = $backupFiles[$i]
    $fileSize = [math]::Round($file.Length / 1MB, 2)
    $fileDate = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$i] $($file.Name) - $fileSize MB - $fileDate" -ForegroundColor Yellow
}

# 请用户选择备份文件
$selection = -1
do {
    $input = Read-Host "请输入要恢复的备份文件编号 (0-$($backupFiles.Count - 1))"
    if ($input -match '^\d+$' -and [int]$input -ge 0 -and [int]$input -lt $backupFiles.Count) {
        $selection = [int]$input
    } else {
        Write-Host "无效的选择，请重新输入。" -ForegroundColor Red
    }
} while ($selection -eq -1)

$selectedFile = $backupFiles[$selection]
Write-Host "已选择: $($selectedFile.Name)" -ForegroundColor Green

# 确认是否继续
Write-Host "`n警告: 恢复操作将覆盖当前数据卷中的所有数据！" -ForegroundColor Red
$confirmation = Read-Host "是否确定继续？输入 'yes' 确认"

if ($confirmation -ne "yes") {
    Write-Host "操作已取消。" -ForegroundColor Yellow
    exit 0
}

# 停止相关容器
Write-Host "正在停止运行中的容器..." -ForegroundColor Yellow
docker-compose down

# 检查卷是否存在，如果存在则删除
$volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "urbanization_db"

if ($volumeExists) {
    Write-Host "正在删除现有数据卷..." -ForegroundColor Yellow
    docker volume rm urbanization_db
}

# 创建新的卷
Write-Host "正在创建新数据卷..." -ForegroundColor Yellow
docker volume create urbanization_db

# 从备份文件恢复数据
Write-Host "正在从备份文件恢复数据..." -ForegroundColor Yellow
try {
    docker run --rm -v urbanization_db:/data -v ${PWD}/$backupDir:/backup alpine sh -c "tar -xf /backup/$($selectedFile.Name) -C /data"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "数据恢复成功！" -ForegroundColor Green
    } else {
        Write-Host "恢复过程中出现错误。" -ForegroundColor Red
    }
} catch {
    Write-Host "恢复过程中出现异常: $_" -ForegroundColor Red
}

# 重新启动容器
Write-Host "正在重新启动容器..." -ForegroundColor Yellow
docker-compose up -d

# 检查容器是否正常运行
Start-Sleep -Seconds 5
$containerStatus = docker ps --format "{{.Names}} - {{.Status}}" | Select-String -Pattern "urbanization"

if ($containerStatus) {
    Write-Host "已成功启动！" -ForegroundColor Green
    Write-Host "容器状态: $containerStatus" -ForegroundColor Green
    Write-Host "系统访问地址: http://localhost:3333" -ForegroundColor Cyan
} else {
    Write-Host "可能未正常启动，请检查日志:" -ForegroundColor Red
    docker-compose logs
}

Write-Host "==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 