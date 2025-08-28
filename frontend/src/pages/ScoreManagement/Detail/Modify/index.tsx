import { Button, Form, message, Skeleton, Space } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { UpsertScoreEvaluationDetailDto } from 'urbanization-backend/types/dto'

import RichEditor, { type RichEditorRef } from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { extractFilename, toFilenameContent, toFullPathContent } from '@/utils'

const ScoreEvaluationDetailModify = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const editorRef = useRef<RichEditorRef>(null)
  const routeParams = useParams<{ countryId: string; year: string }>()
  const year = useMemo(() => Number(routeParams.year || ''), [routeParams])
  const countryId = useMemo(() => routeParams.countryId || '', [routeParams])

  const detail = useScoreStore(state => state.evaluationDetailEdit)
  const detailLoading = useScoreStore(state => state.evaluationDetailEditLoading)
  const getDetail = useScoreStore(state => state.getEvaluationDetail)
  const upsertDetail = useScoreStore(state => state.upsertEvaluationDetail)

  useEffect(() => {
    if (year && countryId) {
      getDetail({ year, countryId })
    }
  }, [year, countryId])

  useEffect(() => {
    if (detail) {
      form.setFieldsValue({
        text: toFullPathContent(detail.text)
      })
    } else {
      form.resetFields(['text'])
    }
  }, [detail])

  const handleSave = async (values: { text: string }) => {
    if (!editorRef.current) {
      message.error('编辑器实例未准备好，请稍后再试')
      return
    }
    const { images, deletedImages } = editorRef.current.getImages()
    const payload: UpsertScoreEvaluationDetailDto = {
      year,
      countryId,
      text: toFilenameContent(values.text),
      images: images.map(extractFilename),
      deletedImages: deletedImages.map(extractFilename)
    }
    const ok = await upsertDetail(payload)
    if (ok) {
      message.success('保存成功')
      navigate('/scoreManagement/detail')
    } else {
      message.error('保存失败，请重试')
    }
  }

  if (detailLoading && !detail) {
    return (
      <div className="w-full max-w-7xl">
        <Skeleton
          active
          title={{ width: '30%' }}
          paragraph={{ rows: 1 }}
        />
        <Skeleton
          active
          title={false}
          paragraph={{ rows: 8 }}
          className="mt-4"
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">配置评价详情</h1>
        <Space>
          <Button onClick={() => navigate('/scoreManagement/detail')}>返回</Button>
          <Button
            type="primary"
            htmlType="submit"
            form="evaluationDetailForm"
          >
            保存
          </Button>
        </Space>
      </div>
      <Form
        id="evaluationDetailForm"
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Form.Item
          name="text"
          label="评价详情"
          rules={[{ required: true, message: '请输入内容' }]}
          valuePropName="value"
        >
          <RichEditor
            ref={editorRef}
            placeholder="请输入评价详情内容..."
            initialImages={detail?.images || []}
          />
        </Form.Item>
      </Form>
    </div>
  )
}

export default ScoreEvaluationDetailModify
