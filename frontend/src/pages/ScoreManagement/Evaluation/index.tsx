import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, message, Skeleton, Space, Typography } from 'antd'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ScoreEvaluationItemDto } from 'urbanization-backend/types/dto'

import useScoreStore from '@/stores/scoreStore'

const { Title, Text } = Typography
const { TextArea } = Input

const ScoreEvaluationPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
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
      form.setFieldsValue({ evaluations })
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

    const success = await saveEvaluations(values.evaluations)
    if (success) {
      message.success('评价体系保存成功！')
      navigate('/scoreManagement')
    } else {
      message.error('保存失败，请重试。')
    }
  }

  if (evaluationsLoading) {
    return (
      <div className="w-full max-w-4xl">
        <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 1 }} className="mb-8" />
        <Card>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl">
      <Title level={2}>配置评分评价体系</Title>
      <Text type="secondary" className="mb-4 block">
        定义不同的评分区间及其对应的评价文案。系统将根据综合评分匹配相应的评价，请确保区间连续且不重叠。
      </Text>
      <div className="mb-4 flex justify-end">
        <Space>
          <Button onClick={() => navigate('/scoreManagement')}>返回</Button>
          <Button type="primary" onClick={() => form.submit()} loading={evaluationsSaveLoading}>
            保存评价体系
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        name="score_evaluations"
        onFinish={handleSave}
        autoComplete="off"
        initialValues={{ evaluations: [{ minScore: null, maxScore: null, evaluationText: '' }] }}
      >
        <Form.List name="evaluations">
          {(fields, { add, remove }) => (
            <div>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  className="border-gray-200 transition-shadow hover:shadow-md !mb-4"
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
                  >
                    <TextArea rows={3} placeholder="请输入对该评分区间的详细评价..." />
                  </Form.Item>
                </Card>
              ))}

              <Button
                type="dashed"
                onClick={() => add()}
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