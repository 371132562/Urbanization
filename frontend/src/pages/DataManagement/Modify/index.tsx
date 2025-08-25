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
  Tag,
  theme,
  Tooltip,
  Typography
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
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
import { dayjs } from '@/utils/dayjs'

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
                style={{ width: '150px' }}
                active
                size="small"
                className="mb-2"
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
  // 表单是否已完成初始化（已设置初始值），用于避免进入时的状态闪烁
  const [formInitialized, setFormInitialized] = useState(false)

  // 实时监听整个表单的值，用于判断数据完整性；0 视为有效值
  const allFieldValues = Form.useWatch([], form)
  const isFormComplete = useMemo(() => {
    const values = allFieldValues || {}
    // 只要存在 null/undefined/'' 这样的空值则判定为不完整；数值 0 为有效
    for (const v of Object.values(values)) {
      if (v === null || v === undefined || v === '') {
        return false
      }
    }
    return true
  }, [allFieldValues])

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
      // 切换到编辑模式或参数变化时，先标记为未初始化，待详情回填后再标记为已初始化
      setFormInitialized(false)
      getDataManagementDetail({
        countryId,
        year: parseInt(year!)
      })
    } else {
      // 新建模式下，先标记为未初始化，待根据指标层级设置表单后再标记为已初始化
      setFormInitialized(false)
      if (indicatorHierarchy.length > 0) {
        initializeNewData(indicatorHierarchy)
        form.setFieldsValue(initialValuesFromIndicators(indicatorHierarchy))
        setFormInitialized(true)
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
      const initialValues = initialValuesFromIndicators(detailData.indicators)
      form.setFieldsValue(initialValues)
      // 详情数据回填完成，标记为已初始化，避免进入页面时的提示闪烁
      setFormInitialized(true)
    }
  }, [detailData, form, isEdit])

  // 封装保存逻辑，以便复用
  const doSave = async (dataToSave: CreateIndicatorValuesDto) => {
    const success = await saveDataManagementDetail(dataToSave)
    if (success) {
      message.success('保存成功')
      navigate('/dataManagement/list')
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

      // 根据编辑或新建模式，选择正确的指标结构作为数据源
      const sourceIndicators = isEdit ? detailData?.indicators : indicatorHierarchy
      if (!sourceIndicators || sourceIndicators.length === 0) {
        message.error('指标层级数据加载失败，无法保存')
        return
      }

      // 基于指标结构来安全地构造要保存的数据，而不是遍历表单返回值
      const indicatorsToSave: { detailedIndicatorId: string; value: number | null }[] = []
      sourceIndicators.forEach(top => {
        top.secondaryIndicators.forEach(sec => {
          sec.detailedIndicators.forEach(det => {
            const formValue = values[det.enName]
            indicatorsToSave.push({
              detailedIndicatorId: det.id,
              // 处理表单中可能不存在该字段的情况（理论上不应发生，但作为保护）
              value: formValue === undefined ? null : (formValue as number | null)
            })
          })
        })
      })

      const dataToSave: CreateIndicatorValuesDto = {
        countryId: selectedCountry,
        year: selectedYear.year(),
        indicators: indicatorsToSave
      }

      if (!isEdit) {
        // 新建模式下，检查数据是否存在
        const { exists } = await checkDataManagementExistingData({
          countryId: selectedCountry,
          year: selectedYear.year()
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
      message.error('表单校验失败，请检查输入')
      console.log('表单校验或保存失败:', error)
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
                                    precision={4}
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
    <div className="w-full max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 pt-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-80">
              <div className="mb-1 text-sm text-gray-500">当前选择国家</div>
              <CountrySelect
                value={selectedCountry}
                onChange={val => {
                  setSelectedCountry(val as string)
                }}
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

          <div className="flex items-center gap-3">
            {/* 数据完整性提示标签：表单初始化完成后再展示，避免进入页面闪烁 */}
            {formInitialized && (
              <Tag color={isFormComplete ? 'success' : 'warning'}>
                {isFormComplete ? '完整' : '部分缺失'}
              </Tag>
            )}
            <Space>
              <Button onClick={() => navigate('/dataManagement/list')}>返回</Button>
              <Tooltip
                title={!isEdit && (!selectedCountry || !selectedYear) ? '请选择国家和年份' : ''}
              >
                <span>
                  <Button
                    type="primary"
                    onClick={handleSave}
                    loading={saveLoading}
                    disabled={isEdit ? false : !selectedCountry || !selectedYear}
                  >
                    保存
                  </Button>
                </span>
              </Tooltip>
            </Space>
          </div>
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
