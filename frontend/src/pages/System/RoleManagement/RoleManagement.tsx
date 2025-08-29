import { PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag
} from 'antd'
import React, { useEffect, useState } from 'react'

import { getMenuOptionsForRoleEdit } from '../../../router/routesConfig'
import { useRoleStore } from '../../../stores/roleStore'
import { RoleListItemDto } from '../../../types'

// 角色管理页面
const RoleManagement: React.FC = () => {
  const roleList = useRoleStore(s => s.roleList)
  const loading = useRoleStore(s => s.loading)
  const fetchRoleList = useRoleStore(s => s.fetchRoleList)
  const createRole = useRoleStore(s => s.createRole)
  const updateRole = useRoleStore(s => s.updateRole)
  const deleteRole = useRoleStore(s => s.deleteRole)
  const assignRoleRoutes = useRoleStore(s => s.assignRoleRoutes)

  const [modalOpen, setModalOpen] = useState(false)
  const [editRole, setEditRole] = useState<RoleListItemDto | null>(null)
  const [form] = Form.useForm()
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignRole, setAssignRole] = useState<RoleListItemDto | null>(null)
  const [assignForm] = Form.useForm()

  useEffect(() => {
    fetchRoleList()
  }, [fetchRoleList])

  // 打开新建/编辑弹窗
  const openModal = (role?: RoleListItemDto) => {
    setEditRole(role || null)
    setModalOpen(true)
    if (role) {
      form.setFieldsValue({ ...role })
    } else {
      form.resetFields()
    }
  }

  // 提交新建/编辑
  const handleOk = async () => {
    const values = await form.validateFields()
    if (editRole) {
      await updateRole({ ...values, id: editRole.id })
    } else {
      await createRole(values)
    }
    setModalOpen(false)
  }

  // 打开分配权限弹窗
  const openAssignModal = (role: RoleListItemDto) => {
    setAssignRole(role)
    setAssignModalOpen(true)
    assignForm.setFieldsValue({ allowedRoutes: role.allowedRoutes })
  }

  // 提交分配权限
  const handleAssignOk = async () => {
    const values = await assignForm.validateFields()
    if (assignRole) {
      await assignRoleRoutes({ id: assignRole.id, allowedRoutes: values.allowedRoutes })
    }
    setAssignModalOpen(false)
  }

  // 菜单分组选项（父级不可选）
  const menuOptions = getMenuOptionsForRoleEdit()

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (v === 'admin' ? <Tag color="red">超级管理员</Tag> : v)
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '用户数', dataIndex: 'userCount', key: 'userCount' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RoleListItemDto) => (
        <Space>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => openAssignModal(record)}
            disabled={record.name === 'admin'}
          >
            分配权限
          </Button>
          <Button
            onClick={() => openModal(record)}
            disabled={record.name === 'admin'}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该角色？"
            description={
              <span>
                此操作不可恢复，请谨慎操作。
                <br />
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  将被删除：角色 {record.name}
                </span>
              </span>
            }
            onConfirm={() => deleteRole({ id: record.id })}
            disabled={record.name === 'admin'}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              disabled={record.name === 'admin'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold"></h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新建角色
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roleList}
          pagination={false}
        />
      </Spin>
      {/* 新建/编辑角色弹窗 */}
      <Modal
        title={editRole ? '编辑角色' : '新建角色'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '', description: '' }}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
            extra="admin为系统保留角色名，不可新建/编辑"
          >
            <Input
              disabled={editRole?.name === 'admin'}
              maxLength={20}
              placeholder="请输入角色名称"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input
              maxLength={50}
              placeholder="请输入描述"
            />
          </Form.Item>
        </Form>
      </Modal>
      {/* 分配权限弹窗 */}
      <Modal
        title="分配菜单权限"
        open={assignModalOpen}
        onOk={handleAssignOk}
        onCancel={() => setAssignModalOpen(false)}
        destroyOnHidden
      >
        {/* 说明提示：系统管理菜单为超级管理员默认权限，不允许分配 */}
        <Alert
          message="提示"
          description="系统管理 菜单为超级管理员默认权限，不支持分配。"
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <Form
          form={assignForm}
          layout="vertical"
        >
          <Form.Item
            name="allowedRoutes"
            label="可访问菜单"
            rules={[{ required: true, message: '请选择菜单权限' }]}
          >
            <Select
              mode="multiple"
              options={menuOptions}
              optionFilterProp="label"
              showSearch
              maxTagCount={6}
              placeholder="请选择可访问菜单"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RoleManagement
