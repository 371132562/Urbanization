import { Injectable } from '@nestjs/common';
import { Article } from '@prisma/client';
import { BusinessException } from 'src/exceptions/businessException';
import {
  CreateArticleDto,
  ArticleItem,
  ArticleListResponse,
  UpdateArticleDto,
} from '../../../types/dto';
import { ErrorCode } from '../../../types/response';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDto(article: Article): ArticleItem {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      createTime: article.createTime,
      updateTime: article.updateTime,
    };
  }

  async detail(id: string): Promise<ArticleItem> {
    const article = await this.prisma.article.findFirst({
      where: { id, delete: 0 },
    });

    if (!article) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `文章ID ${id} 不存在`,
      );
    }

    return this.mapToDto(article);
  }

  async list(
    page: number,
    pageSize: number,
    title: string = '',
  ): Promise<ArticleListResponse> {
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
      list: articles.map((article) => this.mapToDto(article)),
      total,
      page,
      pageSize,
    };
  }

  async create(createArticleDto: CreateArticleDto): Promise<ArticleItem> {
    const article = await this.prisma.article.create({
      data: createArticleDto,
    });
    return this.mapToDto(article);
  }

  async update(updateArticleDto: UpdateArticleDto): Promise<ArticleItem> {
    const { id, ...data } = updateArticleDto;
    const article = await this.prisma.article.update({
      where: { id },
      data,
    });
    return this.mapToDto(article);
  }

  async delete(id: string): Promise<ArticleItem> {
    const article = await this.prisma.article.update({
      where: { id },
      data: { delete: 1 },
    });
    return this.mapToDto(article);
  }
}
