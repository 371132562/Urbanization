// 引入 wangeditor 的样式文件
import '@wangeditor/editor/dist/css/style.css'

// 从 wangeditor 核心库和 React 封装库中引入所需类型和组件
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { useEffect, useState } from 'react'

/**
 * 富文本编辑器组件的 Props 类型定义
 * @property {string} [value] - 编辑器的内容 (HTML 字符串)，设为可选以兼容 antd Form 的注入
 * @property {function} [onChange] - 内容变化时的回调函数，设为可选以兼容 antd Form 的注入
 * @property {string} [placeholder] - 编辑器的占位提示符
 * @property {string} [height] - 编辑器内容区域的高度
 * @property {boolean} [readOnly=false] - 是否为只读模式
 */
export type RichEditorProps = {
  value?: string
  onChange?: (newHtml: string) => void
  placeholder?: string
  height?: string
  readOnly?: boolean
}

/**
 * 可复用的富文本编辑器组件 (基于 wangeditor)
 * @description 这是一个受控组件，其内容由外部通过 value prop 控制，
 *              并通过 onChange prop 将内容变化通知给外部。
 *              当在 antd Form.Item 中使用时，value 和 onChange 会被 Form 自动注入。
 */
function RichEditor({
  value = '', // 默认为空字符串，防止非受控警告
  onChange = () => {}, // 默认为空函数，防止非受控警告
  placeholder = '请输入内容...',
  height = '500px',
  readOnly = false
}: RichEditorProps) {
  // editor 实例，必须用 state 来存储，不能直接创建
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  // --- 编辑器配置 ---

  // 工具栏配置，可以根据需求自定义
  const toolbarConfig: Partial<IToolbarConfig> = {}

  // 编辑器核心配置
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly,
    // 确保编辑器失去焦点时，也能触发 onChange
    onBlur: editor => onChange(editor.getHtml())
  }

  // --- 生命周期管理 ---

  // 组件销毁时，及时销毁 editor 实例，这点非常重要！
  // 否则会导致内存泄漏
  useEffect(() => {
    return () => {
      if (editor == null) return
      editor.destroy()
      setEditor(null)
    }
  }, [editor]) // 依赖于 editor 实例

  // --- 日志：组件挂载和卸载 ---
  useEffect(() => {
    console.log('[RichEditor] 组件挂载，初始 value:', value)
    return () => {
      if (editor == null) return
      editor.destroy()
      setEditor(null)
      console.log('[RichEditor] 组件卸载')
    }
  }, [])

  // --- 日志：每次 value 变化时 ---
  useEffect(() => {
    console.log('[RichEditor] value 变化:', value)
  }, [value])

  return (
    // 编辑器容器，设置边框和 z-index 以保证工具栏在页面上正常显示
    <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
      {/* 工具栏 */}
      {!readOnly && (
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #ccc' }}
        />
      )}
      {/* 编辑器 */}
      <Editor
        defaultConfig={editorConfig}
        value={value} // 绑定内容
        onCreated={setEditor} // 编辑器创建完成后，保存实例
        onChange={editor => onChange(editor.getHtml())} // 内容变化时，调用外部的 onChange
        mode="default"
        style={{
          height: readOnly ? 'auto' : height,
          minHeight: readOnly ? '300px' : height,
          overflowY: 'auto'
        }}
      />
    </div>
  )
}

export default RichEditor
