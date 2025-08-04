import type {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto,
  UrbanizationUpdateDto,
  UrbanizationWorldMapDataDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { continentList, countryList, urbanizationMap, urbanizationUpdate } from '@/services/apis'
import http from '@/services/base.ts'

type CountryAndContinentStore = {
  // 大洲数据
  continents: ContinentListResDto
  // 国家数据
  countries: CountryListResDto
  // 世界地图城镇化数据
  urbanizationMapData: UrbanizationWorldMapDataDto

  // 加载状态
  continentsLoading: boolean
  countriesLoading: boolean
  urbanizationMapDataLoading: boolean
  urbanizationUpdateLoading: boolean

  // 获取大洲（可选择是否包含国家）
  getContinents: (includeCountries?: boolean) => Promise<void>
  // 获取国家（可选择是否包含大洲信息和按大洲筛选）
  getCountries: (params?: { includeContinent?: boolean; continentId?: string }) => Promise<void>
  // 获取世界地图城镇化数据
  getUrbanizationMapData: () => Promise<void>
  // 批量更新国家城镇化状态
  batchUpdateUrbanization: (
    updates: UrbanizationUpdateDto[]
  ) => Promise<{ success: boolean; count: number }>
}

const useCountryAndContinentStore = create<CountryAndContinentStore>(set => ({
  // 初始状态
  continents: [],
  countries: [],
  urbanizationMapData: [],

  // 加载状态
  continentsLoading: false,
  countriesLoading: false,
  urbanizationMapDataLoading: false,
  urbanizationUpdateLoading: false,

  // 获取大洲
  getContinents: async (includeCountries = false) => {
    set({ continentsLoading: true })

    try {
      const params: QueryContinentReqDto = { includeCountries }
      const response = await http.post<ContinentListResDto>(continentList, params)
      set({
        continents: response.data,
        continentsLoading: false
      })
    } catch (error) {
      console.error('获取大洲信息失败:', error)
    } finally {
      set({ continentsLoading: false })
    }
  },

  // 获取国家
  getCountries: async (params = {}) => {
    const { includeContinent = false, continentId } = params
    set({ countriesLoading: true })

    try {
      const requestParams: QueryCountryReqDto = { includeContinent }

      // 如果提供了大洲ID，添加到请求参数中
      if (continentId) {
        requestParams.continentId = continentId
      }

      const response = await http.post<CountryListResDto>(countryList, requestParams)
      set({
        countries: response.data,
        countriesLoading: false
      })
    } catch (error) {
      console.error('获取国家信息失败:', error)
      set({ countries: [] })
    } finally {
      set({ countriesLoading: false })
    }
  },

  // 获取世界地图城镇化数据
  getUrbanizationMapData: async () => {
    set({ urbanizationMapDataLoading: true })
    try {
      const response = await http.post<UrbanizationWorldMapDataDto>(urbanizationMap)
      set({
        urbanizationMapData: response.data,
        urbanizationMapDataLoading: false
      })
    } catch (error) {
      console.error('获取世界地图城镇化数据失败:', error)
      set({ urbanizationMapData: [], urbanizationMapDataLoading: false }) // 确保在出错时也设置loading为false
    }
  },

  // 批量更新国家城镇化状态
  batchUpdateUrbanization: async (updates: UrbanizationUpdateDto[]) => {
    set({ urbanizationUpdateLoading: true })
    try {
      const response = await http.post<{ count: number }>(urbanizationUpdate, updates)
      set({ urbanizationUpdateLoading: false })
      return { success: true, count: response.data.count }
    } catch (error) {
      console.error('批量更新城镇化状态失败:', error)
      set({ urbanizationUpdateLoading: false })
      return { success: false, count: 0 }
    }
  }
}))

export default useCountryAndContinentStore
