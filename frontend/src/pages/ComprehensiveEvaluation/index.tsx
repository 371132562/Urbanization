import { Button, Empty, Input, List, Skeleton, Tag } from 'antd'
import { EChartsOption } from 'echarts'
import { FC, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import WorldMap from '@/components/WorldMap'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useScoreStore from '@/stores/scoreStore'
import { processScoreDataForMap } from '@/utils/mapDataProcessor'

// 定义视图状态类型
type ViewState = 'countryList' | 'yearList'

const ComprehensiveEvaluation: FC = () => {
  // 从Zustand store中获取数据和方法
  const scoreListByCountry = useScoreStore(state => state.scoreListByCountry)
  const getScoreListByCountry = useScoreStore(state => state.getScoreListByCountry)
  const listLoading = useScoreStore(state => state.scoreListByCountryLoading)

  const countries = useCountryAndContinentStore(state => state.countries)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)

  const navigate = useNavigate()

  // 本地state，用于管理视图状态和选中的国家信息
  const [viewState, setViewState] = useState<ViewState>('countryList')
  const [selectedCountry, setSelectedCountry] = useState<{
    name: string
    enName: string
    years: number[]
  } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  // 添加高亮状态，用于地图高亮显示
  const [highlightedCountry, setHighlightedCountry] = useState<string>('')

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

  // 生成有数据的国家列表，后端已经过滤了只包含城镇化为"是"的国家
  const countriesWithData = useMemo(() => {
    return scoreListByCountry
      .map(country => {
        const years = country.data.map(d => d.year).sort((a, b) => b - a)
        return {
          name: country.cnName,
          enName: country.enName,
          years
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }, [scoreListByCountry])

  // 过滤后的国家列表
  const filteredCountries = useMemo(() => {
    if (!searchTerm) {
      return countriesWithData
    }
    return countriesWithData.filter(
      country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.enName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [countriesWithData, searchTerm])

  // 地图点击事件处理函数
  const handleMapClick = (params: EChartsOption) => {
    const countryEnName = (params.name as string) || ''
    const years = countryYearsMap.get(countryEnName)
    const countryCnName = nameMap[countryEnName]
    if (years && countryCnName) {
      setSelectedCountry({ name: countryCnName, enName: countryEnName, years: years })
      setHighlightedCountry(countryEnName)
      setViewState('yearList')
    }
  }

  // 国家列表项点击处理函数
  const handleCountryClick = (country: { name: string; enName: string; years: number[] }) => {
    setSelectedCountry(country)
    setHighlightedCountry(country.enName)
    setViewState('yearList')
  }

  // 返回国家列表
  const handleBackToCountryList = () => {
    setViewState('countryList')
    setSelectedCountry(null)
    setHighlightedCountry('')
  }

  // "前往添加" 按钮的点击处理函数
  const handleGoToImport = () => {
    navigate('/scoreManagement/list')
  }

  // 自定义tooltip格式化函数
  const tooltipFormatter = (params: EChartsOption): string => {
    const countryName = nameMap[params.name as string] || params.name
    if (params.value) {
      return `${countryName} (点击查看详情)`
    }
    return `${countryName}: 暂无评分数据`
  }

  // 渲染国家列表
  const renderCountryList = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Input.Search
          placeholder="搜索国家"
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
      </div>
      {filteredCountries.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-500">
                {searchTerm ? '未找到匹配的国家' : '暂无评分数据'}
              </span>
            }
          >
            {!searchTerm && (
              <Button
                type="primary"
                onClick={handleGoToImport}
              >
                前往添加评分
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <List
          dataSource={filteredCountries}
          renderItem={country => (
            <List.Item
              className="!p-0"
              onClick={() => handleCountryClick(country)}
            >
              <Tag className="w-full cursor-pointer !py-2 text-center !text-base">
                {country.name}
              </Tag>
            </List.Item>
          )}
          grid={{ gutter: 12, column: 2 }}
        />
      )}
    </div>
  )

  // 渲染年份列表
  const renderYearList = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex w-full flex-col gap-2">
          <Button
            type="text"
            onClick={handleBackToCountryList}
            className="!p-0"
          >
            ← 返回
          </Button>
          <h2 className="text-xl font-bold text-gray-800">{selectedCountry?.name}</h2>
        </div>
      </div>
      <p className="mb-4 text-sm text-gray-600">请选择年份以查看详细评分报告：</p>
      <List
        dataSource={selectedCountry?.years || []}
        renderItem={year => (
          <List.Item
            className="!p-0"
            onClick={() =>
              navigate(
                `/comprehensiveEvaluation/detail/${countryEnNameToIdMap.get(
                  selectedCountry!.enName
                )}/${year}`
              )
            }
          >
            <Tag className="w-full cursor-pointer !py-2 text-center !text-base">{year}</Tag>
          </List.Item>
        )}
        grid={{ gutter: 12, column: 3 }}
      />
    </div>
  )

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
            highlightedCountry={highlightedCountry}
          />
        )}
      </div>

      {/* 右侧信息展示容器 */}
      <div className="w-[400px] flex-shrink-0 rounded-md border border-gray-200 p-6">
        {listLoading ? (
          <Skeleton
            active
            title={false}
            paragraph={{ rows: 8 }}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            {viewState === 'countryList' ? renderCountryList() : renderYearList()}
          </div>
        )}
      </div>
    </div>
  )
}

export const Component = ComprehensiveEvaluation
