# 设置 PowerShell 窗口标题
$Host.UI.RawUI.WindowTitle = "应用启动脚本"

# 设置输出编码为 UTF-8，确保中文字符正确显示
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Output "正在启动 Docker 服务，请稍候..."
Write-Output "=========================================="

# 检查 Docker 是否正在运行
# 使用 docker info 命令，并忽略其正常输出，只关心是否出错
try {
    docker info | Out-Null
    Write-Host "✅ Docker 已成功连接。" -ForegroundColor Green
}
catch {
    Write-Host "❌ 错误：Docker Desktop 未运行。" -ForegroundColor Red
    Write-Host "请先启动 Docker Desktop，然后重新运行此脚本。"
    Read-Host "按回车键退出..."
    exit 1
}

Write-Output "=========================================="
Write-Host "正在拉取最新镜像并启动容器..." -ForegroundColor Cyan
Write-Host "这可能需要一些时间，请耐心等待..."

# --pull always: 强制总是尝试拉取镜像的最新版本
# --remove-orphans: 删除在 docker-compose.yml 文件中已不存在的服务的容器
docker-compose up -d --pull always --remove-orphans

# 检查上一条命令是否成功
# $? 在 PowerShell 中表示上一条命令的执行状态 (True/False)
if ($?) {
    Write-Output "=========================================="
    Write-Host "🎉 服务已成功启动！" -ForegroundColor Green
    Write-Host "您现在可以通过浏览器访问应用。"
    
    Write-Output "------------------------------------------"
    Write-Host "正在清理不再使用的旧镜像..." -ForegroundColor Cyan
    docker image prune -f
}
else {
    Write-Output "=========================================="
    Write-Host "❌ 启动过程中发生错误。请检查上面的日志输出。" -ForegroundColor Red
}

Write-Output ""
Read-Host "按任意键退出窗口..." 