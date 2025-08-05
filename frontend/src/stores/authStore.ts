import { notification } from 'antd'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { loginApiUrl, profileApiUrl } from '../services/apis'
import http from '../services/base'
import type { LoginDto, LoginResponseDto, UserProfileDto } from '../types'

// 认证store的类型定义
export type AuthStore = {
  token: string | null // JWT token
  user: UserProfileDto | null // 当前用户信息
  loading: boolean // 加载状态
  error: string | null // 错误信息
  login: (data: LoginDto) => Promise<boolean>
  logout: () => void
  fetchProfile: () => Promise<void>
  setToken: (token: string | null) => void
  setUser: (user: UserProfileDto | null) => void
  clear: () => void
}

// 认证store实现
export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      // 登录方法
      async login(data) {
        set({ loading: true, error: null })
        try {
          const res = await http.post(loginApiUrl, data)
          set({ token: res.data.token, user: res.data.user, loading: false, error: null })
          return true
        } catch (err: any) {
          set({ loading: false, error: err?.msg || '登录失败' })
          notification.error({ message: '登录失败', description: err?.msg || '请检查账号密码' })
          return false
        }
      },
      // 登出方法
      logout() {
        set({ token: null, user: null, error: null })
        localStorage.removeItem('auth-storage')
      },
      // 获取用户信息
      async fetchProfile() {
        set({ loading: true })
        try {
          const user = await http.get(profileApiUrl)
          set({ user: user.data, loading: false })
        } catch (err: any) {
          set({ loading: false, error: err?.msg || '获取用户信息失败' })
        }
      },
      setToken(token) {
        set({ token })
      },
      setUser(user) {
        set({ user })
      },
      clear() {
        set({ token: null, user: null, error: null })
        localStorage.removeItem('auth-storage')
      }
    }),
    {
      name: 'auth-storage' // 本地存储key
    }
  )
)
