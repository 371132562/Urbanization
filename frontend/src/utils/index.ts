import dayjs from 'dayjs'

// 自定义手机号校验规则
export const validatePhoneNumber = (_: any, value: string) => {
  // 如果没有输入，则不进行校验，这里你可以根据需求调整是否允许为空
  if (!value) {
    return Promise.resolve() // 允许为空
  }

  // 中国大陆手机号的正则表达式：以1开头，第二位是3-9，后面是9位数字
  const reg = /^1[3-9]\d{9}$/
  if (reg.test(value)) {
    return Promise.resolve()
  }
  return Promise.reject(new Error('请输入有效的手机号！'))
}

// 格式化显示 年-月-日 级别的日期
export const formatDate = (date: Date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

/*
 * 将十六进制颜色值转换为带透明度的RGBA格式
 * @param hex 完整或简写的十六进制颜色值（如 #RGB 或 #RRGGBB）
 * @param alpha 透明度值（0到1之间）
 * @returns 转换后的RGBA字符串（格式：rgba(r, g, b, a)）
 *        当输入无效时返回默认颜色 rgba(22, 119, 255, 0.1)
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  // 处理简写十六进制格式（如 #RGB 转换为 #RRGGBB）
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b)

  // 匹配完整十六进制颜色值
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    // 无效颜色值返回默认蓝色
    return 'rgba(22, 119, 255, 0.1)'
  }

  // 解析RGB分量并转换为十进制数值
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)

  // 返回最终的RGBA字符串
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * @description 通用的按国家中英文名称过滤数据函数。
 * @param searchTerm - 搜索关键词。
 * @param data - 包含年份和国家数据的数组 (例如 ScoreListDto 或 DataManagementListDto)。
 * @returns 过滤后的数据数组。
 */
export const filterDataByCountry = <T extends { data: { cnName: string; enName: string }[] }>(
  searchTerm: string,
  data: T[]
): T[] => {
  const lowercasedTerm = searchTerm.trim().toLowerCase()
  if (!lowercasedTerm) {
    return data
  }
  return data
    .map(yearData => {
      const filteredCountries = yearData.data.filter(
        country =>
          country.cnName.toLowerCase().includes(lowercasedTerm) ||
          country.enName.toLowerCase().includes(lowercasedTerm)
      )
      return { ...yearData, data: filteredCountries }
    })
    .filter(yearData => yearData.data.length > 0)
}

// ---------------- 富文本图片地址转换通用方法 ----------------
// 说明：以下方法用于在富文本保存与展示时，在“文件名”与“完整URL”之间进行互转。

// 从 URL 中提取文件名
export const extractFilename = (url: string): string => {
  const lastSlashIndex = url.lastIndexOf('/')
  return lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url
}

// 根据文件名构造完整图片地址（需与富文本编辑器内的 parseImageSrc 逻辑保持一致）
export const buildFullImageUrl = (filename: string): string => {
  return (
    '//' +
    location.hostname +
    (import.meta.env.DEV ? ':3888' : location.port ? ':' + location.port : '') +
    (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
    import.meta.env.VITE_IMAGES_BASE_URL +
    filename
  )
}

// 将 HTML 内容中的 <img src> 统一为文件名（用于提交给后端存储）
export const toFilenameContent = (html: string): string => {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || ''
    if (!src) return
    img.setAttribute('src', extractFilename(src))
  })
  return doc.body.innerHTML
}

// 将 HTML 内容中的 <img src> 从文件名扩展为完整路径（用于编辑/预览/展示显示）
export const toFullPathContent = (html: string): string => {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || ''
    if (!src) return
    // 已是完整地址则跳过（http/https/双斜杠）或包含路径分隔符（相对路径）
    if (/^(https?:)?\/\//.test(src) || src.includes('/')) return
    img.setAttribute('src', buildFullImageUrl(src))
  })
  return doc.body.innerHTML
}
