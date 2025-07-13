import type {
  CheckExistingDataResDto,
  CountryData,
  CountryDetailReqDto,
  CountryDetailResDto,
  CountryYearQueryDto,
  CreateIndicatorValuesDto,
  DataManagementListDto,
  TopIndicatorItem,
  YearData
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import {
  dataManagementCheckExistingData,
  dataManagementCreate,
  dataManagementDelete,
  dataManagementDetail,
  dataManagementList
} from '@/services/apis'
import http from '@/services/base.ts'

type DataManagementStore = {
  data: DataManagementListDto
  listLoading: boolean
  detailData: CountryDetailResDto | null
  detailLoading: boolean
  saveLoading: boolean
  getDataManagementList: () => Promise<void>
  getDataManagementDetail: (params: CountryDetailReqDto) => Promise<void>
  saveDataManagementDetail: (data: CreateIndicatorValuesDto) => Promise<boolean>
  deleteData: (params: CountryYearQueryDto) => Promise<boolean>
  checkDataManagementExistingData: (params: CountryYearQueryDto) => Promise<CheckExistingDataResDto>
  resetDetailData: () => void
  initializeNewData: (indicatorHierarchy: TopIndicatorItem[]) => void
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
  saveDataManagementDetail: async (data: CreateIndicatorValuesDto): Promise<boolean> => {
    set({ saveLoading: true })
    try {
      await http.post(dataManagementCreate, data)
      set({ saveLoading: false })
      return true
    } catch (error) {
      console.error('Failed to save data:', error)
      set({ saveLoading: false })
      return false
    }
  },

  // 删除特定国家和年份的数据
  deleteData: async (params: CountryYearQueryDto): Promise<boolean> => {
    try {
      await http.post(dataManagementDelete, params)
      return true
    } catch (error) {
      console.error('Failed to delete data:', error)
      return false
    }
  },

  // 检查特定国家和年份是否已有指标数据
  checkDataManagementExistingData: async (params: CountryYearQueryDto) => {
    try {
      const response = await http.post<CheckExistingDataResDto>(
        dataManagementCheckExistingData,
        params
      )
      return response.data
    } catch (error) {
      console.error('Failed to check existing data:', error)
      throw error
    }
  },

  // 重置详情数据
  resetDetailData: () => {
    set({ detailData: null })
  },

  // 为新建模式初始化 detailData
  initializeNewData: (indicatorHierarchy: TopIndicatorItem[]) => {
    // 深拷贝并转换指标层级，为每个三级指标添加 value 属性
    const initialIndicators = indicatorHierarchy.map(top => ({
      ...top,
      secondaryIndicators: top.secondaryIndicators.map(sec => ({
        ...sec,
        detailedIndicators: sec.detailedIndicators.map(det => ({
          ...det,
          value: null // 确保所有值都初始化为null
        }))
      }))
    }))

    // 为了渲染方便，将初始化的数据存入detailData
    set({
      detailData: {
        countryId: '',
        year: new Date(), // 使用当前时间作为默认年份
        indicators: initialIndicators,
        isComplete: false
      }
    })
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
