import { Button, Form, message, Radio, Select, Skeleton, Space } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ExportDataReqDto } from 'urbanization-backend/types/dto'

import CountrySelect from '@/components/CountrySelect'
import useDataManagementStore from '@/stores/dataManagementStore'
import { ExportFormat, ExportFormatOptions } from '@/types'

const { Option } = Select

const DataExport = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const {
    years,
    yearsLoading,
    countriesByYear,
    countriesByYearLoading,
    getDataManagementYears,
    getDataManagementCountriesByYear,
    exportData,
    exportLoading
  } = useDataManagementStore()

  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // 加载年份数据
  useEffect(() => {
    getDataManagementYears()
  }, [getDataManagementYears])

  // 监视表单字段的变化，以控制按钮的禁用状态
  const yearValue = Form.useWatch('year', form)
  const countriesValue = Form.useWatch('countryIds', form)
  const isFieldsEmpty = useMemo(
    () => !yearValue || !countriesValue || countriesValue.length === 0,
    [yearValue, countriesValue]
  )

  const handleYearChange = (yearString: string) => {
    const year = parseInt(yearString)
    setSelectedYear(year)
    form.setFieldsValue({ countryIds: [] }) // 年份变化时清空已选国家
    // 根据选择的年份获取对应的国家列表
    getDataManagementCountriesByYear({ year })
  }

  const handleSelectAllCountries = () => {
    // 获取所有国家的ID
    const allCountryIds = countriesByYear.map(country => country.id)
    form.setFieldsValue({ countryIds: allCountryIds })
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

  if (yearsLoading) {
    return (
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <Skeleton active />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl">
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
              {years.map(year => (
                <Option
                  key={year}
                  value={year}
                >
                  {year}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="选择导出国家"
            required
          >
            <div className="flex w-full items-start">
              <Form.Item
                name="countryIds"
                className="mb-0 flex-grow"
                rules={[{ required: true, message: '请选择要导出的国家' }]}
              >
                <CountrySelect
                  mode="multiple"
                  placeholder="请先选择年份，再选择国家"
                  disabled={!selectedYear}
                  loading={countriesByYearLoading}
                  options={countriesByYear}
                  className="w-full"
                />
              </Form.Item>
              <Button
                onClick={handleSelectAllCountries}
                disabled={!selectedYear || countriesByYearLoading}
                className="!ml-2"
              >
                全选
              </Button>
            </div>
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
                onClick={() => navigate('/dataManagement/list')}
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
