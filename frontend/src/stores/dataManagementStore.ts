import type {
  CountryData,
  CountryDetailReqDto,
  CountryDetailResDto,
  DataManagementListDto,
  DetailedIndicatorItem,
  YearData
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { dataManagementDetail, dataManagementList } from '@/services/apis'
import http from '@/services/base.ts'

type DataManagementStore = {
  data: DataManagementListDto
  listLoading: boolean
  detailData: CountryDetailResDto | null
  detailLoading: boolean
  saveLoading: boolean
  getDataManagementList: () => Promise<void>
  getDataManagementDetail: (params: CountryDetailReqDto) => Promise<void>
  saveDataManagementDetail: (data: CountryDetailResDto) => Promise<void>
  resetDetailData: () => void
  filteredDataByCountry: (term: string, data: DataManagementListDto) => DataManagementListDto
}

const useDataManagementStore = create<DataManagementStore>(set => ({
  data: [],
  listLoading: false,
  detailData: null,
  detailLoading: false,
  saveLoading: false,

  // 获取数据管理列表
  getDataManagementList: async () => {
    set({ listLoading: true })
    try {
      const response = await http.post<DataManagementListDto>(dataManagementList)
      set({ data: response.data, listLoading: false })
    } catch (error) {
      console.error('Failed to fetch data:', error)
      set({ listLoading: false })
    }
  },

  // 获取特定国家和年份的详细指标数据
  getDataManagementDetail: async (params: CountryDetailReqDto) => {
    set({ detailLoading: true, detailData: null })
    try {
      const response = await http.post<CountryDetailResDto>(dataManagementDetail, params)
      set({ detailData: response.data, detailLoading: false })
    } catch (error) {
      console.error('Failed to fetch detail data:', error)
      set({ detailLoading: false })
    }
  },

  // 保存指标数据（新建或编辑）
  saveDataManagementDetail: async (data: CountryDetailResDto) => {
    set({ saveLoading: true })
    try {
      // 这里可以根据需要区分新建和编辑的接口
      await http.post('/dataManagement/save', data)
      set({ saveLoading: false })
      return Promise.resolve()
    } catch (error) {
      console.error('Failed to save data:', error)
      set({ saveLoading: false })
      return Promise.reject(error)
    }
  },

  // 重置详情数据
  resetDetailData: () => {
    set({ detailData: null })
  },

  // 按国家名称过滤数据
  filteredDataByCountry: (term: string, data: DataManagementListDto) => {
    const lowercasedTerm = term.trim().toLowerCase()
    if (!lowercasedTerm) {
      return data
    }
    return data
      .map((yearData: YearData) => {
        const filteredCountries = yearData.data.filter(
          (country: CountryData) =>
            country.cnName.toLowerCase().includes(lowercasedTerm) ||
            country.enName.toLowerCase().includes(lowercasedTerm)
        )
        return { ...yearData, data: filteredCountries }
      })
      .filter((yearData: YearData) => yearData.data.length > 0)
  }
}))

export default useDataManagementStore
