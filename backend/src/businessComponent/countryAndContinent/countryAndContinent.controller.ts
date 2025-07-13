import { Body, Controller, Post } from '@nestjs/common';
import { CountryAndContinentService } from './countryAndContinent.service';
import {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto,
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
}
