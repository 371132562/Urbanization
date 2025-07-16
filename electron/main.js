const { app, BrowserWindow } = require('electron')
const path = require('path')
const { fork } = require('child_process')

// 全局维护一个窗口对象，避免因为JS的垃圾回收机制导致窗口被自动关闭
let mainWindow
// 全局维护对 NestJS 子进程的引用，方便管理
let nestProcess

// 此函数负责启动 NestJS 服务
const startNestService = () => {
  // 定义已打包的 NestJS 应用的入口文件路径。
  // 我们假设 NestJS 的构建输出位于 'backend/dist/main.js'。
  // 使用 path.join(__dirname, ...) 可以确保无论应用被打包到哪里，路径都是正确的。
  const nestAppPath = path.join(__dirname, '..', 'backend', 'dist', 'main.js')

  console.log(`正在从以下路径启动 NestJS 应用: ${nestAppPath}...`)

  // 使用 'fork' 创建一个新的 Node.js 进程来运行 NestJS 服务。
  // 'fork' 是 'spawn' 的一个特例，专门用于衍生新的 Node.js 进程。
  // 它会自动使用 Electron 内置的 Node.js 版本，这样用户就无需单独安装 Node.js。
  nestProcess = fork(nestAppPath)

  // 监听来自 NestJS 进程的消息 (如果你的 NestJS 应用通过 process.send() 发送消息)
  nestProcess.on('message', message => {
    console.log('收到来自 NestJS 的消息:', message)
  })

  // 监听 NestJS 进程的错误事件
  nestProcess.on('error', err => {
    console.error('NestJS 子进程出错:', err)
  })

  // 监听 NestJS 进程的退出事件
  nestProcess.on('exit', code => {
    console.log(`NestJS 子进程已退出，退出码: ${code}`)
    // 在这里你可以添加一些处理逻辑, 比如尝试重启服务或直接退出 Electron 应用
  })
}

// 此函数负责创建浏览器窗口
const createWindow = () => {
  // 创建一个新的浏览器窗口实例
  mainWindow = new BrowserWindow({
    width: 1280, // 窗口宽度
    height: 800, // 窗口高度
    webPreferences: {
      // 出于安全考虑，推荐以下设置：
      nodeIntegration: false, // 禁止在渲染进程中使用 Node.js API
      contextIsolation: true // 开启上下文隔离，保护主进程和渲染进程
      // 如果你需要从主进程暴露功能给渲染进程，应该使用预加载(preload)脚本
      // preload: path.join(__dirname, 'preload.js'),
    }
  })

  // 等待一段时间，让 NestJS 服务有足够的时间启动，然后再加载页面。
  // 这是一个简单的解决方案，更稳妥的方法是不断地“ping”服务器，直到它成功响应后再加载URL。
  setTimeout(() => {
    // 加载URL。我们假设 NestJS 应用负责提供前端静态文件，并在 3000 端口上监听。
    mainWindow.loadURL('http://localhost:3000')
  }, 5000) // 5秒延迟，你可以根据实际情况调整

  // 监听窗口关闭事件
  mainWindow.on('closed', () => {
    // 取消对窗口对象的引用。如果你的应用支持多窗口，通常会把多个窗口对象存放在一个数组里，
    // 在这里就把对应的窗口对象删掉。
    mainWindow = null
  })
}

// Electron 初始化完成，可以创建浏览器窗口了。
// 某些 API 只能在该事件触发后才能使用。
app.whenReady().then(() => {
  // 启动后端服务
  startNestService()
  // 创建主窗口
  createWindow()

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
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
    console.log('正在停止 NestJS 应用...')
    nestProcess.kill() // 发送信号终止子进程
    nestProcess = null
  }
})
