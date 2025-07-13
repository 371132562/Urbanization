import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import { Response } from 'express';
import {
  CountryDetailReqDto,
  CountryDetailResDto,
  CreateIndicatorValuesDto,
  DataManagementListDto,
  CountryYearQueryDto,
  ExportDataReqDto,
} from '../../../types/dto';

@Controller('dataManagement')
export class DataManagementController {
  private readonly logger = new Logger(DataManagementController.name);
  constructor(private readonly dataManagementService: DataManagementService) {}

  /**
   * 获取所有数据管理条目
   * @returns {Promise<DataManagementListDto>}
   */
  @Post('list')
  async list(): Promise<DataManagementListDto> {
    return this.dataManagementService.list();
  }

  /**
   * 创建或更新指标值数据
   * @param data 创建指标值的请求数据，包含国家ID、年份和指标值数组
   * @returns {Promise<{count: number}>} 创建或更新的指标值数量
   */
  @Post('create')
  async create(
    @Body() data: CreateIndicatorValuesDto,
  ): Promise<{ count: number }> {
    return this.dataManagementService.create(data);
  }

  /**
   * 获取特定国家特定年份的详细指标数据
   * @param params 请求参数，包含国家ID和年份
   * @returns {Promise<CountryDetailResDto>} 国家详细指标数据
   */
  @Post('detail')
  async detail(
    @Body() params: CountryDetailReqDto,
  ): Promise<CountryDetailResDto> {
    return this.dataManagementService.detail(params);
  }

  @Post('delete')
  delete(@Body() params: CountryYearQueryDto) {
    return this.dataManagementService.delete(params);
  }

  @Post('checkExistingData')
  checkExistingData(@Body() params: CountryYearQueryDto) {
    return this.dataManagementService.checkExistingData(params);
  }

  /**
   * 导出特定年份和多个国家的数据
   * @param params 导出参数，包含年份、国家ID数组和格式
   * @param res Express响应对象，用于设置响应头和发送文件
   * @returns {Promise<StreamableFile>} 文件流
   */
  @Post('export')
  async exportData(
    @Body() params: ExportDataReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(
      `收到导出请求, 年份: ${new Date(
        params.year,
      ).toISOString()}, 国家数量: ${params.countryIds.length}, 格式: ${
        params.format
      }`,
    );
    const { buffer, mime, fileName } =
      await this.dataManagementService.exportData(params);

    // 对文件名进行编码，以支持非ASCII字符，并防止"Invalid character"错误
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(buffer);
  }
}
