const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const net = require('net')
const log = require('electron-log')

// 设置应用名称，这会影响用户数据目录的名称
app.setName('Urbanization')

// 哨兵代码：通过检查自定义环境变量来防止spawn的子进程重新执行主逻辑
// 区分不同类型的spawn进程，让它们能正常运行而不是立即退出
if (process.env.IS_NEST_SPAWN === 'true') {
  // NestJS服务的spawn进程，这个进程应该继续执行
  // 不做任何操作，让NestJS正常启动
} else if (process.env.IS_PRISMA_SPAWN === 'true') {
  // Prisma迁移的spawn进程，这个进程应该继续执行
  // 不做任何操作，让Prisma迁移命令正常执行
} else if (process.env.IS_ELECTRON_SPAWN === 'true') {
  // 其他可能的Electron应用spawn进程，应该立即退出
  process.exit(0)
}

// 设置环境变量
process.env.DATABASE_URL = 'file:../db/urbanization.db'
process.env.LOG_LEVEL = 'debug'
process.env.UPLOAD_DIR = './db/images'
process.env.LOG_DIR = './db/logs'

// 显示调试弹窗的辅助函数
const showDebugDialog = (title, message) => {
  if (app.isReady()) {
    dialog.showMessageBox({
      type: 'info',
      title: title,
      message: message,
      buttons: ['确定']
    })
  }
  log.info(`[DEBUG] ${title}: ${message}`)
}

// 将日志文件配置到应用的用户数据目录中
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log')

/**
 * 检测指定端口是否被占用，如果被占用则尝试杀死占用该端口的进程
 * @param {number} port - 要检查的端口号
 * @returns {Promise<boolean>} 是否成功释放端口
 */
const checkAndFreePort = port => {
  return new Promise(resolve => {
    const client = new net.Socket()

    client.once('connect', () => {
      // 端口被占用，尝试释放
      client.end()
      showDebugDialog('端口检查', `端口 ${port} 已被占用，尝试释放...`)
      log.info(`端口 ${port} 已被占用，尝试释放...`)

      try {
        // 获取当前进程的PID，用于安全检查
        const currentPID = process.pid

        // 根据操作系统选择不同的命令来找到并杀死占用端口的进程
        if (process.platform === 'win32') {
          // Windows
          const findCmd = `netstat -ano | findstr :${port}`
          const result = execSync(findCmd, { encoding: 'utf8' })

          // 提取PID
          const pidMatches = /\s+(\d+)$/.exec(result)
          if (pidMatches && pidMatches[1]) {
            const pid = pidMatches[1]

            // 安全检查：确保不会杀死自己的进程或父进程
            if (parseInt(pid) === currentPID || parseInt(pid) === process.ppid) {
              showDebugDialog(
                '端口检查',
                `检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`
              )
              log.info(`检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`)
              resolve(true)
              return
            }

            showDebugDialog('端口释放', `尝试杀死Windows进程 PID: ${pid}`)
            log.info(`尝试杀死Windows进程 PID: ${pid}`)
            execSync(`taskkill /F /PID ${pid}`)
            showDebugDialog('端口释放', `成功释放端口 ${port}`)
            log.info(`成功释放端口 ${port}`)
            resolve(true)
          } else {
            showDebugDialog('端口检查', `无法找到占用端口 ${port} 的进程PID`)
            log.error(`无法找到占用端口 ${port} 的进程PID`)
            resolve(false)
          }
        } else {
          // macOS 和 Linux
          const findCmd = `lsof -i:${port} -t`
          const result = execSync(findCmd, { encoding: 'utf8' }).trim()

          if (result) {
            // 可能有多个进程，分行处理
            const pids = result.split('\n')
            let allKilled = true

            pids.forEach(pid => {
              if (pid) {
                const pidNum = parseInt(pid.trim())

                // 安全检查：确保不会杀死自己的进程或父进程
                if (pidNum === currentPID || pidNum === process.ppid) {
                  showDebugDialog(
                    '端口检查',
                    `检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`
                  )
                  log.info(`检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`)
                  return
                }

                showDebugDialog('端口释放', `尝试杀死Unix进程 PID: ${pid}`)
                log.info(`尝试杀死Unix进程 PID: ${pid}`)
                try {
                  execSync(`kill -9 ${pid}`)
                } catch (killError) {
                  showDebugDialog('端口释放', `杀死进程 ${pid} 失败: ${killError.message}`)
                  log.error(`杀死进程 ${pid} 失败: ${killError.message}`)
                  allKilled = false
                }
              }
            })

            if (allKilled) {
              showDebugDialog('端口释放', `成功释放端口 ${port}`)
              log.info(`成功释放端口 ${port}`)
            } else {
              showDebugDialog('端口释放', `部分进程可能未被成功杀死`)
              log.warn(`部分进程可能未被成功杀死`)
            }
            resolve(true)
          } else {
            showDebugDialog('端口检查', `无法找到占用端口 ${port} 的进程`)
            log.error(`无法找到占用端口 ${port} 的进程`)
            resolve(false)
          }
        }
      } catch (error) {
        showDebugDialog('端口释放', `释放端口 ${port} 失败: ${error.message}`)
        log.error(`释放端口 ${port} 失败:`, error.message)
        resolve(false)
      }
    })

    client.once('error', () => {
      // 端口未被占用
      showDebugDialog('端口检查', `端口 ${port} 未被占用，可以正常使用`)
      log.info(`端口 ${port} 未被占用，可以正常使用`)
      resolve(true)
    })

    // 尝试连接端口
    client.connect({ port, host: '127.0.0.1' })
  })
}

// 判断当前是否为开发环境
const isDev = !app.isPackaged

// 全局变量，方便管理窗口和子进程
let mainWindow
let nestProcess

// 将 NestJS 服务的端口号定义为常量，方便修改
const nestPort = 3000

// 在创建窗口和启动后端服务之前，运行 Prisma 数据库迁移
function runMigrations() {
  showDebugDialog('数据库迁移', '开始进行数据库迁移...')
  log.info('开始进行数据库迁移...')

  // 根据环境确定 backend 目录的路径
  const backendPath = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend')

  // 与 startNestService 中逻辑一致，确保迁移时也使用正确的数据库路径
  const migrationEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL
  }
  showDebugDialog('数据库迁移', `迁移使用的数据库路径: ${process.env.DATABASE_URL}`)
  log.info(`迁移使用的数据库路径: ${process.env.DATABASE_URL}`)

  const prismaCliPath = path.join(backendPath, 'node_modules', 'prisma', 'build', 'index.js')
  const schemaPath = path.join(backendPath, 'prisma', 'schema.prisma')

  showDebugDialog('数据库迁移', `准备使用spawn执行Prisma迁移`)
  log.info(`准备使用spawn执行Prisma迁移`)

  try {
    // 使用Electron自带的Node.js运行时，而不是依赖系统安装的node
    const migrationProcess = spawn(
      process.execPath,
      [prismaCliPath, 'migrate', 'deploy', `--schema=${schemaPath}`],
      {
        env: {
          ...migrationEnv,
          IS_PRISMA_SPAWN: 'true' // 标记为Prisma迁移进程
        },
        stdio: 'pipe' // 捕获子进程的输出
      }
    )

    // 处理迁移进程的输出
    migrationProcess.stdout?.on('data', data => {
      showDebugDialog('Prisma迁移', data.toString().trim())
      log.info(`[Prisma Migration]: ${data.toString().trim()}`)
    })

    migrationProcess.stderr?.on('data', data => {
      showDebugDialog('Prisma迁移错误', data.toString().trim())
      log.error(`[Prisma Migration Error]: ${data.toString().trim()}`)
    })

    // 处理迁移进程的退出
    migrationProcess.on('exit', code => {
      if (code === 0) {
        showDebugDialog('数据库迁移', '数据库迁移成功完成。')
        log.info('数据库迁移成功完成。')

        // 数据库迁移成功后执行seed初始化数据
        showDebugDialog('数据库初始化', '开始执行数据库种子初始化...')
        log.info('开始执行数据库种子初始化...')

        // 使用与迁移相同的环境变量
        const seedPath = path.join(backendPath, 'prisma', 'seed.js')

        try {
          // 使用Electron自带的Node.js运行时执行seed脚本
          const seedProcess = spawn(process.execPath, [seedPath], {
            env: {
              ...migrationEnv,
              IS_PRISMA_SPAWN: 'true' // 标记为Prisma进程
            },
            stdio: 'pipe' // 捕获子进程的输出
          })

          // 处理seed进程的输出
          seedProcess.stdout?.on('data', data => {
            showDebugDialog('Prisma种子', data.toString().trim())
            log.info(`[Prisma Seed]: ${data.toString().trim()}`)
          })

          seedProcess.stderr?.on('data', data => {
            showDebugDialog('Prisma种子错误', data.toString().trim())
            log.error(`[Prisma Seed Error]: ${data.toString().trim()}`)
          })

          // 处理seed进程的退出
          seedProcess.on('exit', seedCode => {
            if (seedCode === 0) {
              showDebugDialog('数据库初始化', '数据库初始化成功完成。')
              log.info('数据库初始化成功完成。')
            } else {
              showDebugDialog('数据库初始化', `数据库初始化失败，退出码: ${seedCode}`)
              log.error(`数据库初始化失败，退出码: ${seedCode}`)
            }
          })

          // 处理可能的错误
          seedProcess.on('error', err => {
            showDebugDialog('数据库初始化', `初始化进程启动失败: ${err.message}`)
            log.error('初始化进程启动失败:', err)
          })
        } catch (seedError) {
          showDebugDialog('数据库初始化', `执行数据库初始化失败：${seedError.message}`)
          log.error('执行数据库初始化失败：', seedError)
        }
      } else {
        showDebugDialog('数据库迁移', `数据库迁移失败，退出码: ${code}`)
        log.error(`数据库迁移失败，退出码: ${code}`)
      }
    })

    // 处理可能的错误
    migrationProcess.on('error', err => {
      showDebugDialog('数据库迁移', `迁移进程启动失败: ${err.message}`)
      log.error('迁移进程启动失败:', err)
    })
  } catch (error) {
    showDebugDialog('数据库迁移', `数据库迁移失败: ${error.message}`)
    log.error('数据库迁移失败。')
    // 详细记录 stdout 和 stderr，帮助调试
    if (error.stdout) {
      log.error('STDOUT:', error.stdout.toString())
    }
    if (error.stderr) {
      log.error('STDERR:', error.stderr.toString())
    }
    log.error('完整错误对象:', error)
  }
}

/**
 * 探测指定端口是否已被占用（即服务是否已启动）
 * @param {number} port - 要检查的端口号
 * @param {function(boolean): void} callback - 回调函数，返回端口是否就绪
 */
const ping = (port, callback) => {
  const client = new net.Socket()
  client.once('connect', () => {
    client.end()
    callback(true)
  })
  client.once('error', () => {
    callback(false)
  })
  client.connect({ port })
}

// 尝试连接 NestJS 服务，直到成功
const tryConnect = () => {
  ping(nestPort, isReady => {
    if (isReady) {
      showDebugDialog('服务连接', 'NestJS 服务已就绪，正在创建主窗口...')
      log.info('NestJS 服务已就绪，正在创建主窗口...')
      createMainWindow()
    } else {
      // showDebugDialog('服务连接', 'NestJS 服务尚未就绪，1秒后重试...')
      log.info('NestJS 服务尚未就绪，1秒后重试...')
      setTimeout(tryConnect, 1000)
    }
  })
}

// 创建主应用窗口
const createMainWindow = () => {
  showDebugDialog('窗口创建', '正在创建主应用窗口...')
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  showDebugDialog('窗口创建', `正在加载应用页面: http://localhost:${nestPort}`)
  mainWindow.loadURL(`http://localhost:${nestPort}`)

  mainWindow.on('closed', () => {
    showDebugDialog('窗口关闭', '主窗口已关闭')
    mainWindow = null
  })
}

// 启动 NestJS 后台服务
const startNestService = () => {
  // 根据环境确定 NestJS 后端服务的入口文件路径
  const nestAppPath = isDev
    ? path.join(__dirname, '..', 'backend', 'dist', 'src', 'main.js')
    : path.join(process.resourcesPath, 'backend', 'dist', 'src', 'main.js')

  showDebugDialog('NestJS服务', `正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)
  log.info(`正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)

  nestProcess = spawn(process.execPath, [nestAppPath], {
    // 将数据库、上传和日志目录的路径作为环境变量传递给 NestJS 子进程
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      UPLOAD_DIR: process.env.UPLOAD_DIR,
      LOG_DIR: process.env.LOG_DIR,
      RESOURCES_PATH: process.resourcesPath, // 添加Resources路径环境变量
      APP_PATH: app.getAppPath(), // 添加应用路径环境变量
      IS_NEST_SPAWN: 'true' // 设置一个明确的标识，给哨兵代码使用
    },
    stdio: 'pipe' // 捕获子进程的 stdout 和 stderr
  })

  // 监听 NestJS 进程的 stdout
  nestProcess.stdout.on('data', data => {
    showDebugDialog('NestJS输出', data.toString().trim())
    log.info(`[NestJS]: ${data.toString().trim()}`)
  })

  // 监听 NestJS 进程的 stderr
  nestProcess.stderr.on('data', data => {
    showDebugDialog('NestJS错误', data.toString().trim())
    log.error(`[NestJS Error]: ${data.toString().trim()}`)
  })

  // 监听来自 NestJS 进程的消息 (如果你的 NestJS 应用通过 process.send() 发送消息)
  nestProcess.on('message', message => {
    showDebugDialog('NestJS消息', `收到来自 NestJS 的消息: ${JSON.stringify(message)}`)
    log.info('收到来自 NestJS 的消息:', message)
  })

  // 监听 NestJS 进程的错误事件
  nestProcess.on('error', err => {
    showDebugDialog('NestJS错误', `NestJS 子进程出错: ${err.message}`)
    log.error('NestJS 子进程出错:', err)
  })
  nestProcess.on('exit', code => {
    showDebugDialog('NestJS退出', `NestJS 子进程已退出，退出码: ${code}`)
    log.info(`NestJS 子进程已退出，退出码: ${code}`)
  })
}

app.whenReady().then(async () => {
  showDebugDialog('应用启动', 'Electron应用已准备就绪，开始初始化...')

  // 在启动服务前检查并释放端口
  showDebugDialog('端口检查', `检查端口 ${nestPort} 是否被占用...`)
  log.info(`检查端口 ${nestPort} 是否被占用...`)
  await checkAndFreePort(nestPort)

  showDebugDialog('应用启动', '开始执行数据库迁移...')
  runMigrations() // 在启动后端服务前执行数据库迁移

  showDebugDialog('应用启动', '开始启动NestJS服务...')
  startNestService()

  showDebugDialog('应用启动', '开始探测NestJS服务...')
  tryConnect() // 开始探测 NestJS 服务

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 如果应用被激活时没有窗口，可以重新开始流程
      if (!mainWindow) {
        showDebugDialog('应用激活', '应用被激活，重新开始连接流程...')
        tryConnect()
      }
    }
  })
})

// 当所有窗口都关闭时退出应用，macOS 除外。
app.on('window-all-closed', () => {
  showDebugDialog('应用退出', '所有窗口已关闭，准备退出应用...')
  // 在 macOS 上，除非用户用 Cmd + Q 显式退出，否则应用及其菜单栏会保持活动状态。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，你可以包含应用程序剩余的所有主进程代码。
// 你也可以将它们拆分到不同的文件中，然后在这里 require 它们。

// 确保在应用退出前，杀死 NestJS 子进程。
app.on('will-quit', () => {
  if (nestProcess) {
    showDebugDialog('应用退出', '正在停止 NestJS 应用...')
    log.info('正在停止 NestJS 应用...')
    nestProcess.kill()
    nestProcess = null
  }
})
