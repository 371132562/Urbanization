import { Button, Form, message, Radio, Select, Skeleton, Space } from 'antd'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { SimpleCountryData } from 'urbanization-backend/types/dto'

import CountrySelect from '@/components/CountrySelect'
import useDataManagementStore from '@/stores/dataManagementStore'
import { ExportFormat, ExportFormatOptions } from '@/types'

const { Option } = Select

const DataExport = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const years = useDataManagementStore(state => state.years)
  const yearsLoading = useDataManagementStore(state => state.yearsLoading)
  const countriesByYears = useDataManagementStore(state => state.countriesByYears)
  const countriesByYearsLoading = useDataManagementStore(state => state.countriesByYearsLoading)
  const getDataManagementYears = useDataManagementStore(state => state.getDataManagementYears)
  const getDataManagementCountriesByYears = useDataManagementStore(
    state => state.getDataManagementCountriesByYears
  )
  const exportDataMultiYear = useDataManagementStore(state => state.exportDataMultiYear)
  const isCsvSupported = useDataManagementStore(state => state.isCsvSupported)
  const exportLoading = useDataManagementStore(state => state.exportLoading)

  // 加载年份数据
  useEffect(() => {
    getDataManagementYears()
  }, [])

  // 获取按年份分组的国家选项
  const getGroupedCountryOptions = () => {
    if (!countriesByYears || countriesByYears.length === 0) {
      return []
    }

    // 直接返回所有国家的数组，包含年份信息
    const allCountries: (SimpleCountryData & { year: number })[] = []

    countriesByYears.forEach(yearData => {
      yearData.countries.forEach(country => {
        allCountries.push({
          ...country,
          year: yearData.year // 直接添加年份属性
        })
      })
    })

    return allCountries
  }

  // 监视表单字段的变化，以控制按钮的禁用状态
  const yearValue = Form.useWatch('year', form)
  const countriesValue = Form.useWatch('countryIds', form)
  const isFieldsEmpty = useMemo(
    () => !yearValue || !countriesValue || countriesValue.length === 0,
    [yearValue, countriesValue]
  )

  const handleYearChange = (yearStrings: string[]) => {
    const years = yearStrings.map(yearString => parseInt(yearString))
    form.setFieldsValue({ countryIds: [] }) // 年份变化时清空已选国家

    if (years.length > 0) {
      // 根据选择的多个年份获取对应的国家列表
      getDataManagementCountriesByYears({ years })
    }
  }

  const handleSelectAllCountries = () => {
    // 获取所有年份下所有国家的ID（包含年份信息）
    const allCountryYearValues: string[] = []
    if (countriesByYears && countriesByYears.length > 0) {
      countriesByYears.forEach(yearData => {
        yearData.countries.forEach(country => {
          allCountryYearValues.push(`${country.id}:${yearData.year}`)
        })
      })
    }
    form.setFieldsValue({ countryIds: allCountryYearValues })
  }

  const handleExport = async (values: { countryIds: string[]; format: ExportFormat }) => {
    if (values.countryIds.length === 0) {
      message.error('请先选择要导出的国家')
      return
    }

    // 直接调用store的导出方法，传入选中的国家-年份值和格式
    const success = await exportDataMultiYear(values.countryIds, values.format)
    if (success) {
      message.success('多年份导出任务已开始，请注意浏览器下载')
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
              mode="multiple"
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
                  disabled={!yearValue || yearValue.length === 0}
                  loading={countriesByYearsLoading}
                  options={getGroupedCountryOptions()}
                  className="w-full"
                />
              </Form.Item>
              <Button
                onClick={handleSelectAllCountries}
                disabled={!yearValue || yearValue.length === 0 || countriesByYearsLoading}
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
              {ExportFormatOptions.map(option => {
                const isDisabled =
                  option.value === ExportFormat.CSV && !isCsvSupported(yearValue || [])
                const tooltip =
                  option.value === ExportFormat.CSV && !isCsvSupported(yearValue || [])
                    ? 'CSV格式不支持多年份导出，请选择单年份或使用其他格式'
                    : undefined

                return (
                  <Radio
                    key={option.value}
                    value={option.value}
                    disabled={isDisabled}
                    title={tooltip}
                  >
                    {option.label}
                    {option.value === ExportFormat.CSV && !isCsvSupported(yearValue || []) && (
                      <span className="ml-2 text-xs text-gray-500">(多年份时不支持)</span>
                    )}
                  </Radio>
                )
              })}
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

export default DataExport
