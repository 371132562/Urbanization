const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { fork } = require('child_process')
const net = require('net')
const log = require('electron-log')

// 将日志文件配置到应用的用户数据目录中
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log')

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
    frame: false, // 无边框
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

  log.info(`数据库路径设置为: ${dbPath}`)
  log.info(`上传目录设置为: ${uploadPath}`)

  log.info(`正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)

  nestProcess = fork(nestAppPath, [], {
    // 将数据库和上传目录的路径作为环境变量传递给 NestJS 子进程
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: `file:${dbPath}`,
      UPLOAD_DIR: uploadPath
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
