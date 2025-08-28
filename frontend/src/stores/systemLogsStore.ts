import { message } from 'antd'
import { create } from 'zustand'

import {
  systemLogsListFiles,
  systemLogsRead,
  systemUserLogsListFiles,
  systemUserLogsRead,
  systemUserLogsSearch
} from '@/services/apis'
import request from '@/services/base'
import {
  LogLineItem,
  ReadLogReqDto,
  SystemLogFilesResDto,
  UserLogFilesReqDto,
  UserSearchResDto
} from '@/types'

/**
 * 文件选项类型
 * 用于Select组件的选项数据格式
 */
type FileOption = {
  label: string // 显示名称
  value: string // 实际值
}

/**
 * 用户选项类型
 * 用于用户选择下拉框的选项数据格式
 */
type UserOption = {
  label: string // 用户显示名称
  value: string // 用户ID
}

/**
 * 系统日志状态管理类型定义
 * 包含所有状态和方法
 */
type SystemLogsState = {
  // ==================== 基础状态 ====================
  /** 文件列表加载状态 */
  filesLoading: boolean
  /** 用户列表加载状态 */
  usersLoading: boolean
  /** 用户文件列表加载状态 */
  userFilesLoading: boolean
  /** 日志内容加载状态 */
  contentLoading: boolean

  // ==================== 系统日志相关状态 ====================
  /** 系统日志文件列表（原始数据） */
  files: SystemLogFilesResDto['files']
  /** 系统日志文件选项（用于Select组件） */
  fileOptions: FileOption[]
  /** 系统日志读取结果 */
  readResult?: LogLineItem[]

  // ==================== 用户日志相关状态 ====================
  /** 用户日志文件列表（原始数据） */
  userFiles: SystemLogFilesResDto['files']
  /** 用户日志文件选项（用于Select组件） */
  userFileOptions: FileOption[]
  /** 用户选项列表（用于用户选择） */
  userOptions: UserOption[]
  /** 用户日志读取结果 */
  readUserResult?: LogLineItem[]

  // ==================== 防抖相关状态 ====================
  /** 上次刷新时间戳（用于防抖控制） */
  lastRefreshTime: number

  // ==================== 系统日志方法 ====================
  /** 获取系统日志文件列表 */
  listFiles: () => Promise<void>
  /** 读取系统日志内容 */
  readLog: (payload: ReadLogReqDto) => Promise<void>
  /** 构建系统日志文件选项 */
  buildFileOptions: () => void
  /** 带防抖的文件列表刷新 */
  refreshFilesWithDebounce: (force?: boolean) => Promise<void>

  // ==================== 用户日志方法 ====================
  /** 获取用户日志文件列表 */
  listUserFiles: (payload: UserLogFilesReqDto) => Promise<void>
  /** 读取用户日志内容 */
  readUserLog: (payload: ReadLogReqDto & { userId: string }) => Promise<void>
  /** 搜索用户 */
  searchUsers: () => Promise<UserSearchResDto>
  /** 构建用户日志文件选项 */
  buildUserFileOptions: () => void
  /** 带防抖的用户文件列表刷新 */
  refreshUserFilesWithDebounce: (userId: string, force?: boolean) => Promise<void>
  /** 加载初始用户列表 */
  loadInitialUsers: () => Promise<void>

  // ==================== 工具方法 ====================
  /** 重置所有状态 */
  resetState: () => void
}

/**
 * 系统日志状态管理Store
 * 统一管理系统日志和用户日志的所有状态和业务逻辑
 */
export const useSystemLogsStore = create<SystemLogsState>((set, get) => ({
  // ==================== 基础状态初始化 ====================
  filesLoading: false,
  usersLoading: false,
  userFilesLoading: false,
  contentLoading: false,
  files: [],
  fileOptions: [],
  userFiles: [],
  userFileOptions: [],
  userOptions: [],
  lastRefreshTime: 0,

  // ==================== 系统日志方法实现 ====================
  /**
   * 获取系统日志文件列表
   */
  async listFiles() {
    set({ filesLoading: true })
    try {
      const res = await request.post<SystemLogFilesResDto>(systemLogsListFiles, {})
      set({ files: res.data.files })
      // 自动构建文件选项，确保UI数据同步
      get().buildFileOptions()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取日志文件失败'
      message.error(msg)
    } finally {
      set({ filesLoading: false })
    }
  },

  /**
   * 读取系统日志内容
   * @param payload 读取参数，包含文件名、过滤条件等
   */
  async readLog(payload) {
    set({ contentLoading: true })
    try {
      const res = await request.post<LogLineItem[]>(systemLogsRead, payload)
      set({ readResult: res.data })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '读取日志失败'
      message.error(msg)
    } finally {
      set({ contentLoading: false })
    }
  },

  /**
   * 构建系统日志文件选项
   * 将文件列表转换为Select组件需要的格式
   */
  buildFileOptions() {
    const { files } = get()
    const fileOptions = files.map(f => ({ label: f.filename, value: f.filename }))
    set({ fileOptions })
  },

  /**
   * 带防抖的文件列表刷新
   * 避免频繁调用API，提升用户体验
   * @param force 是否强制刷新，忽略防抖限制
   */
  async refreshFilesWithDebounce(force = false) {
    const now = Date.now()
    const { lastRefreshTime } = get()

    // 如果不是强制刷新，且距离上次刷新时间小于5秒，则跳过
    if (!force && now - lastRefreshTime < 5000) {
      return
    }

    set({ lastRefreshTime: now })
    await get().listFiles()
  },

  // ==================== 用户日志方法实现 ====================
  /**
   * 获取用户日志文件列表
   * @param payload 请求参数，包含用户ID
   */
  async listUserFiles(payload) {
    set({ userFilesLoading: true })
    try {
      const res = await request.post<SystemLogFilesResDto>(systemUserLogsListFiles, payload)
      set({ userFiles: res.data.files })
      // 自动构建用户文件选项，确保UI数据同步
      get().buildUserFileOptions()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取用户日志文件失败'
      message.error(msg)
    } finally {
      set({ userFilesLoading: false })
    }
  },

  /**
   * 读取用户日志内容
   * @param payload 读取参数，包含用户ID、文件名、过滤条件等
   */
  async readUserLog(payload) {
    set({ contentLoading: true })
    try {
      const res = await request.post<LogLineItem[]>(systemUserLogsRead, payload)
      set({ readUserResult: res.data })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '读取用户日志失败'
      message.error(msg)
    } finally {
      set({ contentLoading: false })
    }
  },

  /**
   * 搜索用户
   * 支持模糊搜索用户名或用户ID
   * @param payload 搜索参数，包含关键词
   * @returns 搜索结果
   */
  async searchUsers(payload) {
    set({ usersLoading: true })
    try {
      const res = await request.post<UserSearchResDto>(systemUserLogsSearch, payload)
      const userOptions = res.data.list.map(i => ({ label: i.name, value: i.userId }))
      set({ userOptions })
      return res.data
    } catch {
      set({ userOptions: [] })
      return { list: [] }
    } finally {
      set({ usersLoading: false })
    }
  },

  /**
   * 构建用户日志文件选项
   * 将用户文件列表转换为Select组件需要的格式
   */
  buildUserFileOptions() {
    const { userFiles } = get()
    const userFileOptions = userFiles.map(f => ({ label: f.filename, value: f.filename }))
    set({ userFileOptions })
  },

  /**
   * 带防抖的用户文件列表刷新
   * 避免频繁调用API，提升用户体验
   * @param userId 用户ID
   * @param force 是否强制刷新，忽略防抖限制
   */
  async refreshUserFilesWithDebounce(userId: string, force = false) {
    const now = Date.now()
    const { lastRefreshTime } = get()

    // 如果不是强制刷新，且距离上次刷新时间小于5秒，则跳过
    if (!force && now - lastRefreshTime < 5000) {
      return
    }

    set({ lastRefreshTime: now })
    await get().listUserFiles({ userId })
  },

  /**
   * 加载初始用户列表
   * 组件初始化时调用，尝试加载一些示例用户
   */
  async loadInitialUsers() {
    try {
      // 尝试搜索空字符串，获取所有用户
      const res = await get().searchUsers({ q: '' })
      if (res.list.length > 0) {
        const userOptions = res.list.map(i => ({ label: i.name, value: i.userId }))
        set({ userOptions })
      }
    } catch {
      console.log('初始化用户列表失败，这是正常的，用户需要手动搜索')
    }
  },

  // ==================== 工具方法实现 ====================
  /**
   * 重置所有状态
   * 用于表单重置时清理所有相关状态
   */
  resetState() {
    set({
      fileOptions: [],
      userFileOptions: [],
      userOptions: [],
      readResult: undefined,
      readUserResult: undefined
    })
  }
}))
