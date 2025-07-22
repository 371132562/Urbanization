# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 开启错误显示，防止脚本闪退
$ErrorActionPreference = "Stop"

# 标题和版本信息
$scriptVersion = "1.0.1"
$scriptTitle = "==== 数据备份工具 v$scriptVersion ===="

# 显示标题
Write-Host $scriptTitle -ForegroundColor Green
Write-Host "正在初始化环境..." -ForegroundColor Gray

# 处理PowerShell执行策略检查
try {
    # 获取当前执行策略
    $policy = Get-ExecutionPolicy -Scope Process
    Write-Host "当前PowerShell执行策略: $policy" -ForegroundColor Gray
    
    # 如果执行策略过于严格，提供修改建议
    if ($policy -eq "Restricted" -or $policy -eq "AllSigned") {
        Write-Host "注意: 您当前的PowerShell执行策略较为严格，可能影响脚本运行。" -ForegroundColor Yellow
        Write-Host "如遇问题，可尝试在管理员PowerShell中执行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    }
} catch {
    Write-Host "无法检查PowerShell执行策略，但这不会影响备份操作。" -ForegroundColor Yellow
}

# 创建错误处理函数，避免闪退
function Handle-Error {
    param([string]$errorMessage)
    Write-Host "`n发生错误: $errorMessage" -ForegroundColor Red
    Write-Host "`n请按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 加载 alpine 镜像（用于备份）
try {
    $alpineTarFile = "alpine.tar"
    if (Test-Path $alpineTarFile) {
        Write-Host "`n检查到 alpine.tar，尝试加载..." -ForegroundColor Yellow
        docker load -i $alpineTarFile
        if ($LASTEXITCODE -ne 0) {
            Handle-Error "从 'alpine.tar' 加载镜像失败，错误码: $LASTEXITCODE"
        }
        Write-Host "Alpine 镜像已加载，可用于备份。" -ForegroundColor Green
    }
    # 如果文件不存在，我们假定 Docker 中可能已经有 alpine 镜像，或者可以从网络拉取，脚本会继续尝试
} catch {
    Handle-Error "加载 alpine 镜像过程中出错: $_"
}

# 确保当前目录正确（如果从其他目录运行脚本）
try {
    # 获取脚本所在目录
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    # 切换到脚本所在目录
    Set-Location $scriptPath
    Write-Host "工作目录: $scriptPath" -ForegroundColor Gray
} catch {
    Handle-Error "无法设置正确的工作目录: $_"
}

# 获取当前日期和时间，用于备份文件命名
$dateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFileName = "urbanization_backup_$dateStamp.tar"

# 创建备份目录（如果不存在）
$backupDir = ".\backups"
try {
    if (-not (Test-Path -Path $backupDir)) {
        Write-Host "创建备份目录: $backupDir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    } else {
        Write-Host "已存在备份目录: $backupDir" -ForegroundColor Gray
    }
} catch {
    Handle-Error "无法创建备份目录: $_"
}

# 检查Docker是否运行
try {
    Write-Host "检查Docker服务状态..." -ForegroundColor Gray
    docker info | Out-Null
    Write-Host "Docker运行正常，准备进行备份..." -ForegroundColor Green
} catch {
    Handle-Error "Docker未运行，请先启动Docker Desktop后再尝试备份。"
}

# 检查卷是否存在
try {
    Write-Host "检查数据卷是否存在..." -ForegroundColor Gray
    $volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "urbanization_db"

    if (-not $volumeExists) {
        Handle-Error "未找到数据卷(urbanization_db)，请确保系统已经至少启动过一次。"
    } else {
        Write-Host "找到数据卷: urbanization_db" -ForegroundColor Green
    }
} catch {
    Handle-Error "无法检查数据卷: $_"
}

# 创建一个临时容器来访问卷数据并备份
Write-Host "正在备份数据卷urbanization_db..." -ForegroundColor Yellow
Write-Host "备份文件将保存为: $backupDir\$backupFileName" -ForegroundColor Cyan

try {
    # 创建临时容器并将卷挂载到容器中的/data目录，然后将/data目录打包成tar文件
    Write-Host "执行备份命令..." -ForegroundColor Gray
    docker run --rm -v urbanization_db:/data -v ${PWD}/${backupDir}:/backup alpine tar -cf /backup/$backupFileName -C /data .
    
    if ($LASTEXITCODE -eq 0) {
        # 检查文件是否实际创建
        $backupFilePath = "$backupDir\$backupFileName"
        if (Test-Path $backupFilePath) {
            Write-Host "`n备份成功完成！" -ForegroundColor Green
            Write-Host "备份文件: $backupFilePath" -ForegroundColor Green
            
            # 显示备份文件大小
            $fileInfo = Get-Item $backupFilePath
            $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
            Write-Host "备份文件大小: $fileSizeMB MB" -ForegroundColor Green
        } else {
            Handle-Error "备份命令执行成功，但未找到生成的备份文件。"
        }
    } else {
        Handle-Error "备份过程中出现错误，Docker命令返回非零状态码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "备份过程中出现异常: $_"
}

Write-Host "`n==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Write-Host "脚本执行完毕，窗口将在10秒后关闭..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} 