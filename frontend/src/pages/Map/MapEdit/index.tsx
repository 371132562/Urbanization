import type { TableProps } from 'antd'
import { Button, Col, Collapse, message, Row, Select, Skeleton, Table, Tag } from 'antd'
import { FC, useEffect, useMemo, useState } from 'react'
import type { UrbanizationUpdateDto } from 'urbanization-backend/types/dto'

import WorldMap from '@/components/WorldMap'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import {
  CountryRowData,
  createUrbanizationTooltipFormatter,
  processUrbanizationData
} from '@/utils/mapDataProcessor'

const MapEdit: FC = () => {
  const urbanizationMapData = useCountryAndContinentStore(state => state.urbanizationMapData)
  const getUrbanizationMapData = useCountryAndContinentStore(state => state.getUrbanizationMapData)
  const urbanizationMapDataLoading = useCountryAndContinentStore(
    state => state.urbanizationMapDataLoading
  )
  const batchUpdateUrbanization = useCountryAndContinentStore(
    state => state.batchUpdateUrbanization
  )
  const urbanizationUpdateLoading = useCountryAndContinentStore(
    state => state.urbanizationUpdateLoading
  )

  const [editedData, setEditedData] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getUrbanizationMapData()
  }, [getUrbanizationMapData])

  useEffect(() => {
    const initialEdits: Record<string, boolean> = {}
    urbanizationMapData.forEach(item => {
      initialEdits[item.countryId] = item.urbanization
    })
    setEditedData(initialEdits)
  }, [urbanizationMapData])

  const handleUrbanizationChange = (countryId: string, value: boolean) => {
    setEditedData(prev => ({ ...prev, [countryId]: value }))
  }

  const handleSave = async () => {
    const updates: UrbanizationUpdateDto[] = Object.entries(editedData).map(
      ([countryId, urbanization]) => ({
        countryId,
        urbanization
      })
    )
    const result = await batchUpdateUrbanization(updates)
    if (result.success) {
      message.success(`成功更新 ${result.count} 个国家的状态`)
      getUrbanizationMapData()
    } else {
      message.error('更新失败，请稍后重试')
    }
  }

  const { groupedData, mapData, nameMap, valueMap, hasChanges } = useMemo(
    () => processUrbanizationData(urbanizationMapData, editedData),
    [urbanizationMapData, editedData]
  )

  const urbanizationTooltipFormatter = useMemo(
    () => createUrbanizationTooltipFormatter(nameMap, valueMap),
    [nameMap, valueMap]
  )

  const columns: TableProps<CountryRowData>['columns'] = [
    {
      title: '国家',
      dataIndex: 'cnName',
      key: 'cnName',
      width: '40%'
    },
    {
      title: '当前状态',
      dataIndex: 'urbanization',
      key: 'urbanization',
      width: '30%',
      render: (isUrbanized: boolean) => (
        <Tag color={isUrbanized ? 'green' : 'red'}>{isUrbanized ? '是' : '否'}</Tag>
      )
    },
    {
      title: '修改为',
      key: 'action',
      width: '30%',
      render: (_, record: CountryRowData) => (
        <Select
          value={record.urbanization}
          style={{ width: '100%' }}
          onChange={value => handleUrbanizationChange(record.countryId, value)}
          options={[
            { value: true, label: '是' },
            { value: false, label: '否' }
          ]}
        />
      )
    }
  ]

  return (
    <div className="w-full">
      {urbanizationMapDataLoading ? (
        <Skeleton active />
      ) : (
        <Row
          gutter={16}
          className="h-full"
        >
          <Col
            span={10}
            className="flex h-full flex-col overflow-y-auto pr-2"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" />
              <Button
                type="primary"
                onClick={handleSave}
                loading={urbanizationUpdateLoading}
                disabled={!hasChanges}
              >
                保存更改
              </Button>
            </div>
            <Collapse accordion>
              {groupedData.map(({ continent, countries }) => (
                <Collapse.Panel
                  header={`${continent} (${countries.length})`}
                  key={continent}
                >
                  <Table
                    columns={columns}
                    dataSource={countries}
                    pagination={false}
                    size="small"
                  />
                </Collapse.Panel>
              ))}
            </Collapse>
          </Col>
          {/* Right Side: World Map Preview */}
          <Col
            span={14}
            className="h-full"
          >
            <WorldMap
              data={mapData}
              nameMap={nameMap}
              valueMap={valueMap}
              tooltipFormatter={urbanizationTooltipFormatter}
            />
          </Col>
        </Row>
      )}
    </div>
  )
}

export const Component = MapEdit
