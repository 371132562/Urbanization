import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, InputNumber, message, Skeleton, Space, Typography } from 'antd'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { ScoreEvaluationItemDto } from 'urbanization-backend/types/dto'

import RichEditor, { type RichEditorRef } from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { extractFilename, toFilenameContent, toFullPathContent } from '@/utils'

import ScoreStandard from './ScoreStandard'

const { Text } = Typography

const ScoreEvaluationPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const editorRefs = useRef<(RichEditorRef | null)[]>([])
  const evaluations = useScoreStore(state => state.evaluations)
  const evaluationsLoading = useScoreStore(state => state.evaluationsLoading)
  const evaluationsSaveLoading = useScoreStore(state => state.evaluationsSaveLoading)
  const getEvaluations = useScoreStore(state => state.getEvaluations)
  const saveEvaluations = useScoreStore(state => state.saveEvaluations)

  useEffect(() => {
    getEvaluations()
  }, [])

  useEffect(() => {
    if (evaluations?.length > 0) {
      // 将后端存储的文件名形式的 evaluationText 转换为完整图片地址后再注入编辑器
      const processedEvaluations = evaluations.map(evaluation => ({
        ...evaluation,
        evaluationText: toFullPathContent(evaluation.evaluationText)
      }))
      form.setFieldsValue({ evaluations: processedEvaluations })
    }
  }, [evaluations])

  const handleSave = async (values: { evaluations: ScoreEvaluationItemDto[] }) => {
    // Basic validation to check for overlapping score ranges
    const sortedEvaluations = [...values.evaluations].sort((a, b) => a.minScore - b.minScore)
    for (let i = 0; i < sortedEvaluations.length - 1; i++) {
      if (sortedEvaluations[i].maxScore > sortedEvaluations[i + 1].minScore) {
        message.error(`评价区间 ${i + 1} 和 ${i + 2} 的分数范围重叠，请检查。`)
        return
      }
    }

    // 处理富文本编辑器的图片数据
    const processedEvaluations = values.evaluations.map((evaluation, index) => {
      const editorRef = editorRefs.current[index]
      if (!editorRef) {
        return evaluation
      }

      const { images, deletedImages } = editorRef.getImages()

      // 将富文本内容中的图片地址统一转为文件名，用于后端存储
      const evaluationTextWithFilenames = toFilenameContent(evaluation.evaluationText)

      return {
        ...evaluation,
        evaluationText: evaluationTextWithFilenames,
        images: images.map(extractFilename),
        deletedImages: deletedImages.map(extractFilename)
      }
    })

    const success = await saveEvaluations(processedEvaluations)
    if (success) {
      message.success('评价体系保存成功！')
    } else {
      message.error('保存失败，请重试。')
    }
  }

  if (evaluationsLoading) {
    return (
      <div className="w-full max-w-4xl">
        <Skeleton
          active
          title={{ width: '30%' }}
          paragraph={{ rows: 1 }}
          className="mb-8"
        />
        <Card>
          <Skeleton
            active
            paragraph={{ rows: 4 }}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl">
      {/* 评价标准区域 */}
      <ScoreStandard />

      <div className="mb-4 flex items-center justify-between">
        <Text
          type="secondary"
          className="flex-1"
        >
          定义不同的评分区间及其对应的评价文案。系统将根据综合评分匹配相应的评价，请确保区间连续且不重叠。
        </Text>
        <Space>
          <Button onClick={() => navigate('/scoreManagement/list')}>返回</Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={evaluationsSaveLoading}
          >
            保存评价体系
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        name="score_evaluations"
        onFinish={handleSave}
        autoComplete="off"
        initialValues={{
          evaluations: [{ minScore: null, maxScore: null, evaluationText: '', images: [] }]
        }}
      >
        <Form.List name="evaluations">
          {(fields, { add, remove }) => (
            <div>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  className="!mb-4 border-gray-200 transition-shadow hover:shadow-md"
                  title={<Text strong>评价区间 {index + 1}</Text>}
                  extra={
                    fields.length > 1 ? (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    ) : null
                  }
                >
                  <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                    <Form.Item
                      {...restField}
                      name={[name, 'minScore']}
                      label="最小评分 (包含)"
                      rules={[{ required: true, message: '请输入最小评分' }]}
                    >
                      <InputNumber
                        step={0.001}
                        precision={3}
                        placeholder="例如: 0.000"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'maxScore']}
                      label="最大评分 (包含)"
                      rules={[{ required: true, message: '请输入最大评分' }]}
                    >
                      <InputNumber
                        step={0.001}
                        precision={3}
                        placeholder="例如: 50.000"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item
                    {...restField}
                    name={[name, 'evaluationText']}
                    label="评价文案"
                    rules={[{ required: true, message: '请输入评价文案' }]}
                    valuePropName="value"
                  >
                    <RichEditor
                      ref={ref => {
                        if (editorRefs.current) {
                          editorRefs.current[name] = ref
                        }
                      }}
                      placeholder="请输入对该评分区间的详细评价..."
                      height="200px"
                      initialImages={evaluations?.[name]?.images || []}
                    />
                  </Form.Item>
                </Card>
              ))}

              <Button
                type="dashed"
                onClick={() =>
                  add({ minScore: null, maxScore: null, evaluationText: '', images: [] })
                }
                block
                icon={<PlusOutlined />}
              >
                添加评价区间
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </div>
  )
}

export const Component = ScoreEvaluationPage
