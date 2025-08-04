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

const SOURCE_DIRS = ['backend', 'frontend']
const LINES_PER_FILE = 3500

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
 * 读取文件内容并返回行数
 */
function getFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
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

  // 从源目录收集所有代码文件
  for (const sourceDir of SOURCE_DIRS) {
    if (fs.existsSync(sourceDir)) {
      const files = getAllCodeFiles(sourceDir)
      allFiles.push(...files)
    }
  }

  console.log(`找到 ${allFiles.length} 个代码文件`)

  if (allFiles.length === 0) {
    console.error('没有找到任何代码文件！')
    return
  }

  // 收集所有代码行
  const allLines = []
  const fileLineMap = new Map() // 记录每行来自哪个文件

  for (const file of allFiles) {
    const lines = getFileLines(file)
    const relativePath = path.relative('.', file)

    for (let i = 0; i < lines.length; i++) {
      allLines.push(lines[i])
      fileLineMap.set(allLines.length - 1, {
        file: relativePath,
        lineNumber: i + 1,
        content: lines[i]
      })
    }
  }

  console.log(`总共收集到 ${allLines.length} 行代码`)

  if (allLines.length < LINES_PER_FILE * 2) {
    console.warn(`代码行数不足，只有 ${allLines.length} 行，需要 ${LINES_PER_FILE * 2} 行`)
  }

  return { allLines, fileLineMap }
}

/**
 * 为每个项目生成不同的代码片段
 */
function generateProjectCode(allLines, projectIndex) {
  const totalLines = allLines.length
  const linesPerProject = Math.floor(totalLines / FRONTEND_PROJECTS.length)
  const startIndex = projectIndex * linesPerProject
  const endIndex = Math.min(startIndex + LINES_PER_FILE, totalLines)

  // 生成前3500行代码
  const frontLines = allLines.slice(startIndex, startIndex + LINES_PER_FILE)
  const frontCode = frontLines.join('\n')

  // 生成后3500行代码
  const backStartIndex = Math.max(0, totalLines - LINES_PER_FILE - projectIndex * 100)
  const backLines = allLines.slice(backStartIndex, backStartIndex + LINES_PER_FILE)
  const backCode = backLines.join('\n')

  return { frontCode, backCode }
}

/**
 * 为每个项目生成代码文件
 */
function generateProjectFiles(allLines) {
  for (const project of FRONTEND_PROJECTS) {
    const projectIndex = FRONTEND_PROJECTS.indexOf(project)
    const { frontCode, backCode } = generateProjectCode(allLines, projectIndex)

    // 生成前3500行文件
    const frontFilePath = `${project}_前${LINES_PER_FILE}行代码.txt`
    fs.writeFileSync(frontFilePath, frontCode, 'utf8')
    console.log(`已生成: ${frontFilePath}`)

    // 生成后3500行文件
    const backFilePath = `${project}_后${LINES_PER_FILE}行代码.txt`
    fs.writeFileSync(backFilePath, backCode, 'utf8')
    console.log(`已生成: ${backFilePath}`)
  }
}

/**
 * 生成统计信息文件
 */
function generateStats(allLines) {
  const stats = {
    生成时间: new Date().toLocaleString(),
    总代码行数: allLines.length,
    项目数量: FRONTEND_PROJECTS.length,
    每个项目文件数: FRONTEND_PROJECTS.length * 2,
    提取行数: LINES_PER_FILE * 2
  }

  const statsPath = '统计信息.json'
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

  // 提取代码行
  const { allLines } = extractCodeLines()

  if (!allLines || allLines.length === 0) {
    console.error('没有提取到任何代码行！')
    return
  }

  // 为每个项目生成文件
  console.log('为每个项目生成代码文件...')
  generateProjectFiles(allLines)

  // 生成统计信息
  const stats = generateStats(allLines)

  console.log('\n=== 生成完成 ===')
  console.log(`总代码行数: ${stats.总代码行数}`)
  console.log(`项目数量: ${stats.项目数量}`)
  console.log(`每个项目生成文件数: ${stats.每个项目文件数}`)
}

// 运行主函数
main()

export { extractCodeLines, generateProjectCode, generateProjectFiles, generateStats }
