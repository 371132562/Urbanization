import { Module } from '@nestjs/common';
import { CountryAndContinentController } from './countryAndContinent.controller';
import { CountryAndContinentService } from './countryAndContinent.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CountryAndContinentController],
  providers: [CountryAndContinentService],
  exports: [CountryAndContinentService]
})
export class CountryAndContinentModule {}
