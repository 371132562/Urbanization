import { app, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

// 在ES模块中获取__dirname的等效值
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 设置应用名称
app.setName('Urbanization')

// 全局变量
let mainWindow
let staticServer

// 判断当前是否为开发环境
const isDev = !app.isPackaged

// 静态文件服务器端口
const STATIC_PORT = 3001

// 启动静态文件服务器
const startStaticServer = () => {
  return new Promise((resolve, reject) => {
    staticServer = createServer(async (req, res) => {
      try {
        const filePath = req.url === '/' ? '/index.html' : req.url
        const fullPath = path.join(__dirname, 'dist', filePath)

        console.log(`请求文件: ${req.url} -> ${fullPath}`)

        if (!existsSync(fullPath)) {
          console.log(`文件不存在: ${fullPath}`)
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('File not found')
          return
        }

        const content = await readFile(fullPath)
        const ext = path.extname(fullPath)

        // 设置正确的MIME类型
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        }

        const contentType = mimeTypes[ext] || 'application/octet-stream'

        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        })

        console.log(`返回文件: ${req.url} (${contentType})`)
        res.end(content)
      } catch (error) {
        console.error(`服务器错误: ${error.message}`)
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal server error')
      }
    })

    staticServer.listen(STATIC_PORT, () => {
      console.log(`静态文件服务器启动在端口 ${STATIC_PORT}`)
      resolve()
    })

    staticServer.on('error', serverError => {
      console.error('静态文件服务器启动失败:', serverError)
      reject(serverError)
    })
  })
}

// 创建主应用窗口
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 允许加载本地资源
      allowRunningInsecureContent: true
    }
  })

  // 加载静态文件服务器提供的页面
  mainWindow.loadURL(`http://localhost:${STATIC_PORT}`)

  // 开发环境下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    // 先启动静态文件服务器
    await startStaticServer()
    // 然后创建主窗口
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  } catch (error) {
    console.error('应用启动失败:', error)
    app.quit()
  }
})

// 当所有窗口都关闭时退出应用，macOS 除外
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时关闭静态文件服务器
app.on('will-quit', () => {
  if (staticServer) {
    staticServer.close()
    console.log('静态文件服务器已关闭')
  }
})
