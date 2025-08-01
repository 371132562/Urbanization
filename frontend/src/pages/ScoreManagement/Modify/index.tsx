import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  message,
  Skeleton,
  Space,
  Tooltip,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CreateScoreDto } from 'urbanization-backend/types/dto'

import CountrySelect from '@/components/CountrySelect'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useScoreStore from '@/stores/scoreStore'

const { Title } = Typography

const ModifyScoreSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 2 }}
      />
      <Skeleton.Input
        style={{ width: '100%', marginTop: '1rem' }}
        active
      />
    </div>
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 8 }}
      />
    </div>
  </div>
)

export const Component = () => {
  const { countryId, year } = useParams<{ countryId?: string; year?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const isEdit = !!countryId && !!year

  // --- Store States ---
  const detailData = useScoreStore(state => state.detailData)
  const detailLoading = useScoreStore(state => state.detailLoading)
  const saveLoading = useScoreStore(state => state.saveLoading)
  const getScoreDetail = useScoreStore(state => state.getScoreDetail)
  const createScore = useScoreStore(state => state.createScore)
  const resetDetailData = useScoreStore(state => state.resetDetailData)
  const initializeNewData = useScoreStore(state => state.initializeNewData)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)

  // --- Local States for Selections ---
  const [selectedCountry, setSelectedCountry] = useState<string | null>(countryId || null)
  const [selectedYear, setSelectedYear] = useState<dayjs.Dayjs | null>(
    year ? dayjs(year, 'YYYY') : null
  )

  useEffect(() => {
    getCountries() // Fetch country list for the selector
    if (isEdit) {
      getScoreDetail({
        countryId,
        year: dayjs(year, 'YYYY').month(5).date(1).toDate()
      })
    } else {
      initializeNewData()
    }

    return () => {
      resetDetailData()
    }
  }, [countryId, year, isEdit])

  useEffect(() => {
    if (detailData) {
      form.setFieldsValue({
        ...detailData,
        year: detailData.year ? dayjs(detailData.year) : null
      })
      // Update local state for selections when data loads
      setSelectedCountry(detailData.countryId || null)
      setSelectedYear(detailData.year ? dayjs(detailData.year) : null)
    }
  }, [detailData, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedCountry || !selectedYear) {
        message.error('请选择国家和年份后再保存。')
        return
      }

      const dataToSave: CreateScoreDto = {
        countryId: selectedCountry,
        year: selectedYear.month(5).date(1).toDate(),
        totalScore: values.totalScore,
        urbanizationProcessDimensionScore: values.urbanizationProcessDimensionScore,
        humanDynamicsDimensionScore: values.humanDynamicsDimensionScore,
        materialDynamicsDimensionScore: values.materialDynamicsDimensionScore,
        spatialDynamicsDimensionScore: values.spatialDynamicsDimensionScore
      }

      const success = await createScore(dataToSave)
      if (success) {
        message.success(`评分数据${isEdit ? '编辑' : '录入'}成功`)
        navigate('/scoreManagement/list')
      } else {
        message.error('保存失败')
      }
    } catch (errorInfo) {
      console.log('表单校验失败:', errorInfo)
      message.error('请检查所有表单项是否都已正确填写')
    }
  }

  if (detailLoading && isEdit) {
    return <ModifyScoreSkeleton />
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-80">
              <div className="mb-1 text-sm text-gray-500">国家</div>
              <CountrySelect
                value={selectedCountry}
                onChange={value => {
                  if (!Array.isArray(value)) {
                    setSelectedCountry(value)
                    form.setFieldsValue({ countryId: value })
                  }
                }}
                disabled={isEdit}
              />
            </div>
            <div className="min-w-40">
              <div className="mb-1 text-sm text-gray-500">年份</div>
              <DatePicker
                picker="year"
                placeholder="请选择年份"
                value={selectedYear}
                onChange={date => {
                  setSelectedYear(date)
                  form.setFieldsValue({ year: date })
                }}
                disabled={isEdit}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <Space>
            <Button onClick={() => navigate('/scoreManagement/list')}>返回</Button>
            <Tooltip
              title={!isEdit && (!selectedCountry || !selectedYear) ? '请先选择国家和年份' : ''}
            >
              <span>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saveLoading}
                  disabled={!isEdit && (!selectedCountry || !selectedYear)}
                >
                  保存
                </Button>
              </span>
            </Tooltip>
          </Space>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {/* Form Items */}
            <Form.Item
              label="综合评分"
              name="totalScore"
              rules={[{ required: true, message: '请输入评分' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入评分"
                precision={3}
              />
            </Form.Item>
            <Form.Item
              label="城镇化进程维度评分"
              name="urbanizationProcessDimensionScore"
              rules={[{ required: true, message: '请输入评分' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入评分"
                precision={3}
              />
            </Form.Item>
            <Form.Item
              label="人性动力维度评分"
              name="humanDynamicsDimensionScore"
              rules={[{ required: true, message: '请输入评分' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入评分"
                precision={3}
              />
            </Form.Item>
            <Form.Item
              label="物性动力维度评分"
              name="materialDynamicsDimensionScore"
              rules={[{ required: true, message: '请输入评分' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入评分"
                precision={3}
              />
            </Form.Item>
            <Form.Item
              label="空间动力维度评分"
              name="spatialDynamicsDimensionScore"
              rules={[{ required: true, message: '请输入评分' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入评分"
                precision={3}
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </div>
  )
}
