import { CheckCircleFilled, InboxOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  DatePicker,
  Form,
  message,
  Modal,
  Space,
  Steps,
  Table,
  Tag,
  Upload
} from 'antd'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'

import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useDataManagementStore from '@/stores/dataManagementStore'
import useIndicatorStore from '@/stores/indicatorStore'

const { Dragger } = Upload

/**
 * @description 定义 Excel 预览表格中单行数据的结构。
 * - key: 表格行唯一的 key，通常使用 countryId。
 * - countryId: 国家的唯一标识符。
 * - countryName: 国家的中/英文名称。
 * - isExisting: 标记该国家在选定年份是否已有数据。
 * - [indicatorId: string]: 动态属性，键是三级指标的 ID，值是对应的指标数值。
 */
type PreviewRow = {
  key: string
  countryId: string
  countryName: string
  isExisting: boolean
  // 其他属性是动态的指标ID
  [indicatorId: string]: string | number | boolean
}

/**
 * @description 数据导入页面组件，负责处理 Excel 文件的上传、解析、预览和最终导入。
 * 页面流程分为三个步骤：
 * 1. 选择年份并上传文件。
 * 2. 预览从 Excel 文件中解析出的数据，并高亮显示已存在的数据。
 * 3. 提交数据进行导入，并显示导入结果。
 */
const DataImportPage = () => {
  const navigate = useNavigate()

  // --- 从 Zustand stores 中获取全局状态和方法 ---
  // 所有国家的基础信息列表，用于匹配 Excel 中的国家名称
  const countries = useCountryAndContinentStore(state => state.countries)
  // 指标的层级结构，用于解析 Excel 列并生成预览表格
  const indicatorHierarchy = useIndicatorStore(state => state.indicatorHierarchy)
  // 检查指定国家和年份的数据是否已存在的方法
  const checkDataManagementExistingData = useDataManagementStore(
    state => state.checkDataManagementExistingData
  )
  // 批量检查多个国家和年份的数据是否已存在的方法
  const batchCheckDataManagementExistingData = useDataManagementStore(
    state => state.batchCheckDataManagementExistingData
  )
  // 批量保存国家数据（包含所有指标）的方法
  const batchSaveDataManagementDetail = useDataManagementStore(
    state => state.batchSaveDataManagementDetail
  )

  /**
   * @description 从指标层级结构中提取并展平所有三级指标。
   * 使用 useMemo 进行性能优化，仅在 indicatorHierarchy 变化时重新计算。
   * 这个列表的顺序与 Excel 文件中的指标列顺序严格对应。
   */
  const tertiaryIndicators = useMemo(() => {
    if (!indicatorHierarchy) return []
    return indicatorHierarchy.flatMap(top =>
      top.secondaryIndicators.flatMap(sec => sec.detailedIndicators)
    )
  }, [indicatorHierarchy])

  // --- 组件内部状态管理 ---
  // 当前所处的步骤，0: 上传, 1: 预览, 2: 完成
  const [currentStep, setCurrentStep] = useState(0)
  // 用户选择的数据年份
  const [importYear, setImportYear] = useState<number | null>(null)
  // 解析后用于预览的表格数据
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  // 当前上传的文件对象
  const [file, setFile] = useState<UploadFile | null>(null)
  // 标记是否正在解析 Excel 文件，用于显示加载状态
  const [isParsing, setIsParsing] = useState(false)
  // 标记是否正在向后端提交数据，用于显示加载状态
  const [isImporting, setIsImporting] = useState(false)
  // 存储最终的导入结果，包括成功、失败计数和失败的国家列表
  const [importResult, setImportResult] = useState<{
    successCount: number
    failCount: number
    failedCountries: string[]
  } | null>(null)

  /**
   * @description 动态生成预览表格的列配置。
   * 使用 useMemo 进行性能优化，仅在三级指标列表变化时重新计算。
   * - 第一列固定为“国家名称”，并提供特殊渲染逻辑以显示“已存在”标签。
   * - 后续列根据三级指标列表动态生成，列头为指标的中文名称。
   */
  const previewColumns = useMemo(() => {
    if (tertiaryIndicators.length === 0) return []

    // 固定国家列
    const countryColumn = {
      title: '国家名称',
      dataIndex: 'countryName',
      key: 'countryName',
      width: 150,
      fixed: 'left',
      render: (text: string, record: PreviewRow) => (
        <div className="flex items-center">
          <div className="flex flex-col">
            <span className="mb-1">{text}</span>
            {record.isExisting && (
              <Tag
                color="warning"
                className="ml-2"
              >
                已存在
              </Tag>
            )}
          </div>
        </div>
      )
    }

    // 根据三级指标动态生成数据列
    const indicatorColumns = tertiaryIndicators.map(indicator => ({
      title: indicator.cnName,
      dataIndex: indicator.id,
      key: indicator.id,
      width: 120
    }))

    return [countryColumn, ...indicatorColumns]
  }, [tertiaryIndicators])

  /**
   * @description 处理重新上传操作，重置所有相关状态，返回到第一步。
   */
  const handleReUpload = () => {
    setFile(null)
    setPreviewData([])
    setCurrentStep(0)
    setImportResult(null)
    setImportYear(null) // 重置年份选择
  }

  /**
   * @description antd Upload 组件的 `beforeUpload` 钩子函数。
   * 在这里执行核心的 Excel 解析和数据转换逻辑。
   * @param file - 用户选择的 Excel 文件。
   * @returns {false} - 始终返回 false 来阻止 antd 的自动上传行为，改为手动处理。
   */
  const handleBeforeUpload = (file: RcFile) => {
    // 前置校验：必须先选择年份
    if (!importYear) {
      message.error('请先选择数据对应的年份！')
      return false
    }

    setFile(file)
    setIsParsing(true)
    message.loading({ content: '正在解析 Excel 文件...', key: 'parsing' })

    const reader = new FileReader()
    /**
     * @description 设置 FileReader 的 onload 事件回调。
     * 当文件被成功读取到内存后，此函数将被触发。
     * @param event The progress event, where `event.target.result` contains the file's data as an ArrayBuffer.
     */
    reader.onload = async event => {
      try {
        // 1. 读取文件内容并使用 xlsx 库解析
        // event.target.result 包含了文件的 ArrayBuffer 格式数据
        const data = event.target?.result
        // 使用 XLSX.read 解析 ArrayBuffer 数据，生成工作簿对象
        const workbook = XLSX.read(data, { type: 'array' })
        // 获取第一个工作表的名称
        const sheetName = workbook.SheetNames[0]
        // 获取第一个工作表对象
        const worksheet = workbook.Sheets[sheetName]
        // 将工作表内容转换为 JSON 数组格式，`header: 1` 表示将每行转为一个数组
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // 2. 数据处理与转换，准备用于预览
        const processedData: PreviewRow[] = []
        const unmatchedCountries: string[] = []
        const matchedCountries: { countryId: string; countryName: string; rowData: any[] }[] = []

        // 第一步：匹配国家并收集匹配的国家信息和行数据
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          // 获取当前行的第一个单元格（国家名称），并去除首尾空格
          const countryNameFromExcel = row[0]?.toString().trim()

          // 如果国家名称为空，则视为空行并跳过
          if (!countryNameFromExcel) continue

          // 匹配国家
          // 根据 Excel 中的国家名称进行不区分大小写的匹配
          const countryNameFromExcelLower = countryNameFromExcel.toLowerCase()
          const countryMatch = countries.find(
            c =>
              c.cnName.toLowerCase() === countryNameFromExcelLower ||
              (c.enName && c.enName.toLowerCase() === countryNameFromExcelLower)
          )

          // 如果在系统中找到了对应的国家
          if (countryMatch) {
            matchedCountries.push({
              countryId: countryMatch.id,
              countryName: countryMatch.cnName,
              rowData: row
            })
          } else {
            unmatchedCountries.push(countryNameFromExcel)
          }
        }

        // 第二步：批量检查已存在的指标数据
        let existingDataMap: Map<string, boolean> = new Map()
        if (matchedCountries.length > 0) {
          try {
            const batchCheckResult = await batchCheckDataManagementExistingData({
              year: dayjs(importYear!.toString()).month(5).date(1).toDate(),
              countryIds: matchedCountries.map(c => c.countryId)
            })

            // 将已存在的国家ID转换为Map，方便快速查找
            existingDataMap = new Map(
              batchCheckResult.existingCountries.map(countryId => [countryId, true])
            )
          } catch (error) {
            console.error('批量检查指标数据失败:', error)
            // 如果批量检查失败，回退到单个检查
            for (const country of matchedCountries) {
              const isExisting = await checkDataManagementExistingData({
                countryId: country.countryId,
                year: dayjs(importYear!.toString()).month(5).date(1).toDate()
              })
              existingDataMap.set(country.countryId, isExisting.exists)
            }
          }
        }

        // 第三步：构建预览数据
        for (const matchedCountry of matchedCountries) {
          // 构建预览表格行数据的基础结构
          const rowData: PreviewRow = {
            key: matchedCountry.countryId,
            countryId: matchedCountry.countryId,
            countryName: matchedCountry.countryName,
            isExisting: existingDataMap.get(matchedCountry.countryId) || false
          }

          // 依次读取所有指标值
          // 遍历预定义的69个三级指标，并从行数据中按顺序提取对应的值
          // 将无效或非数字的值转换为空字符串，以便在预览中显示为空白
          tertiaryIndicators.forEach((indicator, index) => {
            // `index + 1` 是因为第0列是国家名称
            const rawValue = matchedCountry.rowData[index + 1]
            // 清洗数据：移除千位分隔符(,)，并将 null/undefined 转为空字符串
            const cleanedValue = String(rawValue || '').replace(/,/g, '')
            const parsedValue = parseFloat(cleanedValue)
            rowData[indicator.id] = isNaN(parsedValue) ? '' : parsedValue
          })
          // 将处理好的行数据添加到最终结果中
          processedData.push(rowData)
        }

        if (unmatchedCountries.length > 0) {
          Modal.warning({
            title: '部分国家未匹配',
            content: (
              <div>
                <p>以下国家在系统中未找到匹配项，这些行将被忽略：</p>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {unmatchedCountries.map((name, index) => (
                    <Tag
                      color="error"
                      key={index}
                      className="m-1"
                    >
                      {name}
                    </Tag>
                  ))}
                </div>
              </div>
            ),
            okText: '知道了'
          })
        }

        // 如果循环结束后没有解析出任何有效数据，则提示错误并中断流程
        if (processedData.length === 0) {
          message.error('无法从文件中解析出有效的国家数据，请检查文件内容和格式。')
          handleReUpload()
          return
        }

        // 6. 更新状态，进入预览步骤
        // 将处理好的数据存入 state，并切换到步骤 1（数据预览）
        setPreviewData(processedData)
        setCurrentStep(1)
        message.success({ content: '文件解析成功！', key: 'parsing' })
      } catch (error) {
        // 捕获解析过程中可能发生的任何错误
        console.error('Excel parsing error:', error)
        message.error('解析失败，请确保文件格式正确。')
      } finally {
        // 无论成功或失败，都结束“正在解析”的加载状态
        setIsParsing(false)
      }
    }

    /**
     * @description 设置 FileReader 的 onerror 事件回调。
     * 当文件读取过程中发生错误时，此函数将被触发。
     */
    reader.onerror = () => {
      message.error('文件读取失败，请重试。')
      setIsParsing(false)
    }

    // 启动 FileReader 的读取过程。
    // readAsArrayBuffer 方法会异步地将文件内容读取为 ArrayBuffer。
    // 读取完成后，会触发上面定义的 onload 或 onerror 事件。
    reader.readAsArrayBuffer(file)

    // 阻止 antd 的默认上传行为，因为我们已经手动处理了文件读取
    return false
  }

  /**
   * @description 处理确认导入操作。
   * 将预览数据组装成后端需要的格式，并通过批量接口一次性提交所有数据。
   * 最终汇总导入结果，并导航到结果展示页面。
   */
  const handleImport = async () => {
    // 步骤 1: 验证数据量，防止请求体过大
    if (previewData.length > 500) {
      message.error(
        `数据量过大，最多支持500个国家，当前为${previewData.length}个。请分批导入或减少数据量。`
      )
      return
    }

    // 步骤 2: 设置加载状态，并显示全局加载提示
    setIsImporting(true)
    message.loading({ content: '正在提交数据，请稍候...', key: 'importing' })

    try {
      // 步骤 2: 构造批量导入的负载数据
      const countriesPayload = previewData.map(row => {
        // 2a. 构造指标负载(payload)
        // 遍历所有三级指标，从当前行数据中提取对应的值
        const indicatorsPayload = tertiaryIndicators.map(indicator => {
          const rawValue = row[indicator.id]
          // 清洗数据：移除千位分隔符(,)，并将 null/undefined 转为空字符串
          const cleanedValue = String(rawValue || '').replace(/,/g, '')
          // 再次将值解析为浮点数。对于在预览步骤中设置的空字符串''，`parseFloat('')` 会返回 NaN。
          const parsedValue = parseFloat(cleanedValue)
          return {
            detailedIndicatorId: indicator.id,
            // 如果解析结果是 NaN (例如，空字符串或无效字符)，则将值设为 null，否则使用解析后的数值。
            // 这是为了确保发送给后端的数据格式正确。
            value: isNaN(parsedValue) ? null : parsedValue
          }
        })

        // 2b. 返回单个国家的数据
        return {
          countryId: row.countryId,
          indicators: indicatorsPayload
        }
      })

      // 步骤 3: 构造批量导入的完整负载
      const batchPayload = {
        year: dayjs(importYear!.toString()).month(5).date(1).toDate(),
        countries: countriesPayload
      }

      // 步骤 4: 调用批量保存接口
      const result = await batchSaveDataManagementDetail(batchPayload)

      // 步骤 5: 处理导入结果
      const finalResult = {
        successCount: result.successCount,
        failCount: result.failCount,
        failedCountries: result.failedCountries
      }

      // 步骤 6: 更新组件状态，显示最终结果
      setImportResult(finalResult)
      // 显示全局成功提示
      message.success({ content: '数据导入处理完成！', key: 'importing' })
      // 导航到步骤 2（完成导入页面）
      setCurrentStep(2)
    } catch (error) {
      // 步骤 7: 错误处理
      console.error('批量导入失败:', error)
      message.error({ content: '数据导入失败，请重试！', key: 'importing' })

      // 设置失败结果
      setImportResult({
        successCount: 0,
        failCount: previewData.length,
        failedCountries: previewData.map(row => row.countryName)
      })
    } finally {
      // 步骤 8: 关闭加载状态
      setIsImporting(false)
    }
  }

  // --- JSX 渲染逻辑 ---
  return (
    <div className="flex w-full max-w-7xl flex-col rounded-lg p-6 shadow-md">
      <div className="mb-4 text-center">
        <p className="text-gray-500">请按照以下步骤上传、预览并导入您的 Excel 数据文件。</p>
      </div>

      <Steps
        current={currentStep}
        items={[{ title: '选择年份并上传文件' }, { title: '预览数据' }, { title: '完成导入' }]}
        className="mx-auto !mb-4 w-full"
      />

      <div className="mx-auto w-full max-w-6xl overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        {/* 步骤 0: 上传文件 */}
        {currentStep === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full text-center">
              <Form layout="vertical">
                <Form.Item
                  label="第一步：请选择数据对应的年份"
                  required
                  className="mx-auto max-w-xs"
                >
                  <DatePicker
                    picker="year"
                    size="large"
                    className="w-full"
                    value={importYear ? dayjs(importYear.toString()) : null}
                    onChange={date => setImportYear(date ? dayjs(date).year() : null)}
                    disabledDate={current => current && current > dayjs().endOf('day')}
                  />
                </Form.Item>
              </Form>

              <Dragger
                name="file"
                fileList={file ? [file] : []}
                maxCount={1}
                accept=".xlsx, .xls"
                beforeUpload={handleBeforeUpload}
                onRemove={() => {
                  handleReUpload()
                  return true
                }}
                disabled={!importYear || isParsing}
                className="mt-4"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">第二步：点击或拖拽文件到此区域进行上传</p>
                <p className="ant-upload-hint">请上传格式正确的 Excel 文件（.xlsx, .xls）。</p>
              </Dragger>
            </div>
          </div>
        )}

        {/* 步骤 1: 预览数据 */}
        {currentStep === 1 && (
          <div>
            <div className="mb-4 text-xl font-semibold">数据预览</div>
            <p className="mb-4 text-gray-500">
              已为年份 <strong className="text-blue-600">{importYear}</strong> 解析文件{' '}
              <span className="font-medium text-blue-600">{file?.name}</span>
              。请检查以下数据，<Tag color="warning">已存在</Tag>
              标记的数据将在导入后被覆盖。
            </p>
            <Space className="mb-2 flex w-full justify-end">
              <Button onClick={handleReUpload}>重新上传</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={isImporting}
                disabled={isImporting}
              >
                {isImporting ? '正在导入...' : '确认并导入'}
              </Button>
            </Space>
            <Table
              columns={previewColumns}
              dataSource={previewData}
              bordered
              loading={isParsing}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </div>
        )}

        {/* 步骤 2: 完成导入 */}
        {currentStep === 2 && (
          <div className="flex h-full items-center justify-center">
            <div className="p-12 text-center">
              <CheckCircleFilled className="mb-4 text-6xl text-green-500" />
              <h2 className="mb-4 text-2xl font-semibold text-gray-800">导入处理完成</h2>
              {importResult && (
                <Alert
                  type={importResult.failCount > 0 ? 'warning' : 'success'}
                  message={
                    <div className="text-left">
                      <p>
                        成功导入: <strong>{importResult.successCount}</strong> 条国家数据
                      </p>
                      <p>
                        导入失败: <strong>{importResult.failCount}</strong> 条国家数据
                      </p>
                      {importResult.failCount > 0 && (
                        <>
                          <p className="mt-2">
                            <strong>失败的国家列表:</strong>
                          </p>
                          <div className="max-h-24 overflow-y-auto">
                            {importResult.failedCountries.map(name => (
                              <Tag
                                color="error"
                                key={name}
                                className="m-1"
                              >
                                {name}
                              </Tag>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  }
                  className="!mb-4"
                />
              )}
              <Space className="flex justify-center">
                <Button
                  size="large"
                  onClick={handleReUpload}
                >
                  重新上传
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/dataManagement/list')}
                >
                  返回数据列表
                </Button>
              </Space>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const Component = DataImportPage
