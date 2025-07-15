import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async getList(page: number, pageSize: number, title: string = '') {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const whereCondition = {
      delete: 0,
      ...(title ? { title: { contains: title } } : {}),
    };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: whereCondition,
        skip,
        take,
        orderBy: {
          updateTime: 'desc',
        },
      }),
      this.prisma.article.count({
        where: whereCondition,
      }),
    ]);

    return {
      list: articles,
      total,
      page,
      pageSize,
    };
  }
}
