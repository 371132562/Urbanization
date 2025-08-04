/**
 * @file 本文件包含用于处理和转换地图相关数据的核心工具函数。
 * 主要功能包括：
 * 1. 将从后端获取的原始城镇化数据转换为适用于地图、表格等多种UI组件的格式。
 * 2. 提供一个工厂函数，用于创建定制化的 ECharts tooltip formatter。
 */

import type {
  CountryListResDto,
  CountryScoreData,
  CountryScoreDataItem,
  UrbanizationWorldMapDataDto
} from 'urbanization-backend/types/dto'

import type { WorldMapProps } from '@/components/WorldMap'
import { ContinentCountData, CountryRowData } from '@/types'
/**
 * @description 处理城镇化世界地图数据的函数，同时支持编辑状态
 * @param {UrbanizationWorldMapDataDto} urbanizationMapData - 从后端获取的原始城镇化数据列表。
 * @param {Record<string, boolean>} [editedData] - (可选) 在编辑页面中，用户已修改但尚未保存的数据，格式为 { countryId: newStatus }。
 * @returns {object} 一个包含所有派生数据的对象，具体如下：
 * - `groupedData`: 用于编辑页，按大洲分组并排序后的国家列表。
 * - `mapData`: 用于 `WorldMap` 组件的 `series.data`。
 * - `nameMap`: 用于 `WorldMap` 组件，国家英文名到中文名的映射。
 * - `valueMap`: 用于 `WorldMap` 组件的 `visualMap`，定义了不同数值对应的颜色和图例文字。
 * - `tableData`: 用于展示页的统计表格数据。
 * - `nonUrbanizedCount`: 未城镇化国家的总数。
 * - `hasChanges`: 一个布尔值，表示 `editedData` 与原始数据相比是否有变化。
 */
export const processUrbanizationData = (
  urbanizationMapData: UrbanizationWorldMapDataDto,
  editedData?: Record<string, boolean>
) => {
  // 初始检查：如果输入数据为空或无效，返回一个包含所有空结构的默认对象。
  if (!urbanizationMapData || urbanizationMapData.length === 0) {
    return {
      groupedData: [],
      mapData: [],
      nameMap: {},
      valueMap: {},
      tableData: [],
      nonUrbanizedCount: 0,
      hasChanges: false
    }
  }

  // --- 数据映射与常量定义 ---

  // 定义大洲到数值的映射，用于在地图上用不同颜色区分已城镇化国家。
  const continentValueMapping: Record<string, number> = {
    亚洲: 1,
    欧洲: 2,
    非洲: 3,
    北美洲: 4,
    南美洲: 5,
    大洋洲: 6,
    南极洲: 7
  }
  // 定义与上述数值映射对应的颜色。
  const continentColors: Record<number, string> = {
    1: '#d73027', // 亚洲
    2: '#4575b4', // 欧洲
    3: '#fc8d59', // 非洲
    4: '#91bfdb', // 北美洲
    5: '#fee090', // 南美洲
    6: '#99d594', // 大洋洲
    7: '#e0f3f8' // 南极洲
  }

  // --- 初始化所有需要返回的数据结构 ---
  const valueMap: WorldMapProps['valueMap'] = {
    // 0 是一个特殊值，代表"未城镇化"，具有固定的文本和颜色。
    0: { text: '未城镇化', color: '#e5e5e5' }
  }
  const nameMap: Record<string, string> = {}
  const mapData: { name: string; value: number }[] = []
  const grouped: Record<string, CountryRowData[]> = {} // 临时分组对象
  const urbanizedByContinent: Record<string, number> = {} // 大洲城镇化数量统计
  let nonUrbanizedCount = 0
  let hasChanges = false

  // --- 核心处理逻辑：遍历原始数据 ---
  urbanizationMapData.forEach(item => {
    // 确定当前国家的城镇化状态。如果是在编辑页，优先使用 `editedData` 中的状态。
    const currentStatus =
      editedData && editedData[item.countryId] !== undefined
        ? editedData[item.countryId]
        : item.urbanization

    // 如果是编辑模式，检查当前状态是否与原始状态不同，以确定是否有未保存的更改。
    if (editedData && currentStatus !== item.urbanization) {
      hasChanges = true
    }

    const continentName = item.country.continent.cnName

    // 1. 准备地图所需数据 (mapData, nameMap, valueMap)
    nameMap[item.country.enName] = item.country.cnName
    let mapValue = 0 // 默认为"未城镇化"
    if (currentStatus) {
      // 如果已城镇化，则根据其大洲获取对应的编码值。
      mapValue = continentValueMapping[continentName] || 0
      // 动态构建 valueMap，如果某个大洲的图例项还不存在，则创建它。
      if (mapValue !== 0 && !valueMap[mapValue]) {
        valueMap[mapValue] = {
          text: continentName,
          color: continentColors[mapValue]
        }
      }
    }
    mapData.push({ name: item.country.enName, value: mapValue })

    // 2. 准备统计数据 (urbanizedByContinent, nonUrbanizedCount)
    if (currentStatus) {
      urbanizedByContinent[continentName] = (urbanizedByContinent[continentName] || 0) + 1
    } else {
      nonUrbanizedCount++
    }

    // 3. 准备编辑页的分组数据 (grouped)
    if (!grouped[continentName]) {
      grouped[continentName] = []
    }
    grouped[continentName].push({
      key: item.countryId,
      countryId: item.countryId,
      cnName: item.country.cnName,
      enName: item.country.enName,
      continent: continentName,
      urbanization: currentStatus
    })
  })

  // --- 对最终数据进行排序和格式化 ---

  // 对按大洲分组的数据进行排序，首先按大洲的预定顺序，然后国家按中文名排序。
  const groupedData = Object.entries(grouped)
    .sort((a, b) => continentValueMapping[a[0]] - continentValueMapping[b[0]])
    .map(([continent, countries]) => ({
      continent,
      countries: countries.sort((a, b) => a.cnName.localeCompare(b.cnName))
    }))

  // 将统计数据转换为表格需要的数组格式，并按城镇化国家数量降序排列。
  const tableData: ContinentCountData[] = Object.entries(urbanizedByContinent)
    .map(([continent, count]) => ({
      key: continent,
      continent,
      count
    }))
    .sort((a, b) => b.count - a.count)

  return {
    groupedData,
    mapData,
    nameMap,
    valueMap,
    tableData,
    nonUrbanizedCount,
    hasChanges
  }
}

/**
 * @function createUrbanizationTooltipFormatter
 * @description (工厂函数) 创建一个用于城镇化场景的定制 tooltip formatter。
 *              该函数封装了城镇化业务的特定显示逻辑，使得业务组件无需关心 formatter 的具体实现。
 * @param {Record<string, string>} nameMap - 国家英文名到中文名的映射。
 * @param {any} valueMap - 离散值映射配置，用于获取状态文本。
 * @returns {function(params: any): string} - 一个配置好的、可直接供 ECharts 使用的 tooltip formatter 函数。
 */
export const createUrbanizationTooltipFormatter = (
  nameMap: Record<string, string>,
  valueMap: any
) => {
  return (params: any): string => {
    const { name, value } = params
    const countryName = nameMap[name] || name

    if (value === undefined || isNaN(value)) {
      return `${countryName}: 暂无数据`
    }

    if (valueMap && valueMap[value]) {
      // 值为0，代表未城镇化，显示 "国家: 未城镇化"
      if (value === 0) {
        return `${countryName}: ${valueMap[value].text}`
      }
      // 值 > 0，代表已城镇化，只显示国家名
      return countryName
    }

    // 备用逻辑，理论上在当前场景（离散值）中不会走到。
    return `${countryName}: ${value}`
  }
}

export interface ProcessedScoreMapData {
  mapData: { name: string; value: number }[]
  nameMap: Record<string, string>
  valueMap: Record<string | number, { text: string; color: string }>
  countryYearsMap: Map<string, number[]>
  countryEnNameToIdMap: Map<string, string>
}

/**
 * @description 处理按国家分组的评分数据，为综合评价地图页准备数据
 * @param {CountryScoreData[]} scoreData - 从后端获取的、按国家分组的评分数据。
 * @param {CountryListResDto} allCountries - 包含所有国家的列表，用于构建完整的nameMap。
 * @param {UrbanizationWorldMapDataDto} urbanizationData - 城镇化数据，用于判断哪些国家应该显示评分数据。
 * @returns {object} 一个包含所有派生数据的对象，具体如下：
 * - `mapData`: 用于 `WorldMap` 组件的 `series.data`。只包含有数据的国家。
 * - `nameMap`: 用于 `WorldMap` 组件，国家英文名到中文名的映射。
 * - `valueMap`: 用于 `WorldMap` 组件的 `visualMap`，定义了不同数值对应的颜色和图例文字。
 * - `countryYearsMap`: 一个映射，key为国家英文名，value为该国有评分的所有年份的数组。
 * - `countryEnNameToIdMap`: 一个映射，key为国家英文名，value为国家ID。
 */
export const processScoreDataForMap = (
  scoreData: CountryScoreData[],
  allCountries: CountryListResDto,
  urbanizationData?: UrbanizationWorldMapDataDto
): ProcessedScoreMapData => {
  const nameMap: Record<string, string> = {}
  const countryEnNameToIdMap = new Map<string, string>()
  // 首先，用所有国家的数据填充nameMap和countryEnNameToIdMap，确保全覆盖
  if (allCountries) {
    allCountries.forEach(country => {
      nameMap[country.enName] = country.cnName
      countryEnNameToIdMap.set(country.enName, country.id)
    })
  }

  if (!scoreData || scoreData.length === 0) {
    return {
      mapData: [],
      nameMap, // 返回包含所有国家名字的nameMap
      valueMap: {},
      countryYearsMap: new Map(),
      countryEnNameToIdMap
    }
  }

  const mapData: { name: string; value: number }[] = []
  const countryYearsMap = new Map<string, number[]>()

  // 创建一个城镇化状态的映射，用于快速查找
  const urbanizationMap = new Map<string, boolean>()
  if (urbanizationData && urbanizationData.length > 0) {
    urbanizationData.forEach(item => {
      urbanizationMap.set(item.country.enName, item.urbanization)
    })
  }

  // 定义一个固定的value和对应的valueMap，用于高亮显示所有有数据的国家
  const dataValue = 1
  const valueMap = {
    [dataValue]: { text: '有评分数据', color: '#74add1' }
  }

  scoreData.forEach(country => {
    // 1. 填充 nameMap (如果allCountries中没有，这里会补充)
    if (!nameMap[country.enName]) {
      nameMap[country.enName] = country.cnName
    }
    if (!countryEnNameToIdMap.has(country.enName)) {
      countryEnNameToIdMap.set(country.enName, country.countryId)
    }

    // 2. 检查该国家是否城镇化为"是"，只有城镇化为"是"的国家才显示评分数据
    const isUrbanized = urbanizationMap.get(country.enName)
    if (isUrbanized === true) {
      // 只有城镇化为"是"的国家才添加到地图数据中
      mapData.push({ name: country.enName, value: dataValue })

      // 3. 提取每个国家的所有年份
      const years = country.data
        .map((d: CountryScoreDataItem) => new Date(d.year).getFullYear())
        .sort((a: number, b: number) => b - a)
      countryYearsMap.set(country.enName, years)
    }
  })

  return { mapData, nameMap, valueMap, countryYearsMap, countryEnNameToIdMap }
}
