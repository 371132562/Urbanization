import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Skeleton,
  Space,
  Typography
} from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ScoreEvaluationItemDto } from 'urbanization-backend/types/dto'

import RichEditor, { type RichEditorRef } from '@/components/RichEditor'
import useArticleStore from '@/stores/articleStore'
import useScoreStore from '@/stores/scoreStore'
import { toFilenameContent, toFullPathContent } from '@/utils'

const { Text } = Typography
const { TextArea } = Input

const ScoreEvaluationPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const evaluations = useScoreStore(state => state.evaluations)
  const evaluationsLoading = useScoreStore(state => state.evaluationsLoading)
  const evaluationsSaveLoading = useScoreStore(state => state.evaluationsSaveLoading)
  const getEvaluations = useScoreStore(state => state.getEvaluations)
  const saveEvaluations = useScoreStore(state => state.saveEvaluations)

  // 评价标准相关
  const scoreStandard = useArticleStore(state => state.scoreStandard)
  const scoreStandardLoading = useArticleStore(state => state.scoreStandardLoading)
  const submitLoading = useArticleStore(state => state.submitLoading)
  const getScoreStandard = useArticleStore(state => state.getScoreStandard)
  const createScoreStandard = useArticleStore(state => state.createScoreStandard)
  const updateScoreStandard = useArticleStore(state => state.updateScoreStandard)

  // 评价标准编辑相关状态
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isScoreStandardExpanded, setIsScoreStandardExpanded] = useState(false)
  const editorRef = useRef<RichEditorRef>(null)

  useEffect(() => {
    getEvaluations()
    getScoreStandard() // 获取评价标准
  }, [])

  useEffect(() => {
    if (evaluations?.length > 0) {
      form.setFieldsValue({ evaluations })
    }
  }, [evaluations])

  // 处理评价标准编辑
  const handleEditScoreStandard = () => {
    if (scoreStandard && scoreStandard.id) {
      // 编辑模式：将后端存储的文件名形式的 content 转换为完整图片地址
      setEditContent(toFullPathContent(scoreStandard.content))
    } else {
      // 新建模式：清空内容
      setEditContent('')
    }
    setIsEditModalVisible(true)
  }

  // 处理评价标准保存
  const handleSaveScoreStandard = async () => {
    if (!editorRef.current) {
      message.error('编辑器实例未准备好，请稍后再试')
      return
    }

    const { images, deletedImages } = editorRef.current.getImages()

    // 将富文本内容中的图片地址统一转为文件名，用于后端存储
    const contentWithFilenames = toFilenameContent(editContent)

    // 提取文件名
    const processedImages = images.map(img => {
      const filename = img.split('/').pop() || img
      return filename
    })
    const processedDeletedImages = deletedImages.map(img => {
      const filename = img.split('/').pop() || img
      return filename
    })

    let success = false

    if (scoreStandard && scoreStandard.id) {
      // 编辑模式：调用更新方法
      const updateData = {
        id: scoreStandard.id,
        title: '', // 评价标准不需要标题，保持为空字符串
        content: contentWithFilenames,
        images: processedImages,
        deletedImages: processedDeletedImages
      }
      success = await updateScoreStandard(updateData)
    } else {
      // 新建模式：调用创建方法
      const createData = {
        title: '', // 评价标准不需要标题，保持为空字符串
        content: contentWithFilenames,
        images: processedImages,
        deletedImages: processedDeletedImages
      }
      success = await createScoreStandard(createData)
    }

    if (success) {
      message.success('评价标准保存成功')
      setIsEditModalVisible(false)
    } else {
      message.error('评价标准保存失败')
    }
  }

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
      navigate('/scoreManagement/list')
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
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">评价标准</h2>
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => setIsScoreStandardExpanded(!isScoreStandardExpanded)}
              icon={isScoreStandardExpanded ? <UpOutlined /> : <DownOutlined />}
            >
              {isScoreStandardExpanded ? '收起' : '展开'}
            </Button>
            <Button
              type="primary"
              onClick={handleEditScoreStandard}
              loading={submitLoading}
            >
              {scoreStandard && scoreStandard.id ? '编辑' : '创建'}
            </Button>
          </Space>
        </div>

        {scoreStandardLoading ? (
          <Skeleton
            active
            paragraph={{ rows: 3 }}
          />
        ) : scoreStandard && scoreStandard.id ? (
          <div className="prose max-w-none">
            <div className="relative">
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isScoreStandardExpanded ? 'max-h-none' : 'max-h-32'
                }`}
              >
                <RichEditor
                  value={toFullPathContent(scoreStandard.content)}
                  readOnly
                  placeholder="暂无评价标准内容"
                />
              </div>

              {/* 渐变遮罩层 */}
              {!isScoreStandardExpanded && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-gray-500">
            暂无评价标准，点击上方按钮创建
          </div>
        )}
      </div>

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
        initialValues={{ evaluations: [{ minScore: null, maxScore: null, evaluationText: '' }] }}
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
                  >
                    <TextArea
                      rows={3}
                      placeholder="请输入对该评分区间的详细评价..."
                    />
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

      {/* 评价标准编辑Modal */}
      <Modal
        title={`${scoreStandard && scoreStandard.id ? '编辑' : '创建'}评价标准`}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={handleSaveScoreStandard}
        confirmLoading={submitLoading}
        style={{ minWidth: '900px' }}
        okText="保存"
        cancelText="取消"
      >
        <div className="mt-4">
          <RichEditor
            ref={editorRef}
            value={editContent}
            onChange={setEditContent}
            placeholder="请输入评价标准内容..."
            initialImages={scoreStandard && scoreStandard.id ? scoreStandard.images : []}
          />
        </div>
      </Modal>
    </div>
  )
}

export const Component = ScoreEvaluationPage
