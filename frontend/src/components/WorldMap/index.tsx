import { MapChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { EChartsOption } from 'echarts/types/dist/echarts'
import { FC, useEffect, useRef } from 'react'

import worldGeoJson from '@/assets/geo/world.json'

// 按需引入ECharts模块
echarts.use([
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
  MapChart,
  CanvasRenderer,
  UniversalTransition
])

export type WorldMapProps = {
  // 地图数据，每个对象包含 name (国家英文名) 和 value
  data: { name: string; value: number }[]
  // 国家英文名到中文名的映射
  nameMap: Record<string, string>
  // (可选) 用于离散值映射的配置，key为数据值，value为显示的文本和颜色
  valueMap?: Record<string | number, { text: string; color: string }>
  // (可选) 自定义 tooltip 格式化函数
  tooltipFormatter?: (params: any) => string
  // (可选) 地图点击事件回调
  onMapClick?: (params: any) => void
  // (可选) 要高亮的国家英文名
  highlightedCountry?: string
}

const WorldMap: FC<WorldMapProps> = ({
  data,
  nameMap,
  valueMap,
  tooltipFormatter,
  onMapClick,
  highlightedCountry
}) => {
  // 用于引用 DOM 元素的 ref
  const chartRef = useRef<HTMLDivElement>(null)
  // 保存 ECharts 实例的 ref
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (chartRef.current) {
      // 检查是否已有实例，若有则销毁，防止重复渲染
      if (chartInstance.current) {
        chartInstance.current.dispose()
      }

      // 初始化 ECharts 实例
      chartInstance.current = echarts.init(chartRef.current)

      // 注册世界地图的 GeoJSON 数据
      echarts.registerMap('world', worldGeoJson as any)

      // 默认的 tooltip 格式化函数
      const defaultTooltipFormatter = (params: any): string => {
        const { name, value } = params
        const countryName = nameMap[name] || name
        if (value === undefined || isNaN(value)) {
          return `${countryName}: 暂无数据`
        }
        // 如果有 valueMap，则使用 valueMap 中的文本
        if (valueMap && valueMap[value]) {
          return `${countryName}: ${valueMap[value].text}`
        }
        // 默认显示 "国家: 值"
        return `${countryName}: ${value}`
      }

      // 只有当有数据时才显示visualMap
      const visualMapOption =
        data && data.length > 0
          ? valueMap
            ? {
                type: 'piecewise' as const, // 分段型
                pieces: Object.entries(valueMap).map(([value, { text, color }]) => ({
                  value: Number(value),
                  label: text,
                  color: color
                })),
                left: 'left',
                top: 'bottom',
                orient: 'vertical' as const,
                backgroundColor: 'rgba(245, 245, 245, 0.75)',
                padding: 10
              }
            : {
                type: 'continuous' as const, // 连续型
                left: 'left',
                top: 'bottom',
                min: 0,
                max: 100, // 此处 max 可以根据实际数据动态设置
                inRange: {
                  color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
                },
                text: ['高', '低'],
                calculable: true,
                backgroundColor: 'rgba(245, 245, 245, 0.75)',
                padding: 10
              }
          : undefined

      const option: EChartsOption = {
        backgroundColor: '#F7F7F7',
        tooltip: {
          trigger: 'item',
          formatter: tooltipFormatter || defaultTooltipFormatter
        },
        // 地理坐标系组件
        geo: {
          map: 'world',
          roam: true, // 开启缩放和平移
          zoom: 1.5, // 初始缩放比例
          center: [70, 10], // 设置地图中心点
          // 高亮状态下的样式
          emphasis: {
            label: {
              show: false // 不显示高亮状态下的标签（国家名）
            }
          }
        },
        // 视觉映射组件，用于根据数据值展现颜色
        visualMap: visualMapOption,
        // 数据系列
        series: [
          {
            type: 'map',
            map: 'world',
            geoIndex: 0,
            data: data
          }
        ]
      }

      // 设置图表配置
      chartInstance.current.setOption(option)

      // 如果有要高亮的国家，则高亮显示
      if (highlightedCountry && chartInstance.current) {
        chartInstance.current.dispatchAction({
          type: 'highlight',
          seriesIndex: 0,
          name: highlightedCountry
        })
      }

      // 绑定点击事件
      if (onMapClick) {
        chartInstance.current.on('click', params => {
          // 在这里可以进行判断，例如只在点击了有数据的系列上才触发
          if (params.componentType === 'series') {
            onMapClick(params)
          }
        })
      }

      // 添加窗口大小变化的监听
      const handleResize = () => {
        chartInstance.current?.resize()
      }
      window.addEventListener('resize', handleResize)

      // 组件卸载时清理
      return () => {
        window.removeEventListener('resize', handleResize)
        // 解绑点击事件
        if (onMapClick && chartInstance.current) {
          chartInstance.current.off('click')
        }
        chartInstance.current?.dispose()
      }
    }
  }, [data, nameMap, valueMap, tooltipFormatter, onMapClick, highlightedCountry])

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default WorldMap
