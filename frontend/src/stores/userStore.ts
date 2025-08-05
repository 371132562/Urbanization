import { message } from 'antd'
import { create } from 'zustand'

import {
  userCreateApi,
  userDeleteApi,
  userListApi,
  userResetPasswordApi,
  userUpdateApi
} from '../services/apis'
import request from '../services/base'
import type {
  CreateUserDto,
  DeleteUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UserListItemDto,
  UserListResDto
} from '../types'

export const useUserStore = create<{
  userList: UserListItemDto[]
  loading: boolean
  fetchUserList: () => Promise<void>
  createUser: (data: CreateUserDto) => Promise<void>
  updateUser: (data: UpdateUserDto) => Promise<void>
  deleteUser: (data: DeleteUserDto) => Promise<void>
  resetUserPassword: (data: ResetUserPasswordDto) => Promise<void>
}>((set, get) => ({
  userList: [],
  loading: false,
  // 获取用户列表
  fetchUserList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<UserListResDto>(userListApi)
      set({ userList: res.data, loading: false })
    } finally {
      set({ loading: false })
    }
  },
  // 创建用户
  createUser: async data => {
    set({ loading: true })
    try {
      await request.post(userCreateApi, data)
      message.success('用户创建成功')
      await get().fetchUserList()
    } finally {
      set({ loading: false })
    }
  },
  // 编辑用户
  updateUser: async data => {
    set({ loading: true })
    try {
      await request.post(userUpdateApi, data)
      message.success('用户更新成功')
      await get().fetchUserList()
    } finally {
      set({ loading: false })
    }
  },
  // 删除用户
  deleteUser: async data => {
    set({ loading: true })
    try {
      await request.post(userDeleteApi, data)
      message.success('用户删除成功')
      await get().fetchUserList()
    } finally {
      set({ loading: false })
    }
  },
  // 重置用户密码
  resetUserPassword: async data => {
    set({ loading: true })
    try {
      await request.post(userResetPasswordApi, data)
      message.success('密码重置成功')
      await get().fetchUserList()
    } finally {
      set({ loading: false })
    }
  }
}))
