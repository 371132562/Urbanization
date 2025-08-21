import { create } from 'zustand'

import { deleteOrphanImagesApi, listOrphanImagesApi } from '@/services/apis'
import http from '@/services/base'

// 孤立图片删除结果类型
export type DeleteOrphanImagesResult = {
  deleted: string[]
  failed: { filename: string; error: string }[]
}

// 孤立图片扫描结果类型
export type ScanOrphanImagesResult = {
  success: boolean
  count: number
  message: string
}

// 系统维护相关的状态与动作
export type SystemMaintenanceStore = {
  orphanImages: string[]
  scanning: boolean
  deleting: boolean

  scanOrphanImages: () => Promise<ScanOrphanImagesResult>
  deleteOrphanImages: (filenames: string[]) => Promise<DeleteOrphanImagesResult | null>
  clearOrphanImages: () => void
}

const useSystemMaintenanceStore = create<SystemMaintenanceStore>(set => ({
  orphanImages: [],
  scanning: false,
  deleting: false,

  // 扫描孤立图片
  scanOrphanImages: async (): Promise<ScanOrphanImagesResult> => {
    set({ scanning: true })
    try {
      const res = await http.post<{ list: string[] }>(listOrphanImagesApi)
      if (res && Array.isArray(res.data?.list)) {
        const count = res.data.list.length
        set({ orphanImages: res.data.list })
        return {
          success: true,
          count,
          message: count > 0 ? `扫描完成，发现 ${count} 张孤立图片` : '扫描完成，未发现孤立图片'
        }
      } else {
        set({ orphanImages: [] })
        return {
          success: true,
          count: 0,
          message: '扫描完成，未发现孤立图片'
        }
      }
    } catch (e) {
      console.error('扫描孤立图片失败:', e)
      set({ orphanImages: [] })
      return {
        success: false,
        count: 0,
        message: '扫描失败，请检查网络连接或稍后重试'
      }
    } finally {
      set({ scanning: false })
    }
  },

  // 删除选中的孤立图片
  deleteOrphanImages: async (filenames: string[]) => {
    if (!Array.isArray(filenames) || filenames.length === 0) return null
    set({ deleting: true })
    try {
      const res = await http.post<DeleteOrphanImagesResult>(deleteOrphanImagesApi, {
        filenames
      })
      // 删除成功后，从列表中剔除已删除项
      const deleted = res?.data?.deleted || []
      set(state => ({ orphanImages: state.orphanImages.filter(f => !deleted.includes(f)) }))
      return res?.data || { deleted: [], failed: [] }
    } catch (e) {
      console.error('删除孤立图片失败:', e)
      return null
    } finally {
      set({ deleting: false })
    }
  },

  clearOrphanImages: () => set({ orphanImages: [] })
}))

export default useSystemMaintenanceStore
