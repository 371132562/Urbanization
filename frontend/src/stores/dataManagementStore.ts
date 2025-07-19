import type {
  CheckExistingDataResDto,
  CountryDetailReqDto,
  CountryDetailResDto,
  CountryYearQueryDto,
  CreateIndicatorValuesDto,
  DataManagementListDto,
  ExportDataReqDto,
  TopIndicatorItem
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import {
  dataManagementCheckExistingData,
  dataManagementCreate,
  dataManagementDelete,
  dataManagementDetail,
  dataManagementExport,
  dataManagementList
} from '@/services/apis'
import http from '@/services/base.ts'

type DataManagementStore = {
  data: DataManagementListDto
  listLoading: boolean
  detailData: CountryDetailResDto | null
  detailLoading: boolean
  saveLoading: boolean
  exportLoading: boolean
  getDataManagementList: () => Promise<void>
  getDataManagementDetail: (params: CountryDetailReqDto) => Promise<void>
  saveDataManagementDetail: (data: CreateIndicatorValuesDto) => Promise<boolean>
  deleteData: (params: CountryYearQueryDto) => Promise<boolean>
  checkDataManagementExistingData: (params: CountryYearQueryDto) => Promise<CheckExistingDataResDto>
  exportData: (params: ExportDataReqDto) => Promise<boolean>
  resetDetailData: () => void
  initializeNewData: (indicatorHierarchy: TopIndicatorItem[]) => void
}

const useDataManagementStore = create<DataManagementStore>(set => ({
  data: [],
  listLoading: false,
  detailData: null,
  detailLoading: false,
  saveLoading: false,
  exportLoading: false,

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

  // 导出数据
  exportData: async (params: ExportDataReqDto): Promise<boolean> => {
    set({ exportLoading: true })
    try {
      const response = await http.post(dataManagementExport, params, {
        responseType: 'blob' // 告诉axios期望接收二进制数据
      })

      // 从响应头中获取文件名
      const contentDisposition = response.headers['content-disposition']
      let fileName = '导出数据.xlsx' // 默认文件名
      if (contentDisposition) {
        // 优先匹配 filename* (RFC 5987), 处理UTF-8编码的文件名
        const fileNameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
        if (fileNameStarMatch && fileNameStarMatch[1]) {
          fileName = decodeURIComponent(fileNameStarMatch[1])
        } else {
          // 其次匹配 filename (传统方式)
          const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = decodeURIComponent(fileNameMatch[1])
          }
        }
      }

      // 创建一个blob URL并触发下载
      // response.data 本身就是一个Blob对象，不需要再次包装，否则会丢失MIME类型
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()

      // 清理
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)

      set({ exportLoading: false })
      return true
    } catch (error) {
      console.error('Failed to export data:', error)
      set({ exportLoading: false })
      return false
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
}))

export default useDataManagementStore
