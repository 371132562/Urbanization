const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { fork, execSync } = require('child_process')
const net = require('net')
const log = require('electron-log')

// 哨兵代码：防止 fork 的子进程重新执行主逻辑。
// 在打包后的应用中，`fork` 一个 a.js 文件，`process.argv` 会包含 `--fork a.js`。
// 当这种情况发生时，我们知道这是一个子进程，应该立即退出，以防止无限循环。
if (process.argv.some(arg => arg.startsWith('--fork'))) {
  process.exit(0)
}

// 将日志文件配置到应用的用户数据目录中
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log')

const formatArgsForDialog = args => {
  return args
    .map(arg => {
      if (arg instanceof Error) {
        return arg.stack || arg.message
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2)
        } catch (e) {
          return '[Unserializable Object]'
        }
      }
      return String(arg)
    })
    .join(' ')
}

const originalInfo = log.info
log.info = (...args) => {
  originalInfo(...args)
  dialog.showMessageBox({
    type: 'info',
    title: '信息日志',
    message: formatArgsForDialog(args)
  })
}

const originalError = log.error
log.error = (...args) => {
  originalError(...args)
  dialog.showMessageBox({
    type: 'error',
    title: '错误日志',
    message: formatArgsForDialog(args)
  })
}

// 判断当前是否为开发环境
const isDev = !app.isPackaged

// 全局变量，方便管理窗口和子进程
let mainWindow
let loadingWindow
let nestProcess

// 将 NestJS 服务的端口号定义为常量，方便修改
const nestPort = 3000

// 在创建窗口和启动后端服务之前，运行 Prisma 数据库迁移
function runMigrations() {
  log.info('开始进行数据库迁移...')

  // 根据环境确定 backend 目录的路径
  const backendPath = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend')

  // 与 startNestService 中逻辑一致，确保迁移时也使用正确的数据库路径
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'database.sqlite')
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

  const command = `"${nodePath}" "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`

  try {
    log.info(`正在执行命令: ${command}`)
    // 为迁移命令注入包含 DATABASE_URL 的环境变量
    execSync(command, {
      env: migrationEnv,
      stdio: 'pipe', // 使用 'pipe' 来捕获输出
      encoding: 'utf-8'
    })
    log.info('数据库迁移成功完成。')
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadURL(`http://localhost:${nestPort}`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建加载窗口
const createLoadingWindow = () => {
  log.info('创建加载窗口...')
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 根据环境加载 loading-frontend 的 index.html
  // 在打包后，它位于 resources/loading-frontend-dist/index.html
  const loadingPagePath = isDev
    ? path.join(__dirname, '..', 'loading-frontend', 'dist', 'index.html')
    : path.join(process.resourcesPath, 'loading-frontend-dist', 'index.html')

  loadingWindow.loadFile(loadingPagePath)

  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show()
  })

  loadingWindow.on('closed', () => {
    loadingWindow = null
  })
}

// 启动 NestJS 后台服务
const startNestService = () => {
  // 根据环境确定 NestJS 后端服务的入口文件路径
  const nestAppPath = isDev
    ? path.join(__dirname, '..', 'backend', 'dist', 'src', 'main.js')
    : path.join(process.resourcesPath, 'backend', 'dist', 'src', 'main.js')

  // 获取用户数据目录路径，这是一个安全可写的目录
  const userDataPath = app.getPath('userData')
  // 定义数据库文件的完整路径
  const dbPath = path.join(userDataPath, 'database.sqlite')
  // 定义上传文件的根目录
  const uploadPath = path.join(userDataPath, 'uploads')
  // 定义日志文件的根目录
  const logPath = app.getPath('logs')

  log.info(`数据库路径设置为: ${dbPath}`)
  log.info(`上传目录设置为: ${uploadPath}`)
  log.info(`日志目录设置为: ${logPath}`)

  log.info(`正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)

  nestProcess = fork(nestAppPath, [], {
    // 将数据库、上传和日志目录的路径作为环境变量传递给 NestJS 子进程
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: `file:${dbPath}`,
      UPLOAD_DIR: uploadPath,
      LOG_PATH: logPath
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

app.whenReady().then(() => {
  createLoadingWindow()
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

// 确保在应用退出前，杀死 NestJS 子进程。
app.on('will-quit', () => {
  if (nestProcess) {
    log.info('正在停止 NestJS 应用...')
    nestProcess.kill()
    nestProcess = null
  }
})
