# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 开启错误显示，防止脚本闪退
$ErrorActionPreference = "Stop"

# 标题和版本信息
$scriptVersion = "1.0.1"
$scriptTitle = "==== 数据恢复工具 v$scriptVersion ===="

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
    Write-Host "无法检查PowerShell执行策略，但这不会影响恢复操作。" -ForegroundColor Yellow
}

# 创建错误处理函数，避免闪退
function Handle-Error {
    param([string]$errorMessage)
    Write-Host "`n发生错误: $errorMessage" -ForegroundColor Red
    Write-Host "`n请按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
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

# 检查Docker是否运行
try {
    Write-Host "检查Docker服务状态..." -ForegroundColor Gray
    docker info | Out-Null
    Write-Host "Docker运行正常，准备进行恢复..." -ForegroundColor Green
} catch {
    Handle-Error "Docker未运行，请先启动Docker Desktop后再尝试恢复。"
}

# 定义备份目录
$backupDir = ".\backups"

# 检查备份目录是否存在
try {
    Write-Host "检查备份目录是否存在..." -ForegroundColor Gray
    if (-not (Test-Path -Path $backupDir)) {
        Handle-Error "未找到备份目录: $backupDir`n请确保已经创建过备份。"
    }
} catch {
    Handle-Error "无法访问备份目录: $_"
}

# 获取备份文件列表
try {
    Write-Host "搜索备份文件..." -ForegroundColor Gray
    $backupFiles = Get-ChildItem -Path $backupDir -Filter "urbanization_backup_*.tar" -ErrorAction Stop | Sort-Object LastWriteTime -Descending

    if ($backupFiles.Count -eq 0) {
        Handle-Error "未找到任何备份文件。请先运行备份脚本创建备份。"
    } else {
        Write-Host "找到 $($backupFiles.Count) 个备份文件。" -ForegroundColor Green
    }
} catch {
    Handle-Error "无法读取备份文件: $_"
}

# 显示可用的备份文件
Write-Host "`n可用的备份文件:" -ForegroundColor Cyan
for ($i = 0; $i -lt $backupFiles.Count; $i++) {
    $file = $backupFiles[$i]
    $fileSize = [math]::Round($file.Length / 1MB, 2)
    $fileDate = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$i] $($file.Name) - $fileSize MB - $fileDate" -ForegroundColor Yellow
}

# 请用户选择备份文件
$selection = -1
$maxAttempts = 3
$attempts = 0

do {
    $attempts++
    try {
        $input = Read-Host "`n请输入要恢复的备份文件编号 (0-$($backupFiles.Count - 1))"
        if ($input -match '^\d+$' -and [int]$input -ge 0 -and [int]$input -lt $backupFiles.Count) {
            $selection = [int]$input
        } else {
            Write-Host "无效的选择，请输入0到$($backupFiles.Count - 1)之间的数字。" -ForegroundColor Red
            if ($attempts -ge $maxAttempts) {
                Handle-Error "已达到最大尝试次数，操作取消。"
            }
        }
    } catch {
        Write-Host "输入处理出错: $_" -ForegroundColor Red
        if ($attempts -ge $maxAttempts) {
            Handle-Error "已达到最大尝试次数，操作取消。"
        }
    }
} while ($selection -eq -1)

$selectedFile = $backupFiles[$selection]
Write-Host "已选择: $($selectedFile.Name)" -ForegroundColor Green

# 确认是否继续
try {
    Write-Host "`n警告: 恢复操作将覆盖当前数据卷中的所有数据！" -ForegroundColor Red
    $confirmation = Read-Host "是否确定继续？输入 'yes' 确认"

    if ($confirmation -ne "yes") {
        Write-Host "操作已取消。" -ForegroundColor Yellow
        Write-Host "`n按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 0
    }
} catch {
    Handle-Error "确认过程中出错: $_"
}

# 停止相关容器
try {
    Write-Host "`n正在停止运行中的容器..." -ForegroundColor Yellow
    docker-compose down
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "停止容器失败，错误码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "停止容器过程中出错: $_"
}

# 检查卷是否存在，如果存在则删除
try {
    Write-Host "检查卷是否存在..." -ForegroundColor Gray
    $volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "urbanization_db"

    if ($volumeExists) {
        Write-Host "正在删除现有数据卷..." -ForegroundColor Yellow
        docker volume rm urbanization_db
        if ($LASTEXITCODE -ne 0) {
            Handle-Error "删除数据卷失败，错误码: $LASTEXITCODE"
        }
    }
} catch {
    Handle-Error "检查/删除卷过程中出错: $_"
}

# 创建新的卷
try {
    Write-Host "正在创建新数据卷..." -ForegroundColor Yellow
    docker volume create urbanization_db
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "创建新数据卷失败，错误码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "创建卷过程中出错: $_"
}

# 从备份文件恢复数据
Write-Host "正在从备份文件恢复数据..." -ForegroundColor Yellow
try {
    $restoreCommand = "docker run --rm -v urbanization_db:/data -v ${PWD}/$backupDir:/backup alpine sh -c 'tar -xf /backup/$($selectedFile.Name) -C /data'"
    Write-Host "执行命令: $restoreCommand" -ForegroundColor Gray
    
    docker run --rm -v urbanization_db:/data -v ${PWD}/$backupDir:/backup alpine sh -c "tar -xf /backup/$($selectedFile.Name) -C /data"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "数据恢复成功！" -ForegroundColor Green
    } else {
        Handle-Error "恢复过程中出现错误，Docker命令返回非零状态码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "恢复过程中出现异常: $_"
}

# 重新启动容器
try {
    Write-Host "正在重新启动容器..." -ForegroundColor Yellow
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "重新启动容器失败，错误码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "重新启动容器过程中出错: $_"
}

# 检查容器是否正常运行
try {
    Write-Host "等待容器启动..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    $containerStatus = docker ps --format "{{.Names}} - {{.Status}}" | Select-String -Pattern "urbanization"

    if ($containerStatus) {
        Write-Host "`n已成功启动！" -ForegroundColor Green
        Write-Host "容器状态: $containerStatus" -ForegroundColor Green
        Write-Host "系统访问地址: http://localhost:3333" -ForegroundColor Cyan
    } else {
        Write-Host "`n警告: 容器可能未正常启动，请检查日志:" -ForegroundColor Red
        docker-compose logs
    }
} catch {
    Write-Host "`n警告: 无法检查容器状态: $_" -ForegroundColor Red
    Write-Host "请手动运行 'docker-compose logs' 查看详情。" -ForegroundColor Yellow
}

Write-Host "`n==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Write-Host "脚本执行完毕，窗口将在10秒后关闭..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} 