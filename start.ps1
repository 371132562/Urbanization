# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 开启错误显示，防止脚本闪退
$ErrorActionPreference = "Stop"

# 标题和版本信息
$scriptVersion = "1.0.0"
$scriptTitle = "==== 正在启动 v$scriptVersion ===="

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
    Write-Host "无法检查PowerShell执行策略，但这不会影响启动操作。" -ForegroundColor Yellow
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

# 确保Docker Desktop正在运行
try {
    Write-Host "检查Docker服务状态..." -ForegroundColor Gray
    docker info | Out-Null
    Write-Host "Docker运行正常..." -ForegroundColor Green
} catch {
    Handle-Error "Docker未运行，请先启动Docker Desktop后再次运行此脚本。"
}

# 配置Docker镜像源
# try {
#     Write-Host "`n=== Docker镜像源配置（可选） ===" -ForegroundColor Cyan
#     Write-Host "说明：镜像源可以加速Docker下载镜像的速度。首次使用时可以跳过此步骤(输入n)，" -ForegroundColor White
#     Write-Host "      如果后续遇到镜像下载缓慢或超时问题，再重新运行脚本并配置镜像源。" -ForegroundColor White
    
#     $configureRegistry = Read-Host "`n是否要配置Docker镜像源？请输入y(是)或n(否)，然后按回车键。默认为n(否)"
    
#     if ($configureRegistry -eq "y" -or $configureRegistry -eq "Y") {
#         Write-Host "`n可用的Docker镜像源选项:" -ForegroundColor Cyan
#         Write-Host "════════════════════════════════════════════"
#         Write-Host " [1] 1Panel镜像站 (推荐)"
#         Write-Host "     - 地址: https://docker.1panel.live"
#         Write-Host " [2] DaoCloud镜像站"
#         Write-Host "     - 地址: https://docker.m.daocloud.io" 
#         Write-Host " [3] 自定义镜像源 (需要您输入地址)"
#         Write-Host " [0] 取消，不设置镜像源"
#         Write-Host "════════════════════════════════════════════"
#         Write-Host "操作说明: 请输入上方选项前的数字(0、1、2或3)，然后按回车键。" -ForegroundColor Yellow
#         Write-Host "注意: 只能选择一个镜像源，不支持多选。" -ForegroundColor Yellow
        
#         $choice = Read-Host "`n您的选择"
        
#         $registryUrl = ""
#         switch ($choice) {
#          "1" { 
#             $registryUrl = "https://docker.1panel.live" 
#             Write-Host "您选择了: 1Panel镜像站" -ForegroundColor Green
#          }
#          "2" { 
#             $registryUrl = "https://docker.m.daocloud.io" 
#             Write-Host "您选择了: DaoCloud镜像站" -ForegroundColor Green
#          }
#          "3" { 
#             Write-Host "您选择了: 自定义镜像源" -ForegroundColor Green
#             Write-Host "请输入镜像源的完整网址，例如: https://docker.mirrors.ustc.edu.cn" -ForegroundColor Yellow
#             $registryUrl = Read-Host "镜像源地址"
#             if ($registryUrl -eq "") {
#                 Write-Host "您没有输入有效的地址，将不设置镜像源" -ForegroundColor Yellow
#             } else {
#                 Write-Host "您输入的镜像源地址: $registryUrl" -ForegroundColor Green
#             }
#          }
#          "0" { 
#             Write-Host "您选择了不设置镜像源，将使用Docker默认设置" -ForegroundColor Yellow 
#          }
#          default { 
#             Write-Host "无效的选择，将使用Docker默认设置" -ForegroundColor Yellow 
#          }
#         }
        
#         if ($registryUrl -ne "") {
#             # Docker Desktop的配置文件路径
#             $configPath = "$env:USERPROFILE\.docker\config.json"
            
#             try {
#                 # 检查配置文件是否存在
#                 if (Test-Path $configPath) {
#                     # 读取现有配置
#                     $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
                    
#                     # 如果没有registry-mirrors字段，添加它
#                     if (-not ($config.PSObject.Properties.Name -contains "registry-mirrors")) {
#                         Add-Member -InputObject $config -MemberType NoteProperty -Name "registry-mirrors" -Value @()
#                     }
                    
#                     # 更新registry-mirrors
#                     $config."registry-mirrors" = @($registryUrl)
                    
#                     # 保存配置
#                     $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath
#                 } else {
#                     # 创建新的配置文件
#                     $config = @{
#                         "registry-mirrors" = @($registryUrl)
#                     }
                    
#                     # 确保目录存在
#                     New-Item -ItemType Directory -Path "$env:USERPROFILE\.docker" -Force | Out-Null
                    
#                     # 保存配置
#                     $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath
#                 }
                
#                 Write-Host "`n镜像源配置成功! 已设置为: $registryUrl" -ForegroundColor Green
#                 Write-Host "注意: 您需要重启Docker才能使新的设置生效" -ForegroundColor Yellow
                
#                 $restartDocker = Read-Host "`n是否现在重启Docker? 请输入y(是)或n(否)，然后按回车键。默认为n(否)"
#                 if ($restartDocker -eq "y" -or $restartDocker -eq "Y") {
#                     Write-Host "正在尝试重启Docker引擎..." -ForegroundColor Yellow
#                     try {
#                         # 尝试使用Docker CLI重启引擎
#                         docker system info > $null 2>&1
#                         if ($?) {
#                             Write-Host "请手动重启Docker Desktop以应用新配置。" -ForegroundColor Yellow
#                             Write-Host "请在重启完成后，按回车键继续..." -ForegroundColor Yellow
#                             $confirm = Read-Host " "
#                         }
#                     } catch {
#                         Write-Host "无法自动重启Docker引擎，请手动重启Docker Desktop。" -ForegroundColor Red
#                         Write-Host "请在重启完成后，按回车键继续..." -ForegroundColor Yellow
#                         $confirm = Read-Host " "
#                     }
#                 }
#             } catch {
#                 Write-Host "配置Docker镜像源时出错: $_" -ForegroundColor Red
#                 Write-Host "将继续使用默认镜像源" -ForegroundColor Yellow
#             }
#         }
#     } else {
#         Write-Host "您选择了跳过镜像源配置，将使用Docker默认设置" -ForegroundColor Yellow
#     }
# } catch {
#     Write-Host "配置镜像源过程中出现错误，将使用默认配置: $_" -ForegroundColor Red
# }

# 停止并删除当前正在运行的容器
try {
    Write-Host "`n正在停止并删除现有容器..." -ForegroundColor Yellow
    docker compose down
    if ($LASTEXITCODE -ne 0) {
        Write-Host "注意: 停止容器可能出现问题，但将继续尝试启动" -ForegroundColor Yellow
    }
} catch {
    Write-Host "停止容器时出现警告: $_" -ForegroundColor Yellow
    Write-Host "这可能是因为没有运行中的容器，将继续尝试启动" -ForegroundColor Yellow
}

# 加载本地Docker镜像
try {
    $imageTarFile = "urbanization.tar"
    if (Test-Path $imageTarFile) {
        Write-Host "`n正在从本地文件 'urbanization.tar' 加载Docker镜像..." -ForegroundColor Yellow
        docker load -i $imageTarFile
        if ($LASTEXITCODE -ne 0) {
            Handle-Error "从 'urbanization.tar' 加载镜像失败，错误码: $LASTEXITCODE"
        }
        Write-Host "主应用镜像加载成功。" -ForegroundColor Green
    } else {
        Write-Host "`n未找到主应用镜像文件 'urbanization.tar'，将中止启动。" -ForegroundColor Red
        Handle-Error "缺少必要的应用镜像 'urbanization.tar'。"
    }
} catch {
    Handle-Error "加载本地镜像过程中出错: $_"
}

# 启动容器
try {
    Write-Host "`n正在启动容器..." -ForegroundColor Yellow
    # docker compose pull # 如果使用本地tar包，可以注释掉此行
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "启动容器失败，错误码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "启动容器过程中出错: $_"
}

# 检查容器是否正常运行
try {
    Write-Host "等待容器启动..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    $containerStatus = docker ps --format "{{.Names}} - {{.Status}}" | Select-String -Pattern "urbanization"

    if ($containerStatus) {
        Write-Host "`n已成功启动！" -ForegroundColor Green
        Write-Host "容器状态: $containerStatus" -ForegroundColor Green
        Write-Host "系统访问地址: http://localhost:1818" -ForegroundColor Cyan
    } else {
        Write-Host "`n警告: 容器可能未正常启动，请检查日志:" -ForegroundColor Red
        docker compose logs
    }
} catch {
    Write-Host "`n警告: 无法检查容器状态: $_" -ForegroundColor Red
    Write-Host "请手动运行 'docker compose logs' 查看详情。" -ForegroundColor Yellow
}

# 清理无用的旧镜像
try {
    Write-Host "`n正在清理无用的旧镜像以释放磁盘空间..." -ForegroundColor Yellow
    docker image prune -f
    if ($LASTEXITCODE -ne 0) {
        Write-Host "清理旧镜像时遇到问题，但这不影响当前应用运行。" -ForegroundColor Yellow
    } else {
        Write-Host "清理完成。" -ForegroundColor Green
    }
} catch {
    Write-Host "清理旧镜像时出现警告: $_" -ForegroundColor Yellow
}


Write-Host "`n==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Write-Host "脚本执行完毕，窗口将在10秒后关闭..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} 