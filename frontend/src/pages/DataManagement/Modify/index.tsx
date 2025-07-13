import {
  Button,
  Collapse,
  DatePicker,
  Form,
  InputNumber,
  message,
  Space,
  Spin,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type {
  CountryDetailResDto,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem
} from 'urbanization-backend/types/dto'

import useDataManagementStore from '@/stores/dataManagementStore'

const { Text } = Typography
const { Panel } = Collapse

export const Component = () => {
  const { countryId, year } = useParams<{ countryId?: string; year?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [selectedYear, setSelectedYear] = useState<dayjs.Dayjs | null>(year ? dayjs(year) : null)
  const isEdit = !!countryId && !!year

  const {
    detailData,
    detailLoading,
    saveLoading,
    getDataManagementDetail,
    saveDataManagementDetail,
    resetDetailData
  } = useDataManagementStore()

  // 组件加载或参数变化时获取详情数据
  useEffect(() => {
    if (isEdit) {
      getDataManagementDetail({
        countryId,
        year: new Date(parseInt(year as string), 0, 1)
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

  // 保存数据
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      if (!detailData && !selectedYear) {
        message.error('请选择年份')
        return
      }

      // 构建保存的数据
      const saveData: CountryDetailResDto = {
        countryId: detailData?.countryId || '',
        cnName: detailData?.cnName || '',
        enName: detailData?.enName || '',
        year: detailData?.year || new Date(selectedYear!.year(), 0, 1),
        isComplete: true, // 由后端计算
        indicators:
          detailData?.indicators.map(topIndicator => ({
            ...topIndicator,
            secondaryIndicators: topIndicator.secondaryIndicators.map(secondaryIndicator => ({
              ...secondaryIndicator,
              detailedIndicators: secondaryIndicator.detailedIndicators.map(detailedIndicator => ({
                ...detailedIndicator,
                value: values[`indicator_${detailedIndicator.id}`]
              }))
            }))
          })) || []
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
    if (!detailData && !isEdit) {
      return (
        <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50">
          <Text type="secondary">请先选择年份</Text>
        </div>
      )
    }

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
                (secondaryIndicator: SecondaryIndicatorItem) => (
                  <div
                    key={secondaryIndicator.id}
                    className="border-t border-gray-200"
                  >
                    <Collapse
                      defaultActiveKey={[secondaryIndicator.id]}
                      bordered={false}
                      className="bg-white"
                    >
                      <Panel
                        header={
                          <h4 className="text-base font-medium text-gray-700">
                            {secondaryIndicator.cnName}
                          </h4>
                        }
                        key={secondaryIndicator.id}
                        className="border-0"
                      >
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
                      </Panel>
                    </Collapse>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between rounded-lg bg-gray-800 p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 text-2xl text-gray-100">{isEdit ? '编辑' : '录入'}数据</div>
          {detailData && (
            <div className="text-lg font-medium text-gray-100">
              {detailData.cnName}
              <span className="ml-2 text-sm text-gray-300">({detailData.enName})</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <DatePicker
            picker="year"
            placeholder="请选择年份"
            value={selectedYear}
            onChange={value => setSelectedYear(value)}
            disabled={isEdit}
            allowClear={false}
            className="w-40"
          />
        </div>
        <Space>
          <Button onClick={() => navigate('/dataManagement')}>返回</Button>
          <Button
            color="primary"
            variant="outlined"
            onClick={handleSave}
            loading={saveLoading}
          >
            保存
          </Button>
        </Space>
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
