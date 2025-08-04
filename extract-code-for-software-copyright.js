import fs from 'fs'
import path from 'path'

// 配置参数
const FRONTEND_PROJECTS = [
  'frontend',
  'frontend-comprehensive',
  'frontend-data',
  'frontend-evaluation',
  'frontend-human',
  'frontend-material',
  'frontend-score',
  'frontend-spatial',
  'frontend-urbanization'
]

const SOURCE_DIRS = [
  { name: 'backend', path: 'backend/src' },
  { name: 'frontend', path: 'frontend/src/pages' }
]
const LINES_PER_FILE = 3500
const OUTPUT_DIR = 'software-copyright-output'

// 文件扩展名过滤
const VALID_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.go',
  '.rs',
  '.swift',
  '.kt',
  '.scala',
  '.clj',
  '.hs',
  '.ml',
  '.fs',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
  '.cmd'
]

// 排除的目录和文件
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'migrations',
  'prisma/migrations',
  '__pycache__',
  '.pytest_cache',
  'target',
  'bin',
  'obj',
  '.vs',
  '.idea',
  '.vscode'
]

const EXCLUDE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '*.temp'
]

/**
 * 检查文件是否应该被排除
 */
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath)
  const ext = path.extname(filePath)

  // 检查文件扩展名
  if (!VALID_EXTENSIONS.includes(ext)) {
    return true
  }

  // 检查排除的文件
  for (const excludeFile of EXCLUDE_FILES) {
    if (excludeFile.includes('*')) {
      const pattern = excludeFile.replace('*', '')
      if (fileName.includes(pattern)) {
        return true
      }
    } else if (fileName === excludeFile) {
      return true
    }
  }

  return false
}

/**
 * 检查目录是否应该被排除
 */
function shouldExcludeDir(dirName) {
  return EXCLUDE_DIRS.includes(dirName)
}

/**
 * 递归获取所有代码文件
 */
function getAllCodeFiles(dirPath, files = []) {
  try {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        if (!shouldExcludeDir(item)) {
          getAllCodeFiles(fullPath, files)
        }
      } else if (stat.isFile()) {
        if (!shouldExcludeFile(fullPath)) {
          files.push(fullPath)
        }
      }
    }
  } catch (error) {
    console.warn(`无法读取目录 ${dirPath}:`, error.message)
  }

  return files
}

/**
 * 读取文件内容并返回行数，处理编码问题
 */
function getFileLines(filePath) {
  try {
    // 先读取为Buffer
    const buffer = fs.readFileSync(filePath)

    // 检查是否有BOM标记
    let content
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      // UTF-8 BOM
      content = buffer.toString('utf8', 3)
    } else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      // UTF-16 LE BOM
      content = buffer.toString('utf16le', 2)
    } else if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      // UTF-16 BE BOM
      content = buffer.toString('utf16be', 2)
    } else {
      // 尝试UTF-8
      content = buffer.toString('utf8')
    }

    return content.split('\n')
  } catch (error) {
    console.warn(`无法读取文件 ${filePath}:`, error.message)
    return []
  }
}

/**
 * 随机选择文件并提取代码行
 */
function extractCodeLines() {
  const allFiles = []

  // 从指定的源目录收集所有代码文件
  for (const sourceDir of SOURCE_DIRS) {
    if (fs.existsSync(sourceDir.path)) {
      console.log(`正在扫描目录: ${sourceDir.path}`)
      const files = getAllCodeFiles(sourceDir.path)
      console.log(`在 ${sourceDir.name} 中找到 ${files.length} 个代码文件`)
      allFiles.push(...files)
    } else {
      console.warn(`目录不存在: ${sourceDir.path}`)
    }
  }

  console.log(`总共找到 ${allFiles.length} 个代码文件`)

  if (allFiles.length === 0) {
    console.error('没有找到任何代码文件！')
    return
  }

  // 收集所有代码行和文件信息
  const allLines = []
  const fileInfo = [] // 记录每个文件的起始和结束位置

  for (const file of allFiles) {
    const lines = getFileLines(file)
    const relativePath = path.relative('.', file)

    if (lines.length > 0) {
      const startIndex = allLines.length
      allLines.push(...lines)
      const endIndex = allLines.length - 1

      fileInfo.push({
        file: relativePath,
        startIndex,
        endIndex,
        lineCount: lines.length
      })
    }
  }

  console.log(`总共收集到 ${allLines.length} 行代码`)

  if (allLines.length < LINES_PER_FILE * 2) {
    console.warn(`代码行数不足，只有 ${allLines.length} 行，需要 ${LINES_PER_FILE * 2} 行`)
  }

  return { allLines, fileInfo }
}

/**
 * 为每个项目生成不同的代码片段，确保以完整文件开头
 */
function generateProjectCode(allLines, fileInfo, projectIndex) {
  const totalLines = allLines.length

  // 为每个项目选择不同的起始文件
  const startFileIndex = projectIndex % fileInfo.length
  const startFile = fileInfo[startFileIndex]

  // 前3500行：从选中的文件开头开始
  const frontStartIndex = startFile.startIndex
  let frontEndIndex = Math.min(frontStartIndex + LINES_PER_FILE, totalLines)

  // 如果第一个文件不够3500行，继续添加后续文件
  if (frontEndIndex - frontStartIndex < LINES_PER_FILE) {
    let currentFileIndex = startFileIndex + 1
    while (frontEndIndex - frontStartIndex < LINES_PER_FILE && currentFileIndex < fileInfo.length) {
      const nextFile = fileInfo[currentFileIndex]
      frontEndIndex = Math.min(nextFile.endIndex + 1, frontStartIndex + LINES_PER_FILE)
      currentFileIndex++
    }
  }

  const frontLines = allLines.slice(frontStartIndex, frontEndIndex)
  const frontCode = frontLines.join('\n')

  // 后3500行：从另一个文件开头开始
  const backFileIndex = (startFileIndex + 5) % fileInfo.length // 选择不同的文件
  const backFile = fileInfo[backFileIndex]

  const backStartIndex = backFile.startIndex
  let backEndIndex = Math.min(backStartIndex + LINES_PER_FILE, totalLines)

  // 如果第一个文件不够3500行，继续添加后续文件
  if (backEndIndex - backStartIndex < LINES_PER_FILE) {
    let currentFileIndex = backFileIndex + 1
    while (backEndIndex - backStartIndex < LINES_PER_FILE && currentFileIndex < fileInfo.length) {
      const nextFile = fileInfo[currentFileIndex]
      backEndIndex = Math.min(nextFile.endIndex + 1, backStartIndex + LINES_PER_FILE)
      currentFileIndex++
    }
  }

  const backLines = allLines.slice(backStartIndex, backEndIndex)
  const backCode = backLines.join('\n')

  return { frontCode, backCode }
}

/**
 * 为每个项目生成代码文件
 */
function generateProjectFiles(allLines, fileInfo) {
  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const project of FRONTEND_PROJECTS) {
    const projectIndex = FRONTEND_PROJECTS.indexOf(project)
    const { frontCode, backCode } = generateProjectCode(allLines, fileInfo, projectIndex)

    // 生成前3500行文件
    const frontFilePath = path.join(OUTPUT_DIR, `${project}_前${LINES_PER_FILE}行代码.txt`)
    fs.writeFileSync(frontFilePath, frontCode, 'utf8')
    console.log(`已生成: ${frontFilePath}`)

    // 生成后3500行文件
    const backFilePath = path.join(OUTPUT_DIR, `${project}_后${LINES_PER_FILE}行代码.txt`)
    fs.writeFileSync(backFilePath, backCode, 'utf8')
    console.log(`已生成: ${backFilePath}`)
  }
}

/**
 * 生成统计信息文件
 */
function generateStats(allLines, fileInfo) {
  const stats = {
    生成时间: new Date().toLocaleString(),
    总代码行数: allLines.length,
    文件数量: fileInfo.length,
    项目数量: FRONTEND_PROJECTS.length,
    每个项目文件数: FRONTEND_PROJECTS.length * 2,
    提取行数: LINES_PER_FILE * 2,
    扫描目录: SOURCE_DIRS.map(dir => dir.path)
  }

  const statsPath = path.join(OUTPUT_DIR, '统计信息.json')
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8')
  console.log(`已生成统计信息: ${statsPath}`)

  return stats
}

/**
 * 主函数
 */
function main() {
  console.log('开始为软著申请提取代码...')
  console.log(`将为 ${FRONTEND_PROJECTS.length} 个项目生成代码文件`)
  console.log(`扫描目录: ${SOURCE_DIRS.map(dir => dir.path).join(', ')}`)

  // 提取代码行
  const { allLines, fileInfo } = extractCodeLines()

  if (!allLines || allLines.length === 0) {
    console.error('没有提取到任何代码行！')
    return
  }

  // 为每个项目生成文件
  console.log('为每个项目生成代码文件...')
  generateProjectFiles(allLines, fileInfo)

  // 生成统计信息
  const stats = generateStats(allLines, fileInfo)

  console.log('\n=== 生成完成 ===')
  console.log(`总代码行数: ${stats.总代码行数}`)
  console.log(`文件数量: ${stats.文件数量}`)
  console.log(`项目数量: ${stats.项目数量}`)
  console.log(`每个项目生成文件数: ${stats.每个项目文件数}`)
  console.log(`输出目录: ${OUTPUT_DIR}`)
}

// 运行主函数
main()

export { extractCodeLines, generateProjectCode, generateProjectFiles, generateStats }
