import {
  Button,
  Collapse,
  CollapseProps,
  DatePicker,
  Form,
  InputNumber,
  message,
  Modal,
  Skeleton,
  Space,
  theme,
  Tooltip,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type {
  CreateIndicatorValuesDto,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem
} from 'urbanization-backend/types/dto'

import CountrySelect from '@/components/CountrySelect'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useDataManagementStore from '@/stores/dataManagementStore'
import useIndicatorStore from '@/stores/indicatorStore'

const { Text } = Typography

const ModifyPageSkeleton = () => (
  <div className="space-y-6">
    {[...Array(3)].map((_, topIndex) => (
      <div
        key={topIndex}
        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
      >
        <div className="bg-gray-800 px-6 py-3">
          <Skeleton.Input
            style={{ width: '200px' }}
            active
            size="small"
          />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(2)].map((_, secIndex) => (
            <div
              key={secIndex}
              className="p-6"
            >
              <Skeleton.Input
                style={{ width: '150px', marginBottom: '1rem' }}
                active
                size="small"
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(3)].map((_, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="rounded-md p-3"
                  >
                    <Skeleton
                      active
                      title={false}
                      paragraph={{ rows: 2 }}
                    />
                    <Skeleton.Input
                      style={{ width: '100%', marginTop: '8px' }}
                      active
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

export const Component = () => {
  const { token } = theme.useToken()
  const { countryId, year } = useParams<{ countryId?: string; year?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [selectedYear, setSelectedYear] = useState<dayjs.Dayjs | null>(year ? dayjs(year) : null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(countryId || null)
  const isEdit = !!countryId && !!year

  // --- DataManagement Store ---
  const detailData = useDataManagementStore(state => state.detailData)
  const detailLoading = useDataManagementStore(state => state.detailLoading)
  const saveLoading = useDataManagementStore(state => state.saveLoading)
  const getDataManagementDetail = useDataManagementStore(state => state.getDataManagementDetail)
  const saveDataManagementDetail = useDataManagementStore(state => state.saveDataManagementDetail)
  const resetDetailData = useDataManagementStore(state => state.resetDetailData)
  const checkDataManagementExistingData = useDataManagementStore(
    state => state.checkDataManagementExistingData
  )
  const initializeNewData = useDataManagementStore(state => state.initializeNewData)

  // --- CountryAndContinent Store ---
  const countries = useCountryAndContinentStore(state => state.countries)

  // --- Indicator Store ---
  const indicatorHierarchy = useIndicatorStore(state => state.indicatorHierarchy)

  // 组件加载或参数变化时获取详情数据
  useEffect(() => {
    if (isEdit) {
      getDataManagementDetail({
        countryId,
        year: dayjs(year, 'YYYY').startOf('year').toDate()
      })
    } else {
      // 新建模式下，使用获取到的指标层级来初始化detailData
      if (indicatorHierarchy.length > 0) {
        // 调用 store action 来初始化数据
        initializeNewData(indicatorHierarchy)
        // 设置form的初始值
        form.setFieldsValue(initialValuesFromIndicators(indicatorHierarchy))
      }
    }

    return () => {
      resetDetailData()
    }
  }, [countryId, year, isEdit, isEdit ? null : indicatorHierarchy])

  // 辅助函数：从指标结构生成表单初始值
  const initialValuesFromIndicators = (indicators: TopIndicatorItem[]) => {
    const initialValues: Record<string, number | null> = {}
    indicators.forEach(topIndicator => {
      topIndicator.secondaryIndicators.forEach(secondaryIndicator => {
        secondaryIndicator.detailedIndicators.forEach(detailedIndicator => {
          // 使用 enName 作为 key
          initialValues[detailedIndicator.enName] = detailedIndicator.value
        })
      })
    })
    return initialValues
  }

  // 详情数据加载后，设置表单值
  useEffect(() => {
    if (isEdit && detailData) {
      // 设置表单初始值，key为enName
      const initialValues = initialValuesFromIndicators(detailData.indicators)
      form.setFieldsValue(initialValues)
    }
  }, [detailData, form, isEdit])

  // 处理国家变化
  const handleCountryChange = (value: string) => {
    setSelectedCountry(value)
  }

  // 封装保存逻辑，以便复用
  const doSave = async (dataToSave: CreateIndicatorValuesDto) => {
    const success = await saveDataManagementDetail(dataToSave)
    if (success) {
      message.success('保存成功')
      navigate('/dataManagement')
    } else {
      message.error('保存失败')
    }
  }

  // 保存数据
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      if (!selectedCountry || !selectedYear) {
        message.error(!selectedCountry ? '请选择国家' : '请选择年份')
        return
      }

      // 使用 indicatorHierarchy 作为唯一数据源来创建 enName -> id 的映射表
      if (!indicatorHierarchy) {
        message.error('指标层级数据加载失败，无法保存')
        return
      }
      const enNameToIdMap = new Map<string, string>()
      indicatorHierarchy.forEach(top => {
        top.secondaryIndicators.forEach(sec => {
          sec.detailedIndicators.forEach(det => {
            enNameToIdMap.set(det.enName, det.id)
          })
        })
      })

      // 直接遍历表单返回的值，构造要保存的数据
      const indicatorsToSave = Object.entries(values).map(([enName, value]) => ({
        detailedIndicatorId: enNameToIdMap.get(enName)!,
        value: value as number | null
      }))

      const dataToSave: CreateIndicatorValuesDto = {
        countryId: selectedCountry,
        year: selectedYear.startOf('year').toDate(),
        indicators: indicatorsToSave
      }

      if (!isEdit) {
        // 新建模式下，检查数据是否存在
        const { exists } = await checkDataManagementExistingData({
          countryId: selectedCountry,
          year: selectedYear.startOf('year').toDate()
        })

        if (exists) {
          const countryInfo = countries.find(c => c.id === selectedCountry)
          const yearString = selectedYear.format('YYYY')

          Modal.confirm({
            title: '数据覆盖确认',
            content: (
              <div>
                检测到国家{' '}
                <Text
                  style={{ color: token.colorPrimary }}
                  strong
                >
                  {countryInfo?.cnName} ({countryInfo?.enName})
                </Text>{' '}
                在{' '}
                <Text
                  style={{ color: token.colorPrimary }}
                  strong
                >
                  {yearString}
                </Text>{' '}
                年的数据已存在，确认要覆盖吗？
              </div>
            ),
            okText: '确认覆盖',
            cancelText: '取消',
            async onOk() {
              await doSave(dataToSave)
            }
          })
        } else {
          // 如果数据不存在，直接保存
          await doSave(dataToSave)
        }
      } else {
        // 编辑模式下直接保存
        await doSave(dataToSave)
      }
    } catch (error) {
      // Antd Form.validateFields() 会在校验失败时抛出错误
      console.error('表单校验失败:', error)
      message.error('表单校验失败，请检查输入')
    }
  }

  // 渲染表单项
  const renderFormItems = () => {
    if (!detailData?.indicators?.length) {
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
                                  name={detailedIndicator.enName} // 使用 enName 作为 name
                                  labelCol={{ span: 24 }}
                                  wrapperCol={{ span: 24 }}
                                >
                                  <InputNumber
                                    placeholder="请输入指标值"
                                    style={{ width: '100%' }}
                                    precision={2}
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
        <div className="mb-1 text-2xl text-gray-100">数据{isEdit ? '编辑' : '录入'}</div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 pt-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-80">
              <div className="mb-1 text-sm text-gray-500">当前选择国家</div>
              <CountrySelect
                value={selectedCountry}
                onChange={handleCountryChange}
                disabled={isEdit}
              />
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
            <Tooltip
              title={!isEdit && (!selectedCountry || !selectedYear) ? '请选择国家和年份' : ''}
            >
              <span>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saveLoading}
                  disabled={isEdit ? true : !selectedCountry || !selectedYear} // 新建模式下，如果没有选择国家和年份，禁用保存按钮
                >
                  保存
                </Button>
              </span>
            </Tooltip>
          </Space>
        </div>
      </div>

      <div>
        {detailLoading ? (
          <ModifyPageSkeleton />
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
