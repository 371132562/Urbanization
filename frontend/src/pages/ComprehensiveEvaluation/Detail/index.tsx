import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Divider, Skeleton, Typography } from 'antd'
import { FC, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'

import RichEditor from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { toFullPathContent } from '@/utils'

const { Title, Paragraph, Text } = Typography

const ComprehensiveEvaluationDetail: FC = () => {
  const { countryId, year } = useParams<{ countryId: string; year: string }>()
  const navigate = useNavigate()

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
      getScoreDetail({ countryId, year: parseInt(year) })
    }
    getEvaluations()
  }, [countryId, year, getScoreDetail, getEvaluations])

  // 根据总分匹配评价文案
  const matchedEvaluation = useMemo(() => {
    if (
      !detailData ||
      !evaluations ||
      evaluations.length === 0 ||
      detailData.totalScore === undefined
    ) {
      return null
    }
    const score = detailData.totalScore
    return evaluations.find(rule => score >= rule.minScore && score <= rule.maxScore) || null
  }, [detailData, evaluations])

  // 加载状态判断
  const isLoading = detailLoading || evaluationsLoading

  return (
    <div className="w-full max-w-xl">
      <Card className="mx-auto shadow-lg">
        {isLoading ? (
          <Skeleton
            active
            avatar
            paragraph={{ rows: 6 }}
          />
        ) : detailData && 'country' in detailData ? (
          <div className="relative p-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              返回
            </Button>

            <Title
              level={2}
              className="!mb-2 text-center"
            >
              {detailData.country?.cnName}
            </Title>
            <Text
              type="secondary"
              className="mb-6 block text-center"
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
              <Descriptions.Item label="人口迁徙动力维度评分">
                {detailData.humanDynamicsDimensionScore}
              </Descriptions.Item>
              <Descriptions.Item label="经济发展动力维度评分">
                {detailData.materialDynamicsDimensionScore}
              </Descriptions.Item>
              <Descriptions.Item label="空间发展动力维度评分">
                {detailData.spatialDynamicsDimensionScore}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={4}>综合评价</Title>
            {matchedEvaluation ? (
              <RichEditor
                value={toFullPathContent(matchedEvaluation.evaluationText)}
                readOnly={true}
                height="auto"
              />
            ) : (
              <Paragraph className="text-base leading-relaxed text-gray-500">
                未匹配到评价标准
              </Paragraph>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Text type="secondary">暂无综合评价</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ComprehensiveEvaluationDetail
