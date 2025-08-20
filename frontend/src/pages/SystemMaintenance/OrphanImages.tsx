import { Button, Card, Checkbox, Image, List, message, Space } from 'antd'
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
      <div className="mb-4 flex items-center justify-between">
        <div></div>
        <Space>
          <Button
            loading={scanning}
            onClick={async () => {
              setSelected([])
              await scanOrphanImages()
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
