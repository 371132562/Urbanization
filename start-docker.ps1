# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 启动Docker容器的PowerShell脚本
# 适用于Windows 10环境下的Docker Desktop

Write-Host "==== 正在启动 ====" -ForegroundColor Green

# 确保Docker Desktop正在运行
try {
    docker info | Out-Null
    Write-Host "Docker运行正常..." -ForegroundColor Green
} catch {
    Write-Host "Docker未运行，请先启动Docker Desktop后再次运行此脚本。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 停止并删除当前正在运行的容器
Write-Host "正在停止并删除现有容器..." -ForegroundColor Yellow
docker-compose down

# 删除相关的旧镜像
Write-Host "正在查找旧镜像..." -ForegroundColor Yellow
$images = docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | Select-String -Pattern "linstar666/urbanization"

if ($images) {
    Write-Host "发现以下旧镜像，将被删除:" -ForegroundColor Yellow
    foreach ($image in $images) {
        Write-Host $image -ForegroundColor Gray
    }

    # 使用prune命令，删除未使用的镜像
    Write-Host "正在删除旧镜像..." -ForegroundColor Yellow
    docker image rm -f $(docker images --format "{{.ID}}" --filter=reference="linstar666/urbanization*")
} else {
    Write-Host "未发现旧镜像" -ForegroundColor Green
}

# 拉取最新镜像并启动容器
Write-Host "正在拉取最新镜像并启动..." -ForegroundColor Yellow
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