import type {
  DetailedIndicatorListResDto,
  QueryIndicatorReqDto,
  SecondaryIndicatorListResDto,
  TopIndicatorListResDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { indicatorDetailedList, indicatorSecondaryList, indicatorTopList } from '@/services/apis'
import http from '@/services/base.ts'

type EvaluationModelStore = {
  // 一级指标数据
  topIndicators: TopIndicatorListResDto
  // 二级指标数据
  secondaryIndicators: SecondaryIndicatorListResDto
  // 三级指标数据
  detailedIndicators: DetailedIndicatorListResDto

  // 加载状态
  topLoading: boolean
  secondaryLoading: boolean
  detailedLoading: boolean

  // 获取一级指标（可选择是否包含子指标）
  getTopIndicators: (includeChildren?: boolean) => Promise<void>
  // 获取二级指标（可选择是否包含子指标）
  getSecondaryIndicators: (includeChildren?: boolean) => Promise<void>
  // 获取三级指标
  getDetailedIndicators: () => Promise<void>
}

const useEvaluationModelStore = create<EvaluationModelStore>(set => ({
  // 初始状态
  topIndicators: [],
  secondaryIndicators: [],
  detailedIndicators: [],

  // 加载状态（拉平）
  topLoading: false,
  secondaryLoading: false,
  detailedLoading: false,

  // 获取一级指标
  getTopIndicators: async (includeChildren = false) => {
    set({ topLoading: true })

    try {
      const params: QueryIndicatorReqDto = { includeChildren }
      const response = await http.post<TopIndicatorListResDto>(indicatorTopList, params)
      set({
        topIndicators: response.data,
        topLoading: false
      })
    } catch (error) {
      console.error('获取一级指标失败:', error)
    } finally {
      set({ topLoading: false })
    }
  },

  // 获取二级指标
  getSecondaryIndicators: async (includeChildren = false) => {
    set({ secondaryLoading: true })

    try {
      const params: QueryIndicatorReqDto = { includeChildren }
      const response = await http.post<SecondaryIndicatorListResDto>(indicatorSecondaryList, params)
      set({
        secondaryIndicators: response.data,
        secondaryLoading: false
      })
    } catch (error) {
      console.error('获取二级指标失败:', error)
    } finally {
      set({ secondaryLoading: false })
    }
  },

  // 获取三级指标
  getDetailedIndicators: async () => {
    set({ detailedLoading: true })

    try {
      const response = await http.post<DetailedIndicatorListResDto>(indicatorDetailedList)
      set({
        detailedIndicators: response.data,
        detailedLoading: false
      })
    } catch (error) {
      console.error('获取三级指标失败:', error)
    } finally {
      set({ detailedLoading: false })
    }
  }
}))

export default useEvaluationModelStore
