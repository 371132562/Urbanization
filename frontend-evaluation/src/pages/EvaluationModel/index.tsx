import { Card, Divider, Typography, Space, Tag, Row, Col, Image } from 'antd'
import { FC } from 'react'

// 导入图片
import evaluation1Image from '@/assets/images/evalutation1.png'
import evaluation2Image from '@/assets/images/evalutation2.png'

const { Title, Paragraph, Text } = Typography

const EvaluationModel: FC = () => {
  return (
    <div className="w-full max-w-6xl !space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <Title level={2} className="!mb-2">
          城镇化发展质量综合评价
        </Title>
        <Text type="secondary" className="text-base">
          基于联合国193个会员国的全面分析
        </Text>
      </div>

      {/* 研究对象部分 */}
      <Card title="研究对象" className="shadow-sm">
        <Paragraph className="text-justify leading-relaxed">
          本研究选取联合国193个会员国作为研究对象，这些国家共拥有约79.08亿人口，占全球总人口79.51亿的99.5%。这种广泛的人口覆盖保证了研究能够真实地反映全球城镇化进程，从而为分析提供了具有高度代表性和普遍性的数据基础。
        </Paragraph>
        
        <Paragraph className="text-justify leading-relaxed">
          另外，研究对象的选取基于以下四个核心考虑：
        </Paragraph>

        <Row gutter={[16, 16]} className="mt-4">
          <Col span={12}>
            <Card size="small" className="h-full">
              <Title level={5} className="!mb-2 text-blue-600">
                国家的全面性和代表性
              </Title>
              <Paragraph className="!mb-0 text-sm">
                覆盖几乎所有主权国家，包括各种经济体——从发达国家到发展中国家、从岛屿国家到大陆国家。这种多样性使研究能够全面分析和理解不同类型的城镇化模式及其全球范围内的普遍性和特殊性。
              </Paragraph>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" className="h-full">
              <Title level={5} className="!mb-2 text-green-600">
                数据的可获得性和可比性
              </Title>
              <Paragraph className="!mb-0 text-sm">
                世界银行数据库提供的数据通常高度标准化和一致性，这对跨国比较研究尤为重要。使用世界银行的统计数据确保所用指标在全球范围内具有相同的定义和计量标准，从而提高研究的准确性和可靠性。
              </Paragraph>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" className="h-full">
              <Title level={5} className="!mb-2 text-orange-600">
                政策相关性
              </Title>
              <Paragraph className="!mb-0 text-sm">
                联合国作为全球最大的国际政府间组织，其会员国普遍认同并参与联合国的发展议程。研究这些国家的城镇化发展，可以为国际发展政策和实践提供直接的见解，为全球城镇化政策的制定和实施提供科学依据。
              </Paragraph>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" className="h-full">
              <Title level={5} className="!mb-2 text-purple-600">
                增强跨国合作
              </Title>
              <Paragraph className="!mb-0 text-sm">
                研究鼓励和促进国际的学术交流和政策对话。这种合作不仅有助于共享最佳实践，还能通过比较分析挖掘不同国家在应对城镇化挑战时的创新解决方案。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 样本划分部分 */}
      <Card title="样本划分策略" className="shadow-sm">
        <Paragraph className="text-justify leading-relaxed">
          本书根据研究目标和所需深度，将研究对象划分为全样本和重点样本两级，通过分析较大人口规模和经济复杂度高国家的城镇化路径和模式，深入探究城镇化对国家发展策略的影响。
        </Paragraph>

        <Row gutter={[24, 16]} className="mt-6">
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <Tag color="blue">全样本</Tag>
                  <span>指标变化评价</span>
                </Space>
              }
              className="h-full"
            >
              <Paragraph className="text-justify leading-relaxed">
                全样本包括联合国193个会员国，旨在捕捉全球城镇化的宏观趋势和普遍规律；综合分析城镇化进程、人性动力、物性动力和空间动力这四个关键维度的指标变化。
              </Paragraph>
              <Paragraph className="text-justify leading-relaxed">
                研究利用统计分析和地理空间分析工具，对城镇化进程中的人性动力、物性动力和空间动力的指标进行了动态跟踪和交叉比较，识别推动或阻碍城镇化发展的关键因素。
              </Paragraph>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <Tag color="green">重点样本</Tag>
                  <span>综合权重评价</span>
                </Space>
              }
              className="h-full"
            >
              <Paragraph className="text-justify leading-relaxed">
                重点样本聚焦于人口超过一千万的92个国家，其国家的城镇化经济发展更为复杂和多元，能够提供关于城镇化进程各类动态情况，有效反映全球城镇化的普遍规律。
              </Paragraph>
              <Paragraph className="text-justify leading-relaxed">
                研究利用客观赋权法对这些重点样本的城镇化相关指标进行综合打分。这不仅便于比较不同国家之间的城镇化发展质量，还能深入探索影响城镇化进程的关键因素。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 全样本和重点样本空间分布图 */}
      <Card title="全样本和重点样本空间分布" className="shadow-sm">
        <div className="text-center">
          <Image
            src={evaluation1Image}
            alt="全样本和重点样本空间分布图"
            className="max-w-full"
            style={{ maxHeight: '600px' }}
          />
          <Paragraph className="mt-4 text-center text-sm text-gray-600">
            注：浅粉色代表全样本国家，橙色代表重点样本国家。重点样本国家主要为人口超过一千万的国家，具有更复杂的城镇化经济发展特征。
          </Paragraph>
        </div>
      </Card>

      {/* 数据来源部分 */}
      <Card title="数据来源与说明" className="shadow-sm">
        <Space direction="vertical" size="large" className="w-full">
          <div>
            <Title level={5} className="!mb-2 text-blue-600">
              世界银行官方网站
            </Title>
            <Paragraph className="!mb-0 text-justify leading-relaxed">
              世界银行公开数据库（https://data.worldbank.org.cn/）提供的各国人口、城镇化、经济以及劳动力等数据，该数据库每年都会根据实际发展状况经常更新数据库。本书所用数据为2022年数据，数据起止时间为1960—2022年。
            </Paragraph>
          </div>

          <div>
            <Title level={5} className="!mb-2 text-green-600">
              世界劳工组织网站
            </Title>
            <Paragraph className="!mb-0 text-justify leading-relaxed">
              就业结构、收入水平中研究数据选自世界劳工组织网站（https://ilostat.ilo.org/）数据库，数据起止时间为2010—2022年。
            </Paragraph>
          </div>

          <div>
            <Title level={5} className="!mb-2 text-orange-600">
              联合国统计司官方网站
            </Title>
            <Paragraph className="!mb-0 text-justify leading-relaxed">
              联合国M49标准来自联合国统计司官方网站（https://unstats.un.org/），根据国家和地区对世界各个地理区域进行标准化的编码体系。本书中结合研究需要，样本国家的空间划分主要采用五大洲和22个地理亚区。
            </Paragraph>
          </div>

          <div>
            <Title level={5} className="!mb-2 text-purple-600">
              已出版的统计年鉴
            </Title>
            <Paragraph className="!mb-0 text-justify leading-relaxed">
              ①帕尔格雷夫历史统计年鉴。美国、英国、日本、法国、德国五个国家在1960年前的城镇化水平、经济水平等数据摘自《帕尔格雷夫历史统计年鉴》(经济科学出版社第4版)。②其他统计年鉴。其他补充数据来源于《苏联和主要资本主义国家经济历史统计集（1800—1982年)》《主要资本主义国家经济统计集（1848—1960）》。
            </Paragraph>
          </div>
        </Space>
      </Card>

      {/* 评估模型部分 */}
      <Card title="评估模型" className="shadow-sm">
        <Paragraph className="text-justify leading-relaxed">
          该评估模型重点关注92个重点样本国家的城镇化发展质量，确立了价值标准并运用客观赋权法进行了综合评价，研究不仅涵盖了样本国家的综合得分排名，还细致分析了排名靠前样本国家的城镇化发展质量特征，揭示了全球城镇化发展的区域性集中趋势。
        </Paragraph>

        <Divider />

        <Title level={4} className="!mb-4">
          重点样本分类
        </Title>
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <Card size="small" className="text-center">
              <Tag color="red" className="!mb-2 text-base">
                引领型国家
              </Tag>
              <Paragraph className="!mb-0 text-sm">
                美国、中国和德国，展示了各自在全球城镇化发展中的领导地位
              </Paragraph>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <Tag color="orange" className="!mb-2 text-base">
                提升型国家
              </Tag>
              <Paragraph className="!mb-0 text-sm">
                主要为欧洲传统发达国家，展现了持续的城镇化优化和更新
              </Paragraph>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <Tag color="blue" className="!mb-2 text-base">
                发展型国家
              </Tag>
              <Paragraph className="!mb-0 text-sm">
                主要集中在亚洲和美洲，这些国家正经历快速的城镇化过程
              </Paragraph>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <Tag color="gray" className="!mb-2 text-base">
                落后型国家
              </Tag>
              <Paragraph className="!mb-0 text-sm">
                多位于非洲，这些国家的城镇化发展面临诸多挑战
              </Paragraph>
            </Card>
          </Col>
        </Row>

        <Paragraph className="text-justify leading-relaxed">
          进一步地对城镇化进程以及人性动力、物性动力和空间动力四个维度进行了分维度得分评价，包括各维度总体发展水平、动力要素得分评价，以及空间分布特征。特别是对于各维度得分排名前50的国家，深入剖析其在特定领域的表现，精准识别推动或阻碍城镇化发展质量的关键因素。
        </Paragraph>

        <Paragraph className="text-justify leading-relaxed">
          通过对比和分析这些国家的城镇化路径，本章为制定全球城镇化高质量发展战略提供了科学依据和实践参考。构建的综合评价框架不仅深化了对全球城镇化进程的理解，还为政策制定者和研究人员提供了一套实用的分析工具和策略建议，以促进优化和提升城镇化发展质量。
        </Paragraph>
      </Card>

      {/* 多维度评价模型图 */}
      <Card title="多维度评价模型" className="shadow-sm">
        <div className="text-center">
          <Image
            src={evaluation2Image}
            alt="多维度评价模型图"
            className="max-w-full"
            style={{ maxHeight: '500px' }}
          />
          <Paragraph className="mt-4 text-center text-sm text-gray-600">
            注：该模型展示了社会发展维度、经济发展维度和空间发展维度三个核心维度的相互关系，以及各维度下的具体评价要素。
          </Paragraph>
        </div>
      </Card>
    </div>
  )
}

export const Component = EvaluationModel
