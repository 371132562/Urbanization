import type {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { continentList, countryList } from '@/services/apis'
import http from '@/services/base.ts'

type CountryAndContinentStore = {
  // 大洲数据
  continents: ContinentListResDto
  // 国家数据
  countries: CountryListResDto

  // 加载状态
  continentsLoading: boolean
  countriesLoading: boolean

  // 获取大洲（可选择是否包含国家）
  getContinents: (includeCountries?: boolean) => Promise<void>
  // 获取国家（可选择是否包含大洲信息和按大洲筛选）
  getCountries: (params?: { includeContinent?: boolean; continentId?: string }) => Promise<void>
}

const useCountryAndContinentStore = create<CountryAndContinentStore>(set => ({
  // 初始状态
  continents: [],
  countries: [],

  // 加载状态
  continentsLoading: false,
  countriesLoading: false,

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
    } finally {
      set({ countriesLoading: false })
    }
  }
}))

export default useCountryAndContinentStore
