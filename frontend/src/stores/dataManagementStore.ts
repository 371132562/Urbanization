import type { CountryData, DataManagementListDto, YearData } from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { dataManagementList } from '@/services/apis'
import http from '@/services/base.ts'

type DataManagementStore = {
  data: DataManagementListDto
  listLoading: boolean
  getDataManagementList: () => Promise<void>
  filteredDataByCountry: (term: string, data: DataManagementListDto) => DataManagementListDto
}

const useDataManagementStore = create<DataManagementStore>(set => ({
  data: [],
  listLoading: false,
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
