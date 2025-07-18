import { create } from 'zustand'
import {
  CheckExistingDataResDto,
  CountryScoreData,
  CreateScoreDto,
  DeleteScoreDto,
  ScoreDetailReqDto,
  ScoreListDto,
  YearScoreData
} from 'urbanization-backend/types/dto'

import * as apis from '@/services/apis'
import http from '@/services/base'

// 用于表单的临时状态，允许部分字段为空
type ScoreFormData = Partial<CreateScoreDto>

interface ScoreStore {
  data: ScoreListDto
  listLoading: boolean
  detailData: ScoreFormData | null
  detailLoading: boolean
  saveLoading: boolean
  getScoreList: () => Promise<void>
  getScoreDetail: (params: ScoreDetailReqDto) => Promise<void>
  createScore: (data: CreateScoreDto) => Promise<boolean>
  checkScoreExistingData: (params: ScoreDetailReqDto) => Promise<CheckExistingDataResDto>
  deleteData: (params: DeleteScoreDto) => Promise<boolean>
  filteredDataByCountry: (searchTerm: string, originalData: ScoreListDto) => ScoreListDto
  resetDetailData: () => void
  initializeNewData: () => void
}

const useScoreStore = create<ScoreStore>()(set => ({
  data: [],
  listLoading: false,
  detailData: null,
  detailLoading: false,
  saveLoading: false,

  getScoreList: async () => {
    set({ listLoading: true })
    try {
      const res = await http.post<ScoreListDto>(apis.scoreList, {})
      set({ data: res.data || [], listLoading: false })
    } catch (error) {
      set({ listLoading: false })
    }
  },

  getScoreDetail: async (params: ScoreDetailReqDto) => {
    set({ detailLoading: true })
    try {
      const res = await http.post<CreateScoreDto>(apis.scoreDetail, params)
      set({ detailData: res.data, detailLoading: false })
    } catch (error) {
      set({ detailLoading: false })
    }
  },

  checkScoreExistingData: async (params: ScoreDetailReqDto) => {
    try {
      const res = await http.post<CheckExistingDataResDto>(apis.scoreCheckExisting, params)
      return res.data
    } catch (error) {
      return { exists: false, count: 0 }
    }
  },

  createScore: async (data: CreateScoreDto) => {
    set({ saveLoading: true })
    try {
      await http.post(apis.scoreCreate, data)
      set({ saveLoading: false })
      return true
    } catch (error) {
      set({ saveLoading: false })
      return false
    }
  },

  deleteData: async (params: DeleteScoreDto) => {
    try {
      await http.post(apis.scoreDelete, params)
      return true
    } catch (error) {
      return false
    }
  },

  filteredDataByCountry: (searchTerm: string, originalData: ScoreListDto) => {
    if (!searchTerm) {
      return originalData
    }
    const lowercasedFilter = searchTerm.toLowerCase()
    const filtered = originalData
      .map((yearData: YearScoreData) => {
        const filteredCountries = yearData.data.filter(
          (country: CountryScoreData) =>
            country.cnName.toLowerCase().includes(lowercasedFilter) ||
            country.enName.toLowerCase().includes(lowercasedFilter)
        )
        return { ...yearData, data: filteredCountries }
      })
      .filter(yearData => yearData.data.length > 0)
    return filtered
  },

  resetDetailData: () => {
    set({ detailData: null })
  },

  initializeNewData: () => {
    set({
      detailData: {
        countryId: undefined,
        year: undefined,
        totalScore: undefined,
        urbanizationProcessDimensionScore: undefined,
        humanDynamicsDimensionScore: undefined,
        materialDynamicsDimensionScore: undefined,
        spatialDynamicsDimensionScore: undefined
      }
    })
  },
}))

export default useScoreStore 