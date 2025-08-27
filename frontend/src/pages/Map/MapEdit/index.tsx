import type { TableProps } from 'antd'
import { Button, Col, Collapse, Input, message, Row, Select, Skeleton, Table, Tag } from 'antd'
import { FC, useEffect, useMemo, useState } from 'react'
import type { UrbanizationUpdateDto } from 'urbanization-backend/types/dto'

import WorldMap from '@/components/WorldMap'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import { CountryRowData } from '@/types'
import {
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
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCollapseKeys, setActiveCollapseKeys] = useState<string | string[]>([])

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
      message.success(`成功更新`)
      getUrbanizationMapData()
    } else {
      message.error('更新失败，请稍后重试')
    }
  }

  const { groupedData, mapData, nameMap, valueMap, hasChanges } = useMemo(
    () => processUrbanizationData(urbanizationMapData, editedData),
    [urbanizationMapData, editedData]
  )

  const filteredGroupedData = useMemo(() => {
    if (!searchTerm) {
      return groupedData
    }

    return groupedData
      .map(group => {
        const filteredCountries = group.countries.filter(
          country =>
            country.cnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            country.enName.toLowerCase().includes(searchTerm.toLowerCase())
        )
        return { ...group, countries: filteredCountries }
      })
      .filter(group => group.countries.length > 0)
  }, [groupedData, searchTerm])

  const urbanizationTooltipFormatter = useMemo(
    () => createUrbanizationTooltipFormatter(nameMap, valueMap),
    [nameMap, valueMap]
  )

  const columns: TableProps<CountryRowData>['columns'] = [
    {
      title: '国家',
      dataIndex: 'cnName',
      key: 'cnName',
      width: '45%',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="truncate font-medium">{record.cnName}</span>
          <span className="truncate text-xs text-gray-500">{record.enName}</span>
        </div>
      )
    },
    {
      title: '当前状态',
      dataIndex: 'urbanization',
      key: 'urbanization',
      width: '25%',
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
          value={editedData[record.countryId]}
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
          <Col
            span={10}
            className="flex h-full flex-col overflow-y-auto pr-2"
          >
            <div className="mb-4 flex items-center justify-between">
              <Input.Search
                placeholder="搜索国家"
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: 240 }}
                allowClear
              />
              <Button
                type="primary"
                onClick={handleSave}
                loading={urbanizationUpdateLoading}
                disabled={!hasChanges}
              >
                保存更改
              </Button>
            </div>
            <Collapse
              accordion
              activeKey={activeCollapseKeys}
              onChange={keys => setActiveCollapseKeys(keys as string[])}
            >
              {filteredGroupedData.map(({ continent, countries }) => (
                <Collapse.Panel
                  header={`${continent} (${countries.length})`}
                  key={continent}
                >
                  <Table
                    columns={columns}
                    dataSource={countries}
                    pagination={false}
                    size="small"
                    rowKey="countryId"
                  />
                </Collapse.Panel>
              ))}
            </Collapse>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default MapEdit
