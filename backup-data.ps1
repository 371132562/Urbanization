# 设置窗口标题
$Host.UI.RawUI.WindowTitle = "数据备份脚本"
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- 配置 ---
# 这是在 docker-compose.yml 中定义的数据库持久化卷的名称。
$VolumeName = "urbanization_db"
# 定义用于存放备份文件的目录名
$BackupDirName = "backups"
# 获取备份目录的完整路径
$BackupDirPath = Join-Path -Path (Get-Location) -ChildPath $BackupDirName
# 定义备份文件的名称
$BackupFile = "backup-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').tar"
# --- 配置结束 ---

Write-Host "--- 数据备份脚本 ---" -ForegroundColor Yellow
Write-Output "=========================================="
Write-Host "准备备份数据库卷: $VolumeName"

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

# 如果备份目录不存在，则创建它
if (-not (Test-Path -Path $BackupDirPath -PathType Container)) {
    Write-Host "创建备份目录: $BackupDirName" -ForegroundColor Cyan
    New-Item -Path $BackupDirPath -ItemType Directory | Out-Null
}

Write-Output "=========================================="
Write-Host "开始执行备份操作..." -ForegroundColor Cyan
Write-Host "备份文件将保存到: $($BackupDirName)\$($BackupFile)"

# 使用一个临时的、轻量的 Alpine Linux 容器来访问卷并创建备份
# -v "${BackupDirPath}:/backup": 将我们创建的备份目录挂载到容器内
docker run --rm `
    -v "${VolumeName}:/volume_data" `
    -v "${BackupDirPath}:/backup" `
    alpine `
    tar -cf "/backup/$BackupFile" -C /volume_data .

if ($?) {
    Write-Output "=========================================="
    Write-Host "✅ 备份成功！" -ForegroundColor Green
    Write-Host "备份文件 $BackupFile 已保存在 $BackupDirName 目录下。"
}
else {
    Write-Output "=========================================="
    Write-Host "❌ 备份过程中发生错误。" -ForegroundColor Red
    Write-Host "请检查以上日志输出，并确认 Docker 卷 '$VolumeName' 是否存在。"
}

Write-Output ""
Read-Host "按任意键退出窗口..." 