import { Body, Controller, Post } from '@nestjs/common';
import { ScoreService } from './score.service';
import {
  ScoreEvaluationItemDto,
  CreateScoreDto,
  ScoreDetailReqDto,
  DeleteScoreDto,
} from 'types/dto';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  /**
   * @description 获取所有得分数据，按年份分组
   */
  @Post('list')
  list() {
    return this.scoreService.list();
  }

  /**
   * @description 获取所有得分数据，按国家分组
   */
  @Post('listByCountry')
  listByCountry() {
    return this.scoreService.listByCountry();
  }

  /**
   * @description 创建或更新得分记录
   */
  @Post('create')
  create(@Body() data: CreateScoreDto) {
    return this.scoreService.create(data);
  }

  /**
   * @description 获取特定国家和年份的得分详情
   */
  @Post('detail')
  detail(@Body() params: ScoreDetailReqDto) {
    return this.scoreService.detail(params);
  }

  /**
   * @description 检查特定国家和年份的得分数据是否存在
   */
  @Post('checkExisting')
  checkExistingData(@Body() params: ScoreDetailReqDto) {
    return this.scoreService.checkExistingData(params);
  }

  /**
   * @description 删除得分记录
   */
  @Post('delete')
  delete(@Body() params: DeleteScoreDto) {
    return this.scoreService.delete(params);
  }

  /**
   * @description 获取所有得分评价规则
   */
  @Post('evaluation/list')
  findAllEvaluations() {
    return this.scoreService.findAllEvaluations();
  }

  /**
   * @description 批量创建得分评价规则 (会先清空旧数据)
   */
  @Post('evaluation/create')
  createEvaluations(@Body() data: ScoreEvaluationItemDto[]) {
    return this.scoreService.createEvaluations(data);
  }
}
