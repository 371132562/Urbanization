# 设置窗口标题和编码
$Host.UI.RawUI.WindowTitle = "数据恢复脚本"
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- 配置 ---
$VolumeName = "urbanization_db"
$BackupDirName = "backups"
# --- 配置结束 ---

Write-Host "--- 数据恢复脚本 ---" -ForegroundColor Yellow
Write-Output "=========================================="

# 检查 Docker 是否正在运行
try {
    docker info | Out-Null
    Write-Host "✅ Docker 已成功连接。" -ForegroundColor Green
}
catch {
    Write-Host "❌ 错误：Docker Desktop 未运行。" -ForegroundColor Red
    Read-Host "按回车键退出..."
    exit 1
}

# 获取备份目录的完整路径
$BackupDirPath = Join-Path -Path (Get-Location) -ChildPath $BackupDirName

# 寻找最新的备份文件 (backup-*.tar)
# Get-ChildItem: 获取目录下的文件
# -Filter: 按名称模式过滤
# Sort-Object LastWriteTime -Descending: 按最后修改时间降序排序
# Select-Object -First 1: 选择第一个，即最新的
$LatestBackup = Get-ChildItem -Path $BackupDirPath -Filter "backup-*.tar" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $LatestBackup) {
    Write-Host "❌ 错误：在 '$BackupDirName' 目录下未找到任何备份文件。" -ForegroundColor Red
    Read-Host "按回车键退出..."
    exit 1
}

Write-Output "=========================================="
Write-Host "找到最新的备份文件: $($LatestBackup.Name)" -ForegroundColor Cyan
Write-Host "将要恢复数据到数据卷: $VolumeName"
Write-Output ""
Write-Host "❗ 警告：此操作将用备份文件中的数据覆盖卷 '$VolumeName' 中的现有内容。" -ForegroundColor Red
Write-Host "❗ 请确保您希望这么做。在继续之前，建议先停止正在使用该卷的 Docker 容器(执行 docker-compose down)。"
Write-Output ""

# 等待用户确认
try {
    $Confirmation = Read-Host "是否继续恢复操作? (输入 y 继续，其他任意键取消)"
    if ($Confirmation.ToLower() -ne 'y') {
        Write-Host "操作已取消。" -ForegroundColor Yellow
        Read-Host "按回车键退出..."
        exit 0
    }
}
catch {
    # 如果用户直接按 Ctrl+C 或者关闭窗口，也会走到这里
    Write-Host "操作已取消。" -ForegroundColor Yellow
    Read-Host "按回车键退出..."
    exit 0
}


Write-Output "=========================================="
Write-Host "正在停止并删除现有服务容器，以释放数据卷..." -ForegroundColor Cyan
# docker-compose down 会停止并删除容器，但默认不会删除卷
docker-compose down

Write-Host "开始恢复数据..." -ForegroundColor Cyan
# 启动一个临时容器，将备份文件解压到目标数据卷
docker run --rm `
    -v "${VolumeName}:/volume_data" `
    -v "${BackupDirPath}:/backup" `
    alpine `
    tar -xf "/backup/$($LatestBackup.Name)" -C /volume_data

if ($?) {
    Write-Output "=========================================="
    Write-Host "✅ 数据恢复成功！" -ForegroundColor Green
    Write-Host "建议您现在重新启动服务以应用已恢复的数据 (运行 start-app.bat)。"
}
else {
    Write-Output "=========================================="
    Write-Host "❌ 数据恢复过程中发生错误。" -ForegroundColor Red
    Write-Host "请检查以上日志输出。"
}

Write-Output ""
Read-Host "按任意键退出窗口..." 