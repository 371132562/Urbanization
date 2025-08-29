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

// 将 HTML 内容中的 <img src> 统一为文件名
// 用于提交给后端存储，富文本编辑器内完整路径时才能正常显示，但入库时只需要文件名，所以删除路径后保存
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

// 将 HTML 内容中的 <img src> 从文件名扩展为完整路径（用于从库中读取时将文件名根据当前环境转换为完整路径）
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

/**
 * 刷新当前活跃年份的数据
 * 用于评分管理、数据管理、评价详情等列表页面的数据刷新
 */
export const refreshActiveYearData = async ({
  activeCollapseKey,
  years,
  yearQueryMap,
  searchTerm,
  getListByYear,
  yearSortMap
}: {
  activeCollapseKey: string | string[]
  years: number[]
  yearQueryMap: Record<number, { page: number; pageSize: number }>
  searchTerm: string
  getListByYear: (params: any) => Promise<void>
  yearSortMap?: Record<number, { field: string | null; order: 'asc' | 'desc' | null }>
}) => {
  const k = Array.isArray(activeCollapseKey) ? activeCollapseKey[0] : activeCollapseKey
  const activeYear = Number(k || (years && years.length > 0 ? years[0] : ''))
  if (activeYear) {
    const q = yearQueryMap[activeYear] || { page: 1, pageSize: 10 }
    const sort = yearSortMap?.[activeYear]
    await getListByYear({
      year: activeYear,
      page: q.page,
      pageSize: q.pageSize,
      ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
      ...(searchTerm ? { searchTerm } : {})
    })
  }
}

/**
 * 刷新指定年份的数据
 * 用于年份切换时的数据加载
 */
export const refreshYearData = async ({
  year,
  yearQueryMap,
  searchTerm,
  getListByYear,
  yearSortMap
}: {
  year: number
  yearQueryMap: Record<number, { page: number; pageSize: number }>
  searchTerm: string
  getListByYear: (params: any) => Promise<void>
  yearSortMap?: Record<number, { field: string | null; order: 'asc' | 'desc' | null }>
}) => {
  const q = yearQueryMap[year] || { page: 1, pageSize: 10 }
  const sort = yearSortMap?.[year]
  await getListByYear({
    year,
    page: q.page,
    pageSize: q.pageSize,
    ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
    ...(searchTerm ? { searchTerm } : {})
  })
}
