import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { Button, message, Modal, Skeleton, Space } from 'antd'
import { useEffect, useRef, useState } from 'react'

import RichEditor, { type RichEditorRef } from '@/components/RichEditor'
import useArticleStore from '@/stores/articleStore'
import { toFilenameContent, toFullPathContent } from '@/utils'

// 评价标准组件
const ScoreStandard = () => {
  // 评价标准相关
  const scoreStandard = useArticleStore(state => state.scoreStandard)
  const getScoreStandard = useArticleStore(state => state.getScoreStandard)
  const scoreStandardLoading = useArticleStore(state => state.scoreStandardLoading)
  const submitLoading = useArticleStore(state => state.submitLoading)
  const createScoreStandard = useArticleStore(state => state.createScoreStandard)
  const updateScoreStandard = useArticleStore(state => state.updateScoreStandard)

  useEffect(() => {
    getScoreStandard()
  }, [])

  // 评价标准编辑相关状态
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isScoreStandardExpanded, setIsScoreStandardExpanded] = useState(false)
  const editorRef = useRef<RichEditorRef>(null)

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

  return (
    <>
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
              color="primary"
              variant="outlined"
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
    </>
  )
}

export default ScoreStandard
