import { QuestionCircleOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Collapse, Image, List, message, Space } from 'antd'
import { FC, useMemo, useState } from 'react'

import useSystemMaintenanceStore from '@/stores/systemMaintenanceStore'
import { buildFullImageUrl } from '@/utils'

// 孤立图片清理页：第一步扫描预览，第二步勾选删除（支持全选）
const OrphanImages: FC = () => {
  const orphanImages = useSystemMaintenanceStore(s => s.orphanImages)
  const scanning = useSystemMaintenanceStore(s => s.scanning)
  const deleting = useSystemMaintenanceStore(s => s.deleting)
  const scanOrphanImages = useSystemMaintenanceStore(s => s.scanOrphanImages)
  const deleteOrphanImages = useSystemMaintenanceStore(s => s.deleteOrphanImages)

  const [selected, setSelected] = useState<string[]>([])

  const allChecked = useMemo(() => {
    return orphanImages.length > 0 && selected.length === orphanImages.length
  }, [orphanImages, selected])

  const onToggleAll = (checked: boolean) => {
    setSelected(checked ? orphanImages.slice() : [])
  }

  const onToggleOne = (filename: string, checked: boolean) => {
    setSelected(prev => (checked ? [...prev, filename] : prev.filter(f => f !== filename)))
  }

  const handleDelete = async () => {
    if (selected.length === 0) {
      message.warning('请先选择要删除的图片')
      return
    }
    const result = await deleteOrphanImages(selected)
    if (!result) return
    const { deleted, failed } = result
    if (deleted.length > 0) message.success(`已删除 ${deleted.length} 张图片`)
    if (failed.length > 0) message.error(`有 ${failed.length} 张删除失败`)
    setSelected([])
  }

  return (
    <div className="w-full max-w-6xl">
      {/* 可展开的说明信息 */}
      <Collapse
        ghost
        size="small"
        className="mb-4"
        items={[
          {
            key: '1',
            label: (
              <span className="flex items-center gap-2 text-blue-600">
                <QuestionCircleOutlined />
                什么是孤立图片？为什么要清除？
              </span>
            ),
            children: (
              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="mb-2 font-medium">什么是孤立图片？</p>
                  <p className="mb-2">
                    孤立图片是指存储在服务器上但数据库中没有任何记录引用的图片文件。这些图片通常是由于以下原因产生的：
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1">
                    <li>上传后未成功保存到数据库</li>
                    <li>数据库记录被删除但文件未清理</li>
                    <li>系统异常导致的数据不一致</li>
                    <li>手动删除数据时遗漏了文件清理</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium">为什么要清除孤立图片？</p>
                  <ul className="ml-4 list-inside list-disc space-y-1">
                    <li>释放服务器存储空间</li>
                    <li>避免存储资源浪费</li>
                    <li>保持系统数据一致性</li>
                    <li>提高系统性能</li>
                  </ul>
                </div>
              </div>
            )
          }
        ]}
      />

      <div className="mb-4 flex items-center justify-between">
        <div></div>
        <Space>
          <Button
            loading={scanning}
            onClick={async () => {
              setSelected([])
              const result = await scanOrphanImages()
              if (result.success) {
                message.success(result.message)
              } else {
                message.error(result.message)
              }
            }}
          >
            扫描孤立图片
          </Button>
          <Button
            type="primary"
            danger
            disabled={selected.length === 0}
            loading={deleting}
            onClick={handleDelete}
          >
            删除所选
          </Button>
        </Space>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-3">
          <Checkbox
            checked={allChecked}
            onChange={e => onToggleAll(e.target.checked)}
          >
            全选
          </Checkbox>
          <span>共发现 {orphanImages.length} 张可能的孤立图片</span>
        </div>
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={orphanImages}
          locale={{ emptyText: '请点击上方按钮扫描孤立图片' }}
          renderItem={filename => (
            <List.Item key={filename}>
              <div className="flex flex-col items-center gap-2">
                <Image
                  width={180}
                  src={buildFullImageUrl(filename)}
                  alt={filename}
                />
                <Checkbox
                  checked={selected.includes(filename)}
                  onChange={e => onToggleOne(filename, e.target.checked)}
                >
                  {filename}
                </Checkbox>
              </div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

export const Component = OrphanImages
