import { Button, Card, Col, Collapse, Form, InputNumber, message, Row, Skeleton } from 'antd'
import React, { useEffect } from 'react'
import type {
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem,
  UpdateIndicatorWeightItemDto
} from 'urbanization-backend/types/dto'

import useIndicatorStore from '@/stores/indicatorStore'

const { Panel } = Collapse

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}

type IndicatorItem = TopIndicatorItem | SecondaryIndicatorItem | DetailedIndicatorItem

/**
 * 权重管理页面
 * 整体UI和UE参考数据管理编辑页面
 */
export const Component: React.FC = () => {
  // 根据用户偏好，不使用解构赋值，逐个获取store中的状态和方法
  const indicatorHierarchy = useIndicatorStore(state => state.indicatorHierarchy)
  const loading = useIndicatorStore(state => state.loading)
  const updateWeightsLoading = useIndicatorStore(state => state.updateWeightsLoading)
  const getIndicatorHierarchy = useIndicatorStore(state => state.getIndicatorHierarchy)
  const setIndicatorHierarchy = useIndicatorStore(state => state.setIndicatorHierarchy)
  const updateIndicatorWeights = useIndicatorStore(state => state.updateIndicatorWeights)

  useEffect(() => {
    getIndicatorHierarchy()
  }, [])

  const findAndUpdateWeight = (
    items: IndicatorItem[],
    targetId: string,
    targetLevel: string,
    newWeight: number
  ): boolean => {
    for (const item of items) {
      let currentLevel: 'top' | 'secondary' | 'detailed' | null = null
      if ('secondaryIndicators' in item) currentLevel = 'top'
      else if ('detailedIndicators' in item) currentLevel = 'secondary'
      else if ('unit' in item) currentLevel = 'detailed'

      if (item.id === targetId && currentLevel === targetLevel) {
        item.weight = newWeight
        return true
      }

      if (currentLevel === 'top' && (item as TopIndicatorItem).secondaryIndicators) {
        if (
          findAndUpdateWeight(
            (item as TopIndicatorItem).secondaryIndicators,
            targetId,
            targetLevel,
            newWeight
          )
        )
          return true
      } else if (
        currentLevel === 'secondary' &&
        (item as SecondaryIndicatorItem).detailedIndicators
      ) {
        if (
          findAndUpdateWeight(
            (item as SecondaryIndicatorItem).detailedIndicators,
            targetId,
            targetLevel,
            newWeight
          )
        )
          return true
      }
    }
    return false
  }

  const handleWeightChange = (
    id: string,
    level: 'top' | 'secondary' | 'detailed',
    newWeight: number | null
  ) => {
    if (newWeight === null) return
    const nextState = deepClone(indicatorHierarchy)
    findAndUpdateWeight(nextState, id, level, newWeight)
    setIndicatorHierarchy(nextState)
  }

  const renderPanelExtra = (item: IndicatorItem, level: 'top' | 'secondary' | 'detailed') => (
    <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <Form.Item
        label="权重"
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          min={0}
          max={1}
          step={0.001}
          value={item.weight}
          onChange={value => handleWeightChange(item.id, level, value)}
        />
      </Form.Item>
    </div>
  )

  // 计算权重和的工具函数
  const calcSum = (arr: { weight: number }[]) =>
    arr.reduce((sum, item) => sum + (item.weight || 0), 0)

  // 校验所有权重和是否为1，返回不合规的父节点信息
  const validateAllSums = () => {
    const errors: string[] = []
    // 一级
    const topSum = calcSum(indicatorHierarchy)
    if (Math.abs(topSum - 1) > 1e-6) {
      errors.push(`一级指标权重和为 ${topSum.toFixed(3)}，应为1`)
    }
    // 二级
    indicatorHierarchy.forEach(top => {
      const secSum = calcSum(top.secondaryIndicators)
      if (Math.abs(secSum - 1) > 1e-6) {
        errors.push(`【${top.cnName}】下二级指标权重和为 ${secSum.toFixed(3)}，应为1`)
      }
      // 三级
      top.secondaryIndicators.forEach(sec => {
        const detSum = calcSum(sec.detailedIndicators)
        if (Math.abs(detSum - 1) > 1e-6) {
          errors.push(
            `【${top.cnName} > ${sec.cnName}】下三级指标权重和为 ${detSum.toFixed(3)}，应为1`
          )
        }
      })
    })
    return errors
  }

  // 权重和展示组件
  const renderSum = (sum: number) => (
    <span
      style={{ color: Math.abs(sum - 1) > 1e-6 ? 'red' : 'green', fontWeight: 500, marginLeft: 8 }}
    >
      权重和：{sum.toFixed(3)}
    </span>
  )

  const handleSave = async () => {
    const errors = validateAllSums()
    if (errors.length > 0) {
      message.error({
        content: (
          <div>
            {errors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </div>
        ),
        duration: 4
      })
      return
    }
    const weightsToUpdate: UpdateIndicatorWeightItemDto[] = []
    indicatorHierarchy.forEach(top => {
      weightsToUpdate.push({ id: top.id, level: 'top', weight: top.weight })
      top.secondaryIndicators.forEach(sec => {
        weightsToUpdate.push({ id: sec.id, level: 'secondary', weight: sec.weight })
        sec.detailedIndicators.forEach(det => {
          weightsToUpdate.push({ id: det.id, level: 'detailed', weight: det.weight })
        })
      })
    })
    const success = await updateIndicatorWeights({ weights: weightsToUpdate })
    if (success) {
      message.success('权重更新成功')
      getIndicatorHierarchy()
    } else {
      message.error('权重更新失败，请稍后重试')
    }
  }

  // 骨架屏UI
  const renderSkeleton = () => (
    <>
      <Skeleton.Input
        active
        style={{ width: '200px', marginBottom: '20px' }}
      />
      <Skeleton
        active
        paragraph={{ rows: 2 }}
      />
      <Skeleton
        active
        paragraph={{ rows: 2 }}
        style={{ marginTop: 20 }}
      />
      <Skeleton
        active
        paragraph={{ rows: 2 }}
        style={{ marginTop: 20 }}
      />
    </>
  )

  return (
    <Card
      extra={
        <Button
          type="primary"
          onClick={handleSave}
          loading={updateWeightsLoading}
        >
          保存
        </Button>
      }
      className="w-full max-w-7xl"
    >
      {loading ? (
        renderSkeleton()
      ) : (
        <Collapse
          defaultActiveKey={indicatorHierarchy.map(i => i.id)}
          style={{ marginBottom: '20px' }}
        >
          {/* 一级权重和 */}
          <div style={{ margin: '8px 0 8px 16px', fontSize: 16 }}>
            {renderSum(calcSum(indicatorHierarchy))}
          </div>
          {indicatorHierarchy.map(top => (
            <Panel
              header={
                <span>
                  {top.cnName}
                  {/* 二级权重和 */}
                  {renderSum(calcSum(top.secondaryIndicators))}
                </span>
              }
              key={top.id}
              extra={renderPanelExtra(top, 'top')}
            >
              <Collapse defaultActiveKey={top.secondaryIndicators.map(s => s.id)}>
                {top.secondaryIndicators.map(sec => (
                  <Panel
                    header={
                      <span>
                        {sec.cnName}
                        {/* 三级权重和 */}
                        {renderSum(calcSum(sec.detailedIndicators))}
                      </span>
                    }
                    key={sec.id}
                    extra={renderPanelExtra(sec, 'secondary')}
                  >
                    <Row gutter={[16, 16]}>
                      {sec.detailedIndicators.map(det => (
                        <Col
                          xs={24}
                          sm={12}
                          md={8}
                          key={det.id}
                        >
                          <Card
                            title={det.cnName}
                            size="small"
                            headStyle={{ textAlign: 'center' }}
                          >
                            {renderPanelExtra(det, 'detailed')}
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Panel>
                ))}
              </Collapse>
            </Panel>
          ))}
        </Collapse>
      )}
    </Card>
  )
}
