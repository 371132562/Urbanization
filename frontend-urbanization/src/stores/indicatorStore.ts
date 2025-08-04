import type { IndicatorHierarchyResDto, UpdateWeightsDto } from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { indicatorHierarchy, updateIndicatorWeights } from '@/services/apis'
import http from '@/services/base.ts'

type IndicatorStore = {
  // 指标层级数据
  indicatorHierarchy: IndicatorHierarchyResDto
  // 获取数据加载状态
  loading: boolean
  // 更新权重加载状态
  updateWeightsLoading: boolean
  // 获取指标层级
  getIndicatorHierarchy: () => Promise<void>
  // 更新指标权重
  updateIndicatorWeights: (data: UpdateWeightsDto) => Promise<boolean>
  // 设置指标层级数据（用于前端编辑）
  setIndicatorHierarchy: (data: IndicatorHierarchyResDto) => void
}

const useIndicatorStore = create<IndicatorStore>(set => ({
  // 初始状态
  indicatorHierarchy: [],
  loading: false,
  updateWeightsLoading: false,

  // 获取指标层级
  getIndicatorHierarchy: async () => {
    set({ loading: true })

    try {
      const response = await http.post<IndicatorHierarchyResDto>(indicatorHierarchy)
      set({
        indicatorHierarchy: response.data
      })
    } finally {
      set({ loading: false })
    }
  },

  // 批量更新指标权重
  updateIndicatorWeights: async (data: UpdateWeightsDto) => {
    set({ updateWeightsLoading: true })
    try {
      await http.post(updateIndicatorWeights, data)
      return true
    } catch (error) {
      console.error('Failed to update indicator weights:', error)
      return false
    } finally {
      set({ updateWeightsLoading: false })
    }
  },

  // 设置指标层级数据
  setIndicatorHierarchy: (data: IndicatorHierarchyResDto) => {
    set({ indicatorHierarchy: data })
  }
}))

export default useIndicatorStore
