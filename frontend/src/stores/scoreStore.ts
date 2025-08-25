import {
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  BatchCreateScoreDto,
  CheckExistingDataResDto,
  Country,
  CountryScoreData,
  CreateScoreDto,
  DeleteScoreDto,
  ScoreDetailReqDto,
  ScoreEvaluationItemDto,
  ScoreListReqDto,
  ScoreListResDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import * as apis from '@/services/apis'
import http from '@/services/base'

// 用于表单的临时状态，允许部分字段为空
type ScoreFormData = Partial<CreateScoreDto>

// 定义一个更完整的详情数据类型
type ScoreDetail = CreateScoreDto & {
  country?: Country
}

interface ScoreStore {
  // ==================== 分页评分列表相关状态 ====================
  paginatedData: ScoreListResDto | null
  paginatedListLoading: boolean

  // ==================== 按国家分组评分列表相关状态 ====================
  scoreListByCountry: CountryScoreData[]
  scoreListByCountryLoading: boolean

  // ==================== 评分详情相关状态 ====================
  detailData: ScoreDetail | ScoreFormData | null
  detailLoading: boolean

  // ==================== 评分评价相关状态 ====================
  evaluations: ScoreEvaluationItemDto[]
  evaluationsLoading: boolean
  evaluationsSaveLoading: boolean

  // ==================== 通用操作状态 ====================
  saveLoading: boolean

  // ==================== 分页评分列表相关方法 ====================
  getScoreListPaginated: (params?: ScoreListReqDto) => Promise<void>

  // ==================== 按国家分组评分列表相关方法 ====================
  getScoreListByCountry: () => Promise<void>

  // ==================== 评分详情相关方法 ====================
  getScoreDetail: (params: ScoreDetailReqDto) => Promise<void>
  resetDetailData: () => void
  initializeNewData: () => void

  // ==================== 评分评价相关方法 ====================
  getEvaluations: () => Promise<void>
  saveEvaluations: (data: ScoreEvaluationItemDto[]) => Promise<boolean>

  // ==================== 评分数据操作相关方法 ====================
  createScore: (data: CreateScoreDto) => Promise<boolean>
  batchCreateScore: (data: BatchCreateScoreDto) => Promise<{
    totalCount: number
    successCount: number
    failCount: number
    failedCountries: string[]
  }>
  deleteData: (params: DeleteScoreDto) => Promise<boolean>

  // ==================== 评分数据检查相关方法 ====================
  checkScoreExistingData: (params: ScoreDetailReqDto) => Promise<CheckExistingDataResDto>
  batchCheckScoreExistingData: (
    data: BatchCheckScoreExistingDto
  ) => Promise<BatchCheckScoreExistingResDto>
}

const useScoreStore = create<ScoreStore>()(set => ({
  // ==================== 分页评分列表相关状态 ====================
  paginatedData: null,
  paginatedListLoading: false,

  // ==================== 按国家分组评分列表相关状态 ====================
  scoreListByCountry: [],
  scoreListByCountryLoading: false,

  // ==================== 评分详情相关状态 ====================
  detailData: null,
  detailLoading: false,

  // ==================== 评分评价相关状态 ====================
  evaluations: [],
  evaluationsLoading: false,
  evaluationsSaveLoading: false,

  // ==================== 通用操作状态 ====================
  saveLoading: false,

  // ==================== 分页评分列表相关方法 ====================
  /**
   * 获取分页评分列表数据
   * @param params 分页和搜索参数
   */
  getScoreListPaginated: async (params?: ScoreListReqDto) => {
    set({ paginatedListLoading: true })
    try {
      const response = await http.post<ScoreListResDto>(apis.scoreList, params || {})
      set({ paginatedData: response.data, paginatedListLoading: false })
    } catch (error) {
      console.error('获取分页评分数据失败:', error)
      set({ paginatedListLoading: false })
    }
  },

  // ==================== 按国家分组评分列表相关方法 ====================
  /**
   * 获取按国家分组的评分列表数据
   * 用于综合评价页面的地图展示
   */
  getScoreListByCountry: async () => {
    set({ scoreListByCountryLoading: true })
    try {
      const res = await http.post<CountryScoreData[]>(apis.scoreListByCountry, {})
      set({ scoreListByCountry: res.data || [], scoreListByCountryLoading: false })
    } catch (error) {
      console.log(error)
      set({ scoreListByCountryLoading: false, scoreListByCountry: [] })
    }
  },

  // ==================== 评分详情相关方法 ====================
  /**
   * 获取特定国家和年份的评分详情
   * @param params 包含countryId和year的参数
   */
  getScoreDetail: async (params: ScoreDetailReqDto) => {
    set({ detailLoading: true })
    try {
      const res = await http.post<ScoreDetail>(apis.scoreDetail, params)
      set({ detailData: res.data, detailLoading: false })
    } catch (error) {
      console.log(error)
      set({ detailLoading: false })
    }
  },

  /**
   * 重置评分详情数据
   */
  resetDetailData: () => {
    set({ detailData: null })
  },

  /**
   * 初始化新的评分数据表单
   */
  initializeNewData: () => {
    set({
      detailData: {
        countryId: undefined,
        year: undefined as number | undefined,
        totalScore: undefined,
        urbanizationProcessDimensionScore: undefined,
        humanDynamicsDimensionScore: undefined,
        materialDynamicsDimensionScore: undefined,
        spatialDynamicsDimensionScore: undefined
      }
    })
  },

  // ==================== 评分评价相关方法 ====================
  /**
   * 获取评分评价规则列表
   */
  getEvaluations: async () => {
    set({ evaluationsLoading: true })
    try {
      const res = await http.post<ScoreEvaluationItemDto[]>(apis.scoreEvaluationList, {})
      set({ evaluations: res.data || [], evaluationsLoading: false })
    } catch (error) {
      console.log(error)
      set({ evaluationsLoading: false })
    }
  },

  /**
   * 保存评分评价规则
   * @param data 评价规则数组
   * @returns 保存是否成功
   */
  saveEvaluations: async (data: ScoreEvaluationItemDto[]) => {
    set({ evaluationsSaveLoading: true })
    try {
      await http.post(apis.scoreEvaluationCreate, data)
      set({ evaluationsSaveLoading: false })
      return true
    } catch (error) {
      console.log(error)
      set({ evaluationsSaveLoading: false })
      return false
    }
  },

  // ==================== 评分数据操作相关方法 ====================
  /**
   * 创建或更新单个评分记录
   * @param data 评分数据
   * @returns 操作是否成功
   */
  createScore: async (data: CreateScoreDto) => {
    set({ saveLoading: true })
    try {
      await http.post(apis.scoreCreate, data)
      set({ saveLoading: false })
      return true
    } catch (error) {
      console.log(error)
      set({ saveLoading: false })
      return false
    }
  },

  /**
   * 批量创建或更新多个国家的评分记录
   * @param data 批量评分数据
   * @returns 批量操作结果统计
   */
  batchCreateScore: async (data: BatchCreateScoreDto) => {
    set({ saveLoading: true })
    try {
      const response = await http.post(apis.scoreBatchCreate, data)
      set({ saveLoading: false })
      return response.data
    } catch (error) {
      console.log(error)
      set({ saveLoading: false })
      throw error
    }
  },

  /**
   * 删除评分记录
   * @param params 包含要删除记录ID的参数
   * @returns 删除是否成功
   */
  deleteData: async (params: DeleteScoreDto) => {
    try {
      await http.post(apis.scoreDelete, params)
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // ==================== 评分数据检查相关方法 ====================
  /**
   * 检查特定国家和年份的评分数据是否存在
   * @param params 包含countryId和year的参数
   * @returns 检查结果
   */
  checkScoreExistingData: async (params: ScoreDetailReqDto) => {
    try {
      const res = await http.post<CheckExistingDataResDto>(apis.scoreCheckExisting, params)
      return res.data
    } catch (error) {
      console.log(error)
      return { exists: false, count: 0 }
    }
  },

  /**
   * 批量检查多个国家和年份的评分数据是否存在
   * @param data 批量检查参数
   * @returns 批量检查结果
   */
  batchCheckScoreExistingData: async (data: BatchCheckScoreExistingDto) => {
    try {
      const res = await http.post<BatchCheckScoreExistingResDto>(apis.scoreBatchCheckExisting, data)
      return res.data
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}))

export default useScoreStore
