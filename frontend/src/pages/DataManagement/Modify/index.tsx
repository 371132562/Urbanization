import {
  Button,
  Collapse,
  CollapseProps,
  DatePicker,
  Form,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type {
  CountryDetailResDto,
  CountryWithContinentDto,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem
} from 'urbanization-backend/types/dto'

import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useDataManagementStore from '@/stores/dataManagementStore'

const { Text } = Typography
const { Option, OptGroup } = Select

export const Component = () => {
  const { countryId, year } = useParams<{ countryId?: string; year?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [selectedYear, setSelectedYear] = useState<dayjs.Dayjs | null>(year ? dayjs(year) : null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(countryId || null)
  const isEdit = !!countryId && !!year

  const {
    detailData,
    detailLoading,
    saveLoading,
    getDataManagementDetail,
    saveDataManagementDetail,
    resetDetailData
  } = useDataManagementStore()

  const {
    continents,
    countries,
    continentsLoading,
    countriesLoading,
    getContinents,
    getCountries
  } = useCountryAndContinentStore()

  // 加载大洲和国家数据
  useEffect(() => {
    getContinents(true) // 获取大洲数据，并包含国家
    getCountries({ includeContinent: true }) // 获取所有国家数据，包含大洲信息
  }, [getContinents, getCountries])

  // 组件加载或参数变化时获取详情数据
  useEffect(() => {
    if (isEdit) {
      console.log(dayjs(parseInt(year as string), 'YYYY'))
      getDataManagementDetail({
        countryId,
        year: dayjs(year, 'YYYY').startOf('year').toDate()
      })
    } else {
      resetDetailData()
    }

    return () => {
      resetDetailData()
    }
  }, [countryId, year, isEdit, getDataManagementDetail, resetDetailData])

  // 详情数据加载后，设置表单值
  useEffect(() => {
    if (detailData) {
      // 设置表单初始值
      const initialValues: Record<string, number | null> = {}

      // 遍历三级层次结构，设置所有三级指标的值
      detailData.indicators.forEach((topIndicator: TopIndicatorItem) => {
        topIndicator.secondaryIndicators.forEach((secondaryIndicator: SecondaryIndicatorItem) => {
          secondaryIndicator.detailedIndicators.forEach(
            (detailedIndicator: DetailedIndicatorItem) => {
              initialValues[`indicator_${detailedIndicator.id}`] = detailedIndicator.value
            }
          )
        })
      })

      form.setFieldsValue(initialValues)
    }
  }, [detailData, form])

  // 按大洲组织国家列表
  const countryOptions = useMemo(() => {
    // 创建一个Map，将国家按大洲ID分组
    const countriesByContinent = new Map<string, CountryWithContinentDto[]>()

    countries.forEach(country => {
      if (country.continentId) {
        if (!countriesByContinent.has(country.continentId)) {
          countriesByContinent.set(country.continentId, [])
        }
        countriesByContinent.get(country.continentId)!.push(country)
      }
    })

    // 返回按大洲分组的国家选项
    return continents.map(continent => (
      <OptGroup
        key={continent.id}
        label={continent.cnName}
      >
        {(countriesByContinent.get(continent.id) || []).map(country => (
          <Option
            key={country.id}
            value={country.id}
            label={country.cnName}
          >
            <div className="flex items-center">
              <span>{country.cnName}</span>
              <span className="ml-2 text-xs text-gray-400">({country.enName})</span>
            </div>
          </Option>
        ))}
      </OptGroup>
    ))
  }, [continents, countries])

  // 处理国家变化
  const handleCountryChange = (value: string) => {
    setSelectedCountry(value)
  }

  // 保存数据
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      if (!isEdit && (!selectedCountry || !selectedYear)) {
        message.error(!selectedCountry ? '请选择国家' : '请选择年份')
        return
      }

      // 构建保存的数据
      const saveData: CountryDetailResDto = {
        countryId: isEdit ? detailData!.countryId : selectedCountry!,
        cnName: isEdit ? detailData!.cnName : '',
        enName: isEdit ? detailData!.enName : '',
        year: isEdit ? detailData!.year : selectedYear!.startOf('year').toDate(),
        isComplete: true, // 由后端计算
        indicators: isEdit
          ? detailData!.indicators.map(topIndicator => ({
              ...topIndicator,
              secondaryIndicators: topIndicator.secondaryIndicators.map(secondaryIndicator => ({
                ...secondaryIndicator,
                detailedIndicators: secondaryIndicator.detailedIndicators.map(
                  detailedIndicator => ({
                    ...detailedIndicator,
                    value: values[`indicator_${detailedIndicator.id}`]
                  })
                )
              }))
            }))
          : [] // 新建模式下没有indicators数据
      }

      await saveDataManagementDetail(saveData)
      message.success('保存成功')
      navigate('/dataManagement')
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败，请重试')
    }
  }

  // 渲染表单项
  const renderFormItems = () => {
    if (isEdit && !detailData?.indicators?.length) {
      return (
        <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50">
          <Text type="secondary">暂无指标数据</Text>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {detailData.indicators.map((topIndicator: TopIndicatorItem) => (
          <div
            key={topIndicator.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
          >
            <div className="bg-gray-800 px-6 py-3">
              <h3 className="text-lg font-semibold text-white">{topIndicator.cnName}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {topIndicator.secondaryIndicators.map(
                (secondaryIndicator: SecondaryIndicatorItem) => {
                  // 为每个二级指标创建一个collapse items
                  const collapseItems: CollapseProps['items'] = [
                    {
                      key: secondaryIndicator.id,
                      label: (
                        <h4 className="text-base font-medium text-gray-700">
                          {secondaryIndicator.cnName}
                        </h4>
                      ),
                      children: (
                        <div className="grid grid-cols-1 gap-4 px-2 md:grid-cols-2 xl:grid-cols-3">
                          {secondaryIndicator.detailedIndicators.map(
                            (detailedIndicator: DetailedIndicatorItem) => (
                              <div
                                key={detailedIndicator.id}
                                className="rounded-md bg-white p-3"
                              >
                                <Form.Item
                                  label={
                                    <div className="flex h-12 flex-col justify-between">
                                      <div className="font-medium text-gray-700">
                                        {detailedIndicator.cnName}
                                      </div>
                                      <div className="h-5">
                                        {detailedIndicator.unit && (
                                          <span className="text-xs text-gray-500">
                                            单位: {detailedIndicator.unit}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  }
                                  name={`indicator_${detailedIndicator.id}`}
                                  rules={[{ required: false, message: '请输入指标值' }]}
                                  className="mb-0"
                                  labelCol={{ span: 24 }}
                                  wrapperCol={{ span: 24 }}
                                >
                                  <InputNumber
                                    placeholder="请输入指标值"
                                    style={{ width: '100%' }}
                                    precision={2}
                                    className="mt-1"
                                  />
                                </Form.Item>
                              </div>
                            )
                          )}
                        </div>
                      ),
                      className: 'border-0'
                    }
                  ]

                  return (
                    <div
                      key={secondaryIndicator.id}
                      className="border-t border-gray-200"
                    >
                      <Collapse
                        defaultActiveKey={[secondaryIndicator.id]}
                        bordered={false}
                        className="bg-white"
                        items={collapseItems}
                      />
                    </div>
                  )
                }
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between rounded-lg bg-gray-800 p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="mb-1 text-2xl text-gray-100">{isEdit ? '编辑' : '录入'}数据</div>
        {detailData && (
          <div className="text-2xl font-medium text-gray-100">
            {/* {detailData.cnName}
            <span className="ml-2 text-sm text-gray-300">({detailData.enName})</span> */}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-64">
              <div className="mb-1 text-sm text-gray-500">当前选择国家</div>
              <Select
                showSearch
                placeholder="请选择国家"
                style={{ width: '100%' }}
                value={selectedCountry}
                onChange={handleCountryChange}
                loading={countriesLoading || continentsLoading}
                disabled={isEdit}
                filterOption={(input, option) =>
                  option?.label?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                }
                optionFilterProp="label"
                className="text-left"
              >
                {countryOptions}
              </Select>
            </div>

            <div className="min-w-40">
              <div className="mb-1 text-sm text-gray-500">当前选择年份</div>
              <DatePicker
                picker="year"
                placeholder="请选择年份"
                value={selectedYear}
                onChange={value => setSelectedYear(value)}
                disabled={isEdit}
                allowClear={false}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <Space>
            <Button onClick={() => navigate('/dataManagement')}>返回</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saveLoading}
              disabled={isEdit ? !detailData : !selectedCountry || !selectedYear}
            >
              保存
            </Button>
          </Space>
        </div>
      </div>

      <div>
        {detailLoading ? (
          <div className="flex h-80 items-center justify-center rounded-lg bg-white p-6 shadow-sm">
            <Spin size="large" />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
          >
            {renderFormItems()}
          </Form>
        )}
      </div>
    </div>
  )
}
