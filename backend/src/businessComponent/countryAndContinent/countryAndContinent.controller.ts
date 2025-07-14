import { Body, Controller, Post } from '@nestjs/common';
import { CountryAndContinentService } from './countryAndContinent.service';
import {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto,
  UrbanizationUpdateDto,
  UrbanizationWorldMapDataDto,
} from '../../../types/dto';

@Controller('countryAndContinent')
export class CountryAndContinentController {
  constructor(
    private readonly countryAndContinentService: CountryAndContinentService,
  ) {}

  /**
   * 获取所有大洲
   * @param params 查询参数，包含是否包含国家
   * @returns {Promise<ContinentListResDto>} 大洲列表
   */
  @Post('continents')
  async getContinents(
    @Body() params: QueryContinentReqDto,
  ): Promise<ContinentListResDto> {
    return this.countryAndContinentService.getContinents(params);
  }

  /**
   * 获取所有国家
   * @param params 查询参数，包含是否包含大洲信息和可选的大洲ID
   * @returns {Promise<CountryListResDto>} 国家列表
   */
  @Post('countries')
  async getCountries(
    @Body() params: QueryCountryReqDto,
  ): Promise<CountryListResDto> {
    return this.countryAndContinentService.getCountries(params);
  }

  /**
   * 获取所有世界地图城镇化数据
   * @returns {Promise<UrbanizationWorldMapDataDto>} 世界地图城镇化数据列表
   */
  @Post('urbanizationMap')
  async getUrbanizationWorldMapData(): Promise<UrbanizationWorldMapDataDto> {
    return this.countryAndContinentService.getUrbanizationWorldMapData();
  }

  /**
   * 批量更新国家城镇化状态
   * @param updates 更新数据数组
   * @returns {Promise<{count: number}>} 更新计数
   */
  @Post('urbanizationUpdate')
  async batchUpdateUrbanization(
    @Body() updates: UrbanizationUpdateDto[],
  ): Promise<{ count: number }> {
    return this.countryAndContinentService.batchUpdateUrbanization(updates);
  }
}
