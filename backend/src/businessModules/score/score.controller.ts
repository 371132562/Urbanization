import { Body, Controller, Post, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ScoreService } from './score.service';
import {
  BatchCreateScoreDto,
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  ScoreEvaluationItemDto,
  CreateScoreDto,
  ScoreDetailReqDto,
  DeleteScoreDto,
  ScoreListByYearReqDto,
  ScoreListByYearResDto,
  ScoreEvaluationDetailListByYearReqDto,
  ScoreEvaluationDetailListByYearResDto,
  ScoreEvaluationDetailGetReqDto,
  ScoreEvaluationDetailEditResDto,
  UpsertScoreEvaluationDetailDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  ExportDataMultiYearReqDto,
  DeleteScoreEvaluationDetailDto,
} from 'types/dto';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  /**
   * @description 获取有评分数据的年份列表
   */
  @Post('years')
  getYears(): Promise<number[]> {
    return this.scoreService.getYears();
  }

  /**
   * @description 获取指定年份的评分数据（分页、排序、搜索）
   */
  @Post('listByYear')
  listByYear(
    @Body() params: ScoreListByYearReqDto,
  ): Promise<ScoreListByYearResDto> {
    return this.scoreService.listByYear(params);
  }

  /**
   * @description 评价详情（自定义文案）列表：用于“评价详情管理”模块
   * 与“评分详情（ScoreDetail）”不同，此接口仅返回综合分、匹配的评价规则文案和是否有自定义详情的标记
   */
  @Post('listEvaluationDetailByYear')
  listEvaluationDetailByYear(
    @Body() params: ScoreEvaluationDetailListByYearReqDto,
  ): Promise<ScoreEvaluationDetailListByYearResDto> {
    return this.scoreService.listEvaluationDetailByYear(params);
  }

  /**
   * @description 获取评价详情（自定义文案）编辑数据
   */
  @Post('getEvaluationDetail')
  getEvaluationDetail(
    @Body() params: ScoreEvaluationDetailGetReqDto,
  ): Promise<ScoreEvaluationDetailEditResDto | null> {
    return this.scoreService.getEvaluationDetail(params);
  }

  /**
   * @description 保存/更新评价详情（自定义文案）
   */
  @Post('upsertEvaluationDetail')
  upsertEvaluationDetail(
    @Body() dto: UpsertScoreEvaluationDetailDto,
  ): Promise<ScoreEvaluationDetailEditResDto> {
    return this.scoreService.upsertEvaluationDetail(dto);
  }

  /**
   * @description 删除评价详情（自定义文案）
   */
  @Post('deleteEvaluationDetail')
  deleteEvaluationDetail(
    @Body() dto: DeleteScoreEvaluationDetailDto,
  ): Promise<void> {
    return this.scoreService.deleteEvaluationDetail(dto);
  }

  /**
   * @description 获取所有评分数据，按国家分组
   */
  @Post('listByCountry')
  listByCountry() {
    return this.scoreService.listByCountry();
  }

  /**
   * @description 创建或更新评分记录
   */
  @Post('create')
  create(@Body() data: CreateScoreDto) {
    return this.scoreService.create(data);
  }

  /**
   * @description 批量创建或更新多个国家的评分记录
   */
  @Post('batchCreate')
  batchCreate(@Body() data: BatchCreateScoreDto) {
    return this.scoreService.batchCreate(data);
  }

  /**
   * @description 获取特定国家和年份的评分详情
   */
  @Post('detail')
  detail(@Body() params: ScoreDetailReqDto) {
    return this.scoreService.detail(params);
  }

  /**
   * @description 检查特定国家和年份的评分数据是否存在
   */
  @Post('checkExisting')
  checkExistingData(@Body() params: ScoreDetailReqDto) {
    return this.scoreService.checkExistingData(params);
  }

  /**
   * @description 批量检查多个国家和年份的评分数据是否存在
   */
  @Post('batchCheckExisting')
  batchCheckExistingData(
    @Body() data: BatchCheckScoreExistingDto,
  ): Promise<BatchCheckScoreExistingResDto> {
    return this.scoreService.batchCheckExistingData(data);
  }

  /**
   * @description 删除评分记录
   */
  @Post('delete')
  delete(@Body() params: DeleteScoreDto) {
    return this.scoreService.delete(params);
  }

  /**
   * @description 获取所有评分评价规则
   */
  @Post('listEvaluation')
  listEvaluation() {
    return this.scoreService.listEvaluation();
  }

  /**
   * @description 批量创建评分评价规则 (会先清空旧数据)
   */
  @Post('createEvaluation')
  createEvaluation(@Body() data: ScoreEvaluationItemDto[]) {
    return this.scoreService.createEvaluation(data);
  }

  /**
   * @description 根据多个年份获取该年份下存在评分数据的国家列表
   */
  @Post('countriesByYears')
  getCountriesByYears(
    @Body() params: DataManagementCountriesByYearsReqDto,
  ): Promise<DataManagementCountriesByYearsResDto> {
    return this.scoreService.getCountriesByYears(params);
  }

  /**
   * @description 导出多个年份和多个国家的评分数据
   */
  @Post('exportMultiYear')
  async exportMultiYear(
    @Body() params: ExportDataMultiYearReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, mime, fileName } =
      await this.scoreService.exportDataMultiYear(params);
    const encoded = encodeURIComponent(fileName);
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encoded}`,
    );
    return new StreamableFile(buffer);
  }
}
