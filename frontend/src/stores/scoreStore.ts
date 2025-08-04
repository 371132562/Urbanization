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
  ScoreListDto
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
  data: ScoreListDto
  scoreListByCountry: CountryScoreData[]
  listLoading: boolean
  detailData: ScoreDetail | ScoreFormData | null
  detailLoading: boolean
  saveLoading: boolean
  evaluations: ScoreEvaluationItemDto[]
  evaluationsLoading: boolean
  evaluationsSaveLoading: boolean
  getScoreList: () => Promise<void>
  getScoreListByCountry: () => Promise<void>
  getScoreDetail: (params: ScoreDetailReqDto) => Promise<void>
  createScore: (data: CreateScoreDto) => Promise<boolean>
  batchCreateScore: (data: BatchCreateScoreDto) => Promise<{
    totalCount: number
    successCount: number
    failCount: number
    failedCountries: string[]
  }>
  checkScoreExistingData: (params: ScoreDetailReqDto) => Promise<CheckExistingDataResDto>
  batchCheckScoreExistingData: (
    data: BatchCheckScoreExistingDto
  ) => Promise<BatchCheckScoreExistingResDto>
  deleteData: (params: DeleteScoreDto) => Promise<boolean>
  getEvaluations: () => Promise<void>
  saveEvaluations: (data: ScoreEvaluationItemDto[]) => Promise<boolean>
  resetDetailData: () => void
  initializeNewData: () => void
}

const useScoreStore = create<ScoreStore>()(set => ({
  data: [],
  scoreListByCountry: [],
  listLoading: false,
  detailData: null,
  detailLoading: false,
  saveLoading: false,
  evaluations: [],
  evaluationsLoading: false,
  evaluationsSaveLoading: false,

  getScoreList: async () => {
    set({ listLoading: true })
    try {
      const res = await http.post<ScoreListDto>(apis.scoreList, {})
      set({ data: res.data || [], listLoading: false })
    } catch (error) {
      console.log(error)
      set({ listLoading: false })
    }
  },

  getScoreListByCountry: async () => {
    set({ listLoading: true })
    try {
      const res = await http.post<CountryScoreData[]>(apis.scoreListByCountry, {})
      set({ scoreListByCountry: res.data || [], listLoading: false })
    } catch (error) {
      console.log(error)
      set({ listLoading: false, scoreListByCountry: [] })
    }
  },

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

  checkScoreExistingData: async (params: ScoreDetailReqDto) => {
    try {
      const res = await http.post<CheckExistingDataResDto>(apis.scoreCheckExisting, params)
      return res.data
    } catch (error) {
      console.log(error)
      return { exists: false, count: 0 }
    }
  },

  batchCheckScoreExistingData: async (data: BatchCheckScoreExistingDto) => {
    try {
      const res = await http.post<BatchCheckScoreExistingResDto>(apis.scoreBatchCheckExisting, data)
      return res.data
    } catch (error) {
      console.log(error)
      throw error
    }
  },

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

  deleteData: async (params: DeleteScoreDto) => {
    try {
      await http.post(apis.scoreDelete, params)
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  resetDetailData: () => {
    set({ detailData: null })
  },

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
  }
}))

export default useScoreStore
