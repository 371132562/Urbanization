import {} from '@prisma/client';

export {};

export type DataManagementListItem = {
  year: Date;
};

export type IndicatorValue = {
  cnName: string;
  enName: string;
  value: number | null;
};

export type CountryData = {
  cnName: string;
  enName: string;
  values: IndicatorValue[];
};

export type YearData = {
  year: number;
  data: CountryData[];
};

export type DataManagementListDto = YearData[];
