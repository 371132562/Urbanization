const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { fork, execSync, spawn } = require('child_process')
const net = require('net')
const log = require('electron-log')
// 添加HTTP服务器相关模块
const http = require('http')
const fs = require('fs')
const url = require('url')
const mime = require('mime-types')

// 设置应用名称，这会影响用户数据目录的名称
app.setName('Urbanization')

// 哨兵代码：通过检查自定义环境变量来防止fork的子进程重新执行主逻辑
// 区分不同类型的fork进程，让它们能正常运行而不是立即退出
if (process.env.IS_NEST_FORK === 'true') {
  // NestJS服务的fork进程，这个进程应该继续执行
  // 不做任何操作，让NestJS正常启动
} else if (process.env.IS_PRISMA_FORK === 'true') {
  // Prisma迁移的fork进程，这个进程应该继续执行
  // 不做任何操作，让Prisma迁移命令正常执行
} else if (process.env.IS_ELECTRON_FORK === 'true') {
  // 其他可能的Electron应用fork进程，应该立即退出
  process.exit(0)
}

// 获取用户数据目录路径，这是一个安全可写的目录
const userDataPath = app.getPath('userData')
// 定义数据库文件的完整路径
const dbPath = path.join(userDataPath, 'urbanization.db')
// 定义上传文件的根目录
const uploadPath = path.join(userDataPath, 'images')
// 定义日志文件的根目录
const logPath = path.join(userDataPath, 'logs')

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
              log.info(`检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`)
              resolve(true)
              return
            }

            log.info(`尝试杀死Windows进程 PID: ${pid}`)
            execSync(`taskkill /F /PID ${pid}`)
            log.info(`成功释放端口 ${port}`)
            resolve(true)
          } else {
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
                  log.info(`检测到端口 ${port} 被当前应用占用 (PID: ${pid})，跳过杀死进程操作`)
                  return
                }

                log.info(`尝试杀死Unix进程 PID: ${pid}`)
                try {
                  execSync(`kill -9 ${pid}`)
                } catch (killError) {
                  log.error(`杀死进程 ${pid} 失败: ${killError.message}`)
                  allKilled = false
                }
              }
            })

            if (allKilled) {
              log.info(`成功释放端口 ${port}`)
            } else {
              log.warn(`部分进程可能未被成功杀死`)
            }
            resolve(true)
          } else {
            log.error(`无法找到占用端口 ${port} 的进程`)
            resolve(false)
          }
        }
      } catch (error) {
        log.error(`释放端口 ${port} 失败:`, error.message)
        resolve(false)
      }
    })

    client.once('error', () => {
      // 端口未被占用
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
let loadingWindow
let nestProcess
let staticServer // 添加静态服务器变量

// 将 NestJS 服务的端口号定义为常量，方便修改
const nestPort = 3000
const staticPort = 5173 // 添加静态服务器端口

// 在创建窗口和启动后端服务之前，运行 Prisma 数据库迁移
function runMigrations() {
  log.info('开始进行数据库迁移...')

  // 根据环境确定 backend 目录的路径
  const backendPath = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend')

  // 与 startNestService 中逻辑一致，确保迁移时也使用正确的数据库路径
  const migrationEnv = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`
  }
  log.info(`迁移使用的数据库路径: file:${dbPath}`)

  const prismaCliPath = path.join(backendPath, 'node_modules', 'prisma', 'build', 'index.js')
  const schemaPath = path.join(backendPath, 'prisma', 'schema.prisma')
  // 在 Electron 应用中，`process.execPath` 指向 Electron 的可执行文件，
  // 它本身就是一个 Node.js 运行时，可以用来执行 node 脚本
  const nodePath = process.execPath

  log.info(`准备使用fork执行Prisma迁移`)

  try {
    // 使用fork而不是execSync来避免启动新的应用实例
    const migrationProcess = fork(prismaCliPath, ['migrate', 'deploy', `--schema=${schemaPath}`], {
      env: {
        ...migrationEnv,
        IS_PRISMA_FORK: 'true' // 标记为Prisma迁移进程
      },
      silent: true // 捕获子进程的输出
    })

    // 处理迁移进程的输出
    migrationProcess.stdout?.on('data', data => {
      log.info(`[Prisma Migration]: ${data.toString().trim()}`)
    })

    migrationProcess.stderr?.on('data', data => {
      log.error(`[Prisma Migration Error]: ${data.toString().trim()}`)
    })

    // 处理迁移进程的退出
    migrationProcess.on('exit', code => {
      if (code === 0) {
        log.info('数据库迁移成功完成。')

        // 数据库迁移成功后执行seed初始化数据
        log.info('开始执行数据库种子初始化...')

        // 使用与迁移相同的环境变量
        const seedPath = path.join(backendPath, 'prisma', 'seed.js')

        try {
          // 使用fork执行seed脚本
          const seedProcess = fork(seedPath, [], {
            env: {
              ...migrationEnv,
              IS_PRISMA_FORK: 'true' // 标记为Prisma进程
            },
            silent: true // 捕获子进程的输出
          })

          // 处理seed进程的输出
          seedProcess.stdout?.on('data', data => {
            log.info(`[Prisma Seed]: ${data.toString().trim()}`)
          })

          seedProcess.stderr?.on('data', data => {
            log.error(`[Prisma Seed Error]: ${data.toString().trim()}`)
          })

          // 处理seed进程的退出
          seedProcess.on('exit', seedCode => {
            if (seedCode === 0) {
              log.info('数据库初始化成功完成。')
            } else {
              log.error(`数据库初始化失败，退出码: ${seedCode}`)
            }
          })

          // 处理可能的错误
          seedProcess.on('error', err => {
            log.error('初始化进程启动失败:', err)
          })
        } catch (seedError) {
          log.error('执行数据库初始化失败：', seedError)
        }
      } else {
        log.error(`数据库迁移失败，退出码: ${code}`)
      }
    })

    // 处理可能的错误
    migrationProcess.on('error', err => {
      log.error('迁移进程启动失败:', err)
    })
  } catch (error) {
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
      log.info('NestJS 服务已就绪，正在创建主窗口...')
      createMainWindow()
      loadingWindow.close()
    } else {
      log.info('NestJS 服务尚未就绪，1秒后重试...')
      setTimeout(tryConnect, 1000)
    }
  })
}

// 创建主应用窗口
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // 先不显示，等准备好后再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadURL(`http://localhost:${nestPort}`)

  // 页面加载完成后最大化并显示窗口
  mainWindow.once('ready-to-show', () => {
    log.info('主窗口准备完成，最大化并显示')
    mainWindow.maximize() // 窗口最大化
    mainWindow.show() // 显示窗口
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 启动静态文件服务器
 * @param {string} directoryPath - 静态文件目录路径
 * @param {number} port - 服务器端口
 * @returns {Promise<http.Server>} HTTP服务器实例
 */
function startStaticServer(directoryPath, port) {
  log.info(`启动静态文件服务器，目录: ${directoryPath}, 端口: ${port}`)

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // 解析请求URL
      const parsedUrl = url.parse(req.url)
      let pathname = path.join(directoryPath, parsedUrl.pathname)

      // 默认加载index.html
      if (parsedUrl.pathname === '/') {
        pathname = path.join(directoryPath, 'index.html')
      }

      // 检查文件是否存在
      fs.stat(pathname, (err, stats) => {
        if (err) {
          // 如果请求的文件不存在，尝试加载index.html
          log.error(`文件不存在: ${pathname}, 错误: ${err.message}`)

          // 返回404
          res.statusCode = 404
          res.end(`File ${parsedUrl.pathname} not found!`)
          return
        }

        // 如果是目录，默认尝试加载目录下的index.html
        if (stats.isDirectory()) {
          pathname = path.join(pathname, 'index.html')
        }

        // 读取文件
        fs.readFile(pathname, (err, data) => {
          if (err) {
            res.statusCode = 500
            log.error(`读取文件失败: ${pathname}, 错误: ${err.message}`)
            res.end(`Error getting the file: ${err}.`)
            return
          }

          // 获取文件的MIME类型
          const contentType = mime.lookup(pathname) || 'application/octet-stream'

          // 返回文件内容
          res.setHeader('Content-type', contentType)
          res.end(data)
          log.info(`提供文件: ${pathname}, 类型: ${contentType}`)
        })
      })
    })

    // 监听指定端口
    server.listen(port, () => {
      log.info(`静态文件服务器运行在 http://localhost:${port}/`)
      resolve(server)
    })

    // 处理服务器错误
    server.on('error', err => {
      log.error(`启动静态文件服务器失败: ${err.message}`)
      reject(err)
    })
  })
}

// 创建加载窗口
const createLoadingWindow = () => {
  log.info('创建加载窗口...')
  loadingWindow = new BrowserWindow({
    width: 600,
    height: 600,
    frame: true,
    transparent: false, // 将透明设置为false，解决Mac上显示问题
    // backgroundColor: '#FFFFFF', // 添加背景色
    show: false, // 先不显示，等内容加载完毕再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 在开发环境下使用localhost地址，生产环境下使用内部HTTP服务器
  if (isDev) {
    // 开发模式下使用localhost地址
    log.info('开发模式：加载localhost上的加载页面...')
    loadingWindow.loadURL('http://localhost:5173') // 假设loading-frontend的开发服务器在5173端口
  } else {
    // 生产模式下启动内部HTTP服务器提供静态文件
    const loadingDistPath = path.join(process.resourcesPath, 'loading-frontend-dist')
    log.info(`生产模式：为路径 ${loadingDistPath} 启动HTTP服务器...`)

    // 检查端口并启动静态服务器
    checkAndFreePort(staticPort)
      .then(() => {
        return startStaticServer(loadingDistPath, staticPort)
      })
      .then(server => {
        staticServer = server
        // 使用HTTP服务器加载页面
        loadingWindow.loadURL(`http://localhost:${staticPort}`)
      })
      .catch(err => {
        log.error(`启动静态文件服务器失败: ${err.message}`)
        // 如果启动服务器失败，尝试直接加载文件（作为备用方案）
        const loadingPagePath = path.join(
          process.resourcesPath,
          'loading-frontend-dist',
          'index.html'
        )
        loadingWindow.loadFile(loadingPagePath)
      })
  }

  // 页面加载完成后显示窗口
  loadingWindow.once('ready-to-show', () => {
    log.info('加载页面准备完成，显示窗口')
    loadingWindow.show()
  })

  loadingWindow.on('closed', () => {
    loadingWindow = null
    // 如果静态服务器存在，关闭它
    if (staticServer) {
      log.info('关闭静态文件服务器')
      staticServer.close()
      staticServer = null
    }
  })
}

// 启动 NestJS 后台服务
const startNestService = () => {
  // 根据环境确定 NestJS 后端服务的入口文件路径
  const nestAppPath = isDev
    ? path.join(__dirname, '..', 'backend', 'dist', 'src', 'main.js')
    : path.join(process.resourcesPath, 'backend', 'dist', 'src', 'main.js')

  log.info(`正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)

  nestProcess = fork(nestAppPath, [], {
    // 将数据库、上传和日志目录的路径作为环境变量传递给 NestJS 子进程
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: `file:${dbPath}`,
      UPLOAD_DIR: uploadPath,
      LOG_PATH: logPath,
      RESOURCES_PATH: process.resourcesPath, // 添加Resources路径环境变量
      APP_PATH: app.getAppPath(), // 添加应用路径环境变量
      IS_NEST_FORK: 'true' // 设置一个明确的标识，给哨兵代码使用
    },
    silent: true // 捕获子进程的 stdout 和 stderr
  })

  // 监听 NestJS 进程的 stdout
  nestProcess.stdout.on('data', data => {
    log.info(`[NestJS]: ${data.toString().trim()}`)
  })

  // 监听 NestJS 进程的 stderr
  nestProcess.stderr.on('data', data => {
    log.error(`[NestJS Error]: ${data.toString().trim()}`)
  })

  // 监听来自 NestJS 进程的消息 (如果你的 NestJS 应用通过 process.send() 发送消息)
  nestProcess.on('message', message => {
    log.info('收到来自 NestJS 的消息:', message)
  })

  // 监听 NestJS 进程的错误事件
  nestProcess.on('error', err => log.error('NestJS 子进程出错:', err))
  nestProcess.on('exit', code => log.info(`NestJS 子进程已退出，退出码: ${code}`))
}

app.whenReady().then(async () => {
  createLoadingWindow()

  // 在启动服务前检查并释放端口
  log.info(`检查端口 ${nestPort} 是否被占用...`)
  await checkAndFreePort(nestPort)

  runMigrations() // 在启动后端服务前执行数据库迁移
  startNestService()
  tryConnect() // 开始探测 NestJS 服务

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 如果应用被激活时没有窗口，可以重新开始流程
      if (!loadingWindow && !mainWindow) {
        createLoadingWindow()
        tryConnect()
      }
    }
  })
})

// 当所有窗口都关闭时退出应用，macOS 除外。
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 显式退出，否则应用及其菜单栏会保持活动状态。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，你可以包含应用程序剩余的所有主进程代码。
// 你也可以将它们拆分到不同的文件中，然后在这里 require 它们。

// 确保在应用退出前，关闭所有资源
app.on('will-quit', () => {
  // 关闭NestJS进程
  if (nestProcess) {
    log.info('正在停止 NestJS 应用...')
    nestProcess.kill()
    nestProcess = null
  }

  // 关闭静态文件服务器
  if (staticServer) {
    log.info('正在关闭静态文件服务器...')
    staticServer.close()
    staticServer = null
  }
})
