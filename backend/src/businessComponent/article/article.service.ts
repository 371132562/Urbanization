import { Injectable } from '@nestjs/common';
import { Article, ArticleOrder } from '@prisma/client';
import { BusinessException } from 'src/exceptions/businessException';
import {
  CreateArticleDto,
  ArticleItem,
  ArticleListResponse,
  UpdateArticleDto,
  UpsertArticleOrderDto,
  ArticleOrderDto,
  ArticleMetaItem,
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

  private mapToMetaDto(
    article: Pick<Article, 'id' | 'title' | 'createTime' | 'updateTime'>,
  ): ArticleMetaItem {
    return {
      id: article.id,
      title: article.title,
      createTime: article.createTime,
      updateTime: article.updateTime,
    };
  }

  private mapToArticleOrderDto(articleOrder: ArticleOrder): ArticleOrderDto {
    return {
      id: articleOrder.id,
      page: articleOrder.page,
      articles: articleOrder.articles as string[],
      createTime: articleOrder.createTime,
      updateTime: articleOrder.updateTime,
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
        select: {
          id: true,
          title: true,
          createTime: true,
          updateTime: true,
        },
      }),
      this.prisma.article.count({
        where: whereCondition,
      }),
    ]);

    return {
      list: articles.map((article) => this.mapToMetaDto(article)),
      total,
      page,
      pageSize,
    };
  }

  async listAll(): Promise<ArticleMetaItem[]> {
    const articles = await this.prisma.article.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        updateTime: 'desc',
      },
      select: {
        id: true,
        title: true,
        createTime: true,
        updateTime: true,
      },
    });
    return articles.map((article) => this.mapToMetaDto(article));
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

  async upsertArticleOrder(
    upsertArticleOrderDto: UpsertArticleOrderDto,
  ): Promise<ArticleOrderDto> {
    const { page, articles } = upsertArticleOrderDto;

    // 校验所有文章ID都存在
    const existingArticles = await this.prisma.article.findMany({
      where: {
        id: { in: articles },
        delete: 0,
      },
      select: {
        id: true,
      },
    });

    if (existingArticles.length !== articles.length) {
      const existingIds = new Set(existingArticles.map((a) => a.id));
      const nonExistentIds = articles.filter((id) => !existingIds.has(id));
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `文章ID ${nonExistentIds.join(', ')} 不存在或已被删除`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const articleOrder = await tx.articleOrder.findFirst({
        where: {
          page: page,
          delete: 0,
        },
      });

      if (articleOrder) {
        // 更新
        return tx.articleOrder.update({
          where: { id: articleOrder.id },
          data: { articles: articles },
        });
      } else {
        // 创建
        return tx.articleOrder.create({
          data: {
            page: page,
            articles: articles,
          },
        });
      }
    });

    return this.mapToArticleOrderDto(result);
  }

  async getArticlesByPage(page: string): Promise<ArticleItem[]> {
    const articleOrder = await this.prisma.articleOrder.findFirst({
      where: { page, delete: 0 },
    });

    if (!articleOrder) {
      return [];
    }

    const articleIds = articleOrder.articles as string[];
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return [];
    }

    const articles = await this.prisma.article.findMany({
      where: {
        id: { in: articleIds },
        delete: 0,
      },
    });

    // 保持articles数组中定义的顺序
    const articleMap = new Map<string, Article>();
    articles.forEach((article) => articleMap.set(article.id, article));

    const sortedArticles = articleIds
      .map((id) => articleMap.get(id))
      .filter((article): article is Article => article !== undefined)
      .map((article) => this.mapToDto(article));

    return sortedArticles;
  }

  async getDetailsByIds(ids: string[]): Promise<ArticleItem[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const articles = await this.prisma.article.findMany({
      where: {
        id: { in: ids },
        delete: 0,
      },
    });

    const articleMap = new Map<string, Article>();
    articles.forEach((article) => articleMap.set(article.id, article));

    // 保持传入id的顺序
    const sortedArticles = ids
      .map((id) => articleMap.get(id))
      .filter((article): article is Article => article !== undefined)
      .map((article) => this.mapToDto(article));

    return sortedArticles;
  }
}
