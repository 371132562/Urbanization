import { Button, Form, Input, message, Modal, Skeleton, Space } from 'antd'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { CreateArticleDto, UpdateArticleDto } from 'urbanization-backend/types/dto'

// 引入自定义的富文本编辑器组件和文章状态管理 store
import RichEditor, { type RichEditorRef } from '@/components/RichEditor'
import useArticleStore from '@/stores/articleStore'
import { extractFilename, toFilenameContent, toFullPathContent } from '@/utils'

/**
 * 文章创建/编辑组件
 * @description: 该组件通过 URL 是否包含 ID 来区分是“新增”还是“编辑”模式，并复用同一套表单。
 */
const ArticleModify: FC = () => {
  // 从 URL 中获取文章 ID，用于判断是新建还是编辑模式
  const { id } = useParams<{ id: string }>()
  // 获取路由导航函数，用于页面跳转
  const navigate = useNavigate()
  // antd 表单实例，用于控制表单行为
  const [form] = Form.useForm()
  // 创建一个 Ref 来引用富文本编辑器实例，以便调用其内部方法
  const editorRef = useRef<RichEditorRef>(null)

  // --- Modal 状态 ---
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [previewContent, setPreviewContent] = useState('')

  // --- 从 Zustand store 中按需获取状态和方法 ---
  // 这种独立获取的方式可以避免不必要的组件重渲染
  const articleDetail = useArticleStore(state => state.articleDetail)
  const detailLoading = useArticleStore(state => state.detailLoading)
  const submitLoading = useArticleStore(state => state.submitLoading)
  const getArticleDetail = useArticleStore(state => state.getArticleDetail)
  const clearArticleDetail = useArticleStore(state => state.clearArticleDetail)
  const createArticle = useArticleStore(state => state.createArticle)
  const updateArticle = useArticleStore(state => state.updateArticle)

  // 判断当前是否为编辑模式（用 useMemo 优化）
  const isEditMode = useMemo(() => !!id, [id])

  // 1. 处理数据加载和清理
  useEffect(() => {
    // 仅在编辑模式且 id 存在时执行数据获取
    if (isEditMode && id) {
      getArticleDetail(id)
    }

    // 组件卸载（unmount）时执行清理操作，清空 store 中的文章详情数据
    // 这样可以防止下次进入新建页面时，意外地显示旧数据
    return () => {
      clearArticleDetail()
    }
  }, [id, isEditMode]) // 依赖项数组

  // 2. 当文章详情数据加载成功后，用它来填充表单
  useEffect(() => {
    // 异步数据加载后，DOM 更新和组件挂载可能存在时序问题
    // 使用 setTimeout 将 setFieldsValue 推迟到当前事件循环的末尾
    // 确保 RichEditor 组件已完全挂载并准备好接收新的 value
    if (isEditMode && articleDetail) {
      setTimeout(() => {
        form.setFieldsValue({
          title: articleDetail.title,
          // 将后端存储的文件名形式的 content 转换为完整图片地址后再注入编辑器
          content: toFullPathContent(articleDetail.content)
        })
      }, 0)
    }
  }, [articleDetail, isEditMode]) // 依赖于详情数据、模式和表单实例

  /**
   * 处理表单提交（保存）事件
   * @param values - antd Form 自动收集的表单值
   */
  const handleSave = async (values: { title: string; content: string }) => {
    // 从 RichEditor ref 中获取图片列表
    if (!editorRef.current) {
      message.error('编辑器实例未准备好，请稍后再试')
      return
    }
    const { images, deletedImages } = editorRef.current.getImages()

    // 将富文本内容中的图片地址统一转为文件名，用于后端存储
    const contentWithFilenames = toFilenameContent(values.content)

    const processedImages = images.map(extractFilename)
    const processedDeletedImages = deletedImages.map(extractFilename)

    let success = false // 用于追踪 API 调用是否成功

    // 根据是否为编辑模式，调用不同的 store 方法
    if (isEditMode) {
      // 编辑模式：需要传入文章 ID
      const data: UpdateArticleDto = {
        id: id as string,
        title: values.title,
        content: contentWithFilenames,
        images: processedImages,
        deletedImages: processedDeletedImages
      }
      success = await updateArticle(data)
    } else {
      // 新增模式：直接使用表单数据
      const data: CreateArticleDto = {
        title: values.title,
        content: contentWithFilenames,
        images: processedImages,
        deletedImages: processedDeletedImages
      }
      success = await createArticle(data)
    }

    // 根据操作结果给出反馈，并跳转页面
    if (success) {
      message.success(isEditMode ? '文章更新成功' : '文章创建成功')
      navigate('/article/list') // 成功后返回文章列表页
    } else {
      message.error(isEditMode ? '文章更新失败' : '文章创建失败')
    }
  }

  /**
   * 处理预览按钮点击事件
   */
  const handlePreview = () => {
    // 从表单实例中获取当前编辑器的内容
    const content = form.getFieldValue('content')
    setPreviewContent(content || '') // 设置预览内容，如果为空则设为空字符串
    setIsPreviewVisible(true) // 显示 Modal
  }

  // --- 渲染逻辑 ---

  // 编辑模式下，详情未加载完毕时显示骨架屏
  if (isEditMode && (detailLoading || !articleDetail)) {
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
      {/* 页面头部：标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"></h1>
        <Space>
          <Button onClick={() => navigate('/article/list')}>返回</Button>
          <Button onClick={handlePreview}>预览</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitLoading}
            form="articleForm" // 关联到下面的 Form
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 表单区域 */}
      <Form
        id="articleForm" // 为表单设置 ID，以便外部按钮可以触发表单提交
        form={form}
        layout="vertical"
        onFinish={handleSave}
        className="space-y-2"
      >
        <Form.Item
          name="title"
          label="文章标题"
          rules={[{ required: true, message: '请输入文章标题' }]}
        >
          <Input placeholder="请输入文章标题" />
        </Form.Item>

        <Form.Item
          name="content"
          label="文章内容"
          rules={[{ required: true, message: '请输入文章内容' }]}
          valuePropName="value" // 告诉 Form.Item 将 `value` prop 传递给子组件
        >
          <RichEditor
            ref={editorRef}
            placeholder="请输入文章内容..."
            initialImages={isEditMode && articleDetail ? articleDetail.images : []}
          />
        </Form.Item>
      </Form>

      {/* 内容预览 Modal */}
      <Modal
        title="文章预览"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsPreviewVisible(false)}
          >
            关闭
          </Button>
        ]}
        width="50vw" // 使用视口宽度的 80%
        style={{ minWidth: '600px' }} // 增加最小宽度
      >
        {/* 使用只读模式的 RichEditor 来展示预览内容 */}
        <RichEditor
          value={previewContent}
          readOnly
        />
      </Modal>
    </div>
  )
}

export default ArticleModify
