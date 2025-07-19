import { Button, Form, message, Radio, Select, Skeleton, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CountryData,
  ExportDataReqDto,
} from 'urbanization-backend/types/dto'
import { ExportFormat, ExportFormatOptions } from '@/types'

import CountrySelect from '@/components/CountrySelect'
import useDataManagementStore from '@/stores/dataManagementStore'

const { Title } = Typography
const { Option } = Select

const DataExport = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const {
    data: dataManagementList,
    listLoading,
    getDataManagementList,
    exportData,
    exportLoading
  } = useDataManagementStore()

  const [selectedYear, setSelectedYear] = useState<Date | null>(null)

  // 加载数据
  useEffect(() => {
    getDataManagementList()
  }, [getDataManagementList])

  // 监视表单字段的变化，以控制按钮的禁用状态
  const yearValue = Form.useWatch('year', form)
  const countriesValue = Form.useWatch('countryIds', form)
  const isFieldsEmpty = useMemo(
    () => !yearValue || !countriesValue || countriesValue.length === 0,
    [yearValue, countriesValue]
  )

  // 根据选择的年份，动态获取国家选项
  const countryOptions = useMemo(() => {
    if (!selectedYear) return []
    const yearData = dataManagementList.find(d => dayjs(d.year).isSame(dayjs(selectedYear), 'year'))
    return yearData ? yearData.data : []
  }, [selectedYear, dataManagementList])

  const handleYearChange = (yearString: string) => {
    const year = dayjs(yearString).toDate()
    setSelectedYear(year)
    form.setFieldsValue({ countryIds: [] }) // 年份变化时清空已选国家
  }

  const handleExport = async (values: { countryIds: string[]; format: ExportFormat }) => {
    if (!selectedYear) {
      message.error('请先选择年份')
      return
    }
    const params: ExportDataReqDto = {
      ...values,
      year: selectedYear
    }
    const success = await exportData(params)
    if (success) {
      message.success('导出任务已开始，请注意浏览器下载')
    } else {
      message.error('导出失败，请稍后重试')
    }
  }

  if (listLoading) {
    return (
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <Skeleton active />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Title
          level={2}
          className="!mb-0"
        >
          数据导出
        </Title>
      </div>

      <div className="rounded-lg bg-white p-8 shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleExport}
          initialValues={{ format: 'xlsx' as ExportFormat.XLSX }}
        >
          <Form.Item
            name="year"
            label="选择导出年份"
          >
            <Select
              placeholder="请选择年份"
              onChange={handleYearChange}
            >
              {dataManagementList.map(yearData => (
                <Option
                  key={yearData.year.toString()}
                  value={yearData.year.toString()}
                >
                  {dayjs(yearData.year).format('YYYY')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="countryIds"
            label="选择导出国家"
          >
            <CountrySelect
              mode="multiple"
              placeholder="请先选择年份，再选择国家"
              disabled={!selectedYear}
              options={countryOptions as CountryData[]}
            />
          </Form.Item>

          <Form.Item
            name="format"
            label="选择导出格式"
          >
            <Radio.Group>
              {ExportFormatOptions.map(option => (
                <Radio
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item className="mt-4">
            <Space>
              <Button
                onClick={() => navigate('/dataManagement')}
                disabled={exportLoading}
              >
                返回
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={exportLoading}
                disabled={isFieldsEmpty || exportLoading}
              >
                开始导出
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export const Component = DataExport
