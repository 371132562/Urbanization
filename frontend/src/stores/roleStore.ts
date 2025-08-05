import { message } from 'antd'
import { create } from 'zustand'

import {
  roleAssignRoutesApi,
  roleCreateApi,
  roleDeleteApi,
  roleListApi,
  roleUpdateApi
} from '../services/apis'
import { profileApiUrl } from '../services/apis'
import request from '../services/base'
import type {
  AssignRoleRoutesDto,
  CreateRoleDto,
  DeleteRoleDto,
  RoleListItemDto,
  RoleListResDto,
  UpdateRoleDto
} from '../types'
import { useAuthStore } from './authStore'

// 角色管理store
export const useRoleStore = create<{
  roleList: RoleListItemDto[]
  loading: boolean
  fetchRoleList: () => Promise<void>
  createRole: (data: CreateRoleDto) => Promise<void>
  updateRole: (data: UpdateRoleDto) => Promise<void>
  deleteRole: (data: DeleteRoleDto) => Promise<void>
  assignRoleRoutes: (data: AssignRoleRoutesDto) => Promise<void>
}>((set, get) => ({
  roleList: [],
  loading: false,
  // 获取角色列表
  fetchRoleList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<RoleListResDto>(roleListApi)
      set({ roleList: res.data, loading: false })
    } finally {
      set({ loading: false })
    }
  },
  // 创建角色
  createRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleCreateApi, data)
      message.success('角色创建成功')
      await get().fetchRoleList()
    } finally {
      set({ loading: false })
    }
  },
  // 编辑角色
  updateRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleUpdateApi, data)
      message.success('角色更新成功')
      await get().fetchRoleList()
    } finally {
      set({ loading: false })
    }
  },
  // 删除角色
  deleteRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleDeleteApi, data)
      message.success('角色删除成功')
      await get().fetchRoleList()
    } finally {
      set({ loading: false })
    }
  },
  // 分配角色菜单权限
  assignRoleRoutes: async data => {
    set({ loading: true })
    try {
      await request.post(roleAssignRoutesApi, data)
      message.success('权限分配成功')
      await get().fetchRoleList()
    } finally {
      set({ loading: false })
    }
  }
}))

// 认证相关：角色变更后自动刷新用户信息
export async function refreshUserProfile() {
  try {
    const res = await request.post(profileApiUrl)
    useAuthStore.getState().setUser(res.data)
  } catch {
    useAuthStore.getState().logout()
  }
}
