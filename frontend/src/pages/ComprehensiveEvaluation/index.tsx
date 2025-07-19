import { Empty, List, Skeleton, Tag } from 'antd'
import { EChartsOption } from 'echarts'
import { FC, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import WorldMap from '@/components/WorldMap'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useScoreStore from '@/stores/scoreStore'
import { processScoreDataForMap } from '@/utils/mapDataProcessor'

const ComprehensiveEvaluation: FC = () => {
  // 从Zustand store中获取数据和方法
  const { scoreListByCountry, getScoreListByCountry, listLoading } = useScoreStore()
  const { countries, getCountries } = useCountryAndContinentStore()
  const navigate = useNavigate()

  // 本地state，用于存储当前选中的国家信息
  const [selectedCountry, setSelectedCountry] = useState<{
    name: string
    enName: string
    years: number[]
  } | null>(null)

  // 组件加载时，异步获取按国家分组的评分数据和所有国家列表
  useEffect(() => {
    getScoreListByCountry()
    getCountries()
  }, [getScoreListByCountry, getCountries])

  // 使用useMemo对处理后的数据进行缓存，只有在原始数据变化时才重新计算
  const { mapData, nameMap, valueMap, countryYearsMap, countryEnNameToIdMap } = useMemo(
    () => processScoreDataForMap(scoreListByCountry, countries),
    [scoreListByCountry, countries]
  )

  // 地图点击事件处理函数
  const handleMapClick = (params: EChartsOption) => {
    const countryEnName = (params.name as string) || ''
    const years = countryYearsMap.get(countryEnName)
    // 根据英文名从 nameMap 获取中文名
    const countryCnName = nameMap[countryEnName]
    if (years && countryCnName) {
      setSelectedCountry({ name: countryCnName, enName: countryEnName, years: years })
    }
  }

  // 自定义tooltip格式化函数
  const tooltipFormatter = (params: EChartsOption): string => {
    const countryName = nameMap[params.name as string] || params.name
    if (params.value) {
      return `${countryName} (点击查看详情)`
    }
    return `${countryName}: 暂无评分数据`
  }

  return (
    <div className="flex h-full w-full flex-row gap-4">
      {/* 左侧地图容器 */}
      <div className="flex-grow">
        {listLoading ? (
          <Skeleton
            active
            paragraph={{ rows: 15 }}
          />
        ) : (
          <WorldMap
            data={mapData}
            nameMap={nameMap}
            valueMap={valueMap}
            tooltipFormatter={tooltipFormatter}
            onMapClick={handleMapClick}
          />
        )}
      </div>

      {/* 右侧信息展示容器 */}
      <div className="w-[400px] flex-shrink-0 rounded-md border p-6 border-gray-200">
        {listLoading ? (
          <Skeleton
            active
            title={false}
            paragraph={{ rows: 8 }}
          />
        ) : selectedCountry ? (
          <div>
            <h2 className="mb-4 border-b pb-2 text-xl font-bold text-gray-800">
              {selectedCountry.name}
            </h2>
            <p className="mb-4 text-sm text-gray-600">请选择年份以查看详细评分报告：</p>
            <List
              dataSource={selectedCountry.years}
              renderItem={year => (
                <List.Item
                  className="!p-0"
                  onClick={() =>
                    navigate(
                      `/comprehensiveEvaluation/detail/${countryEnNameToIdMap.get(
                        selectedCountry.enName
                      )}/${year}`
                    )
                  }
                >
                  <Tag className="w-full cursor-pointer text-center !py-2 !text-base">
                    {year}
                  </Tag>
                </List.Item>
              )}
              grid={{ gutter: 12, column: 3 }}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-gray-500">
                  请在左侧地图中选择一个国家
                  <br />
                  以查看其历年评分情况
                </span>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const Component = ComprehensiveEvaluation
