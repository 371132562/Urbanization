import { Card, Descriptions, Divider, Skeleton, Typography } from 'antd'
import { FC, useEffect, useMemo } from 'react'
import { useParams } from 'react-router'

import useScoreStore from '@/stores/scoreStore'

const { Title, Paragraph, Text } = Typography

const ComprehensiveEvaluationDetail: FC = () => {
  const { countryId, year } = useParams<{ countryId: string; year: string }>()

  // 从Zustand store中获取数据和方法
  const {
    detailData,
    getScoreDetail,
    detailLoading,
    evaluations,
    getEvaluations,
    evaluationsLoading
  } = useScoreStore()

  // 组件加载时，获取评分详情和评价规则
  useEffect(() => {
    if (countryId && year) {
      getScoreDetail({ countryId, year: new Date(parseInt(year), 0, 1) })
    }
    getEvaluations()
  }, [countryId, year, getScoreDetail, getEvaluations])

  // 根据总分匹配评价文案
  const evaluationText = useMemo(() => {
    if (
      !detailData ||
      !evaluations ||
      evaluations.length === 0 ||
      detailData.totalScore === undefined
    ) {
      return '暂无评价'
    }
    const score = detailData.totalScore
    const matchedRule = evaluations.find(
      rule => score >= rule.minScore && score <= rule.maxScore
    )
    return matchedRule ? matchedRule.evaluationText : '未匹配到评价标准'
  }, [detailData, evaluations])

  // 加载状态判断
  const isLoading = detailLoading || evaluationsLoading

  return (
    <div className="w-full max-w-xl">
      <Card
        className="mx-auto shadow-lg"
      >
        {isLoading ? (
          <Skeleton
            active
            avatar
            paragraph={{ rows: 6 }}
          />
        ) : detailData && 'country' in detailData ? (
          <div className="p-4">
            <Title
              level={2}
              className="text-center !mb-2"
            >
              {detailData.country?.cnName}
            </Title>
            <Text
              type="secondary"
              className="block text-center mb-6"
            >
              {year} 年度综合评价报告
            </Text>

            <Descriptions
              bordered
              column={1}
              size="middle"
              labelStyle={{
                fontWeight: 'bold',
                width: '200px',
                backgroundColor: '#fafafa'
              }}
            >
              <Descriptions.Item label="综合评价评分">{detailData.totalScore}</Descriptions.Item>
              <Descriptions.Item label="城镇化进程维度评分">
                {detailData.urbanizationProcessDimensionScore}
              </Descriptions.Item>
              <Descriptions.Item label="人性动力维度评分">
                {detailData.humanDynamicsDimensionScore}
              </Descriptions.Item>
              <Descriptions.Item label="物性动力维度评分">
                {detailData.materialDynamicsDimensionScore}
              </Descriptions.Item>
              <Descriptions.Item label="空间动力维度评分">
                {detailData.spatialDynamicsDimensionScore}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={4}>综合评价</Title>
            <Paragraph className="text-base leading-relaxed">{evaluationText}</Paragraph>
          </div>
        ) : (
          <div className="text-center py-10">
            <Text type="secondary">暂无综合评价</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export const Component = ComprehensiveEvaluationDetail
