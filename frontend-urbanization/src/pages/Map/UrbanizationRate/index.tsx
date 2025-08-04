import { Skeleton, Table } from 'antd'
import { FC, useEffect, useMemo } from 'react'

import WorldMap from '@/components/WorldMap'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import {
  createUrbanizationTooltipFormatter,
  processUrbanizationData
} from '@/utils/mapDataProcessor'

const { Summary } = Table

const UrbanizationRate: FC = () => {
  const urbanizationMapData = useCountryAndContinentStore(state => state.urbanizationMapData)
  const getUrbanizationMapData = useCountryAndContinentStore(state => state.getUrbanizationMapData)
  const urbanizationMapDataLoading = useCountryAndContinentStore(
    state => state.urbanizationMapDataLoading
  )

  useEffect(() => {
    getUrbanizationMapData()
  }, [getUrbanizationMapData])

  const { nameMap, mapData, valueMap, tableData, nonUrbanizedCount } = useMemo(
    () => processUrbanizationData(urbanizationMapData),
    [urbanizationMapData]
  )

  const urbanizationTooltipFormatter = useMemo(
    () => createUrbanizationTooltipFormatter(nameMap, valueMap),
    [nameMap, valueMap]
  )

  const tableColumns = [
    {
      title: <span className="font-semibold">大洲</span>,
      dataIndex: 'continent',
      key: 'continent'
    },
    {
      title: <span className="font-semibold">已计入研究范围的国家数量</span>,
      dataIndex: 'count',
      key: 'count'
    }
  ]

  return (
    <div className="flex h-full w-full flex-row gap-4">
      <div className="flex-grow">
        {urbanizationMapDataLoading ? (
          <Skeleton
            active
            paragraph={{ rows: 15 }}
          />
        ) : (
          <WorldMap
            data={mapData}
            nameMap={nameMap}
            valueMap={valueMap}
            tooltipFormatter={urbanizationTooltipFormatter}
          />
        )}
      </div>
      <div className="w-[400px] flex-shrink-0">
        {urbanizationMapDataLoading ? (
          <Skeleton
            active
            title={false}
            paragraph={{ rows: 8 }}
          />
        ) : (
          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            bordered
            size="small"
            summary={() => (
              <>
                <Summary.Row className="bg-slate-50 font-semibold">
                  <Summary.Cell index={0}>未计入研究范围的国家总数</Summary.Cell>
                  <Summary.Cell index={1}>{nonUrbanizedCount}</Summary.Cell>
                </Summary.Row>
                <Summary.Row className="bg-slate-50 font-semibold">
                  <Summary.Cell index={0}>未计入研究范围的国家总数</Summary.Cell>
                  <Summary.Cell index={1}>{nonUrbanizedCount}</Summary.Cell>
                </Summary.Row>
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}

export const Component = UrbanizationRate
