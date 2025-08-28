import { Button, Form, message, Radio, Select, Skeleton, Space, Typography } from 'antd'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { SimpleCountryData } from 'urbanization-backend/types/dto'

import CountrySelect from '@/components/CountrySelect'
import useScoreStore from '@/stores/scoreStore'
import { ExportFormat, ExportFormatOptions } from '@/types'

const { Option } = Select
const { Title } = Typography

const Export = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  // 年份来源：评分年份
  const scoreYears = useScoreStore(state => state.years)
  const scoreYearsLoading = useScoreStore(state => state.yearsLoading)
  const getScoreYears = useScoreStore(state => state.getScoreYears)

  // 多年份国家：使用评分模块的接口
  const scoreCountriesByYears = useScoreStore(state => state.countriesByYears)
  const scoreCountriesLoading = useScoreStore(state => state.countriesByYearsLoading)
  const getScoreCountriesByYears = useScoreStore(state => state.getScoreCountriesByYears)

  // 导出：评分模块导出
  const exportScoreMultiYear = useScoreStore(state => state.exportScoreMultiYear)
  const exportLoading = useScoreStore(state => state.exportLoading)

  // 兼容CSV可用性判断逻辑与数据管理一致
  const isCsvSupported = (selectedYears: number[]) => selectedYears.length <= 1

  // 初始化加载评分年份
  useEffect(() => {
    getScoreYears()
  }, [])

  // 组装带年份的国家下拉选项
  const getGroupedCountryOptions = () => {
    if (!scoreCountriesByYears || scoreCountriesByYears.length === 0) return []
    const all: (SimpleCountryData & { year: number })[] = []
    scoreCountriesByYears.forEach(y => {
      y.countries.forEach(c => all.push({ ...c, year: y.year }))
    })
    return all
  }

  const yearValue = Form.useWatch('year', form)
  const countriesValue = Form.useWatch('countryIds', form)
  const isFieldsEmpty = useMemo(
    () => !yearValue || !countriesValue || countriesValue.length === 0,
    [yearValue, countriesValue]
  )

  const handleYearChange = (yearStrings: string[]) => {
    const years = yearStrings.map(y => parseInt(String(y)))
    form.setFieldsValue({ countryIds: [] })
    if (years.length > 0) {
      getScoreCountriesByYears({ years })
    }
  }

  const handleSelectAllCountries = () => {
    const values: string[] = []
    if (scoreCountriesByYears && scoreCountriesByYears.length > 0) {
      scoreCountriesByYears.forEach(y => {
        y.countries.forEach(c => values.push(`${c.id}:${y.year}`))
      })
    }
    form.setFieldsValue({ countryIds: values })
  }

  const handleExport = async (values: { countryIds: string[]; format: ExportFormat }) => {
    if (values.countryIds.length === 0) {
      message.error('请先选择要导出的国家')
      return
    }
    const ok = await exportScoreMultiYear(values.countryIds, values.format)
    if (ok) message.success('多年份评分导出任务已开始，请注意浏览器下载')
    else message.error('导出失败，请稍后重试')
  }

  if (scoreYearsLoading) {
    return (
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <Skeleton active />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4 flex items-center">
        <Title
          level={4}
          className="!mb-0"
        >
          评分导出
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
              mode="multiple"
              placeholder="请选择年份"
              onChange={handleYearChange}
            >
              {scoreYears.map(year => (
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
                  loading={scoreCountriesLoading}
                  options={getGroupedCountryOptions()}
                  className="w-full"
                />
              </Form.Item>
              <Button
                onClick={handleSelectAllCountries}
                disabled={!yearValue || yearValue.length === 0 || scoreCountriesLoading}
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
                return (
                  <Radio
                    key={option.value}
                    value={option.value}
                    disabled={option.value === ExportFormat.CSV && !isCsvSupported(yearValue || [])}
                    title={
                      option.value === ExportFormat.CSV && !isCsvSupported(yearValue || [])
                        ? 'CSV格式不支持多年份导出，请选择单年份或使用其他格式'
                        : undefined
                    }
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
                onClick={() => navigate('/scoreManagement/list')}
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

export default Export
