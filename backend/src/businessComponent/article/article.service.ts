import { Injectable, Logger } from '@nestjs/common';
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
import { UploadService } from '../../upload/upload.service';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private mapToDto(article: Article): ArticleItem {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      images: article.images as string[], // images 字段从 JSON 转换为 string[]
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
    const { deletedImages, ...articleData } = createArticleDto;

    const article = await this.prisma.article.create({
      data: articleData,
    });

    // 异步清理不再使用的图片，不阻塞主流程
    if (deletedImages && deletedImages.length > 0) {
      this._handleImageCleanup(deletedImages).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`后台图片清理任务失败: ${errorMessage}`);
      });
    }

    return this.mapToDto(article);
  }

  async update(updateArticleDto: UpdateArticleDto): Promise<ArticleItem> {
    const { id, deletedImages, ...data } = updateArticleDto;
    const article = await this.prisma.article.update({
      where: { id },
      data,
    });

    // 异步清理不再使用的图片，不阻塞主流程
    if (deletedImages && deletedImages.length > 0) {
      this._handleImageCleanup(deletedImages).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`后台图片清理任务失败: ${errorMessage}`);
      });
    }

    return this.mapToDto(article);
  }

  async delete(id: string): Promise<ArticleItem> {
    // 1. 查找要删除的文章，以获取其图片列表
    const articleToDelete = await this.prisma.article.findFirst({
      where: { id, delete: 0 },
    });

    if (!articleToDelete) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `文章ID ${id} 不存在或已被删除`,
      );
    }

    // 2. 执行软删除
    const softDeletedArticle = await this.prisma.article.update({
      where: { id },
      data: { delete: 1 },
    });

    // 3. 异步清理该文章关联的图片
    const imagesToCheck = articleToDelete.images as string[];
    if (imagesToCheck && imagesToCheck.length > 0) {
      this._handleImageCleanup(imagesToCheck).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`后台图片清理任务失败 (文章删除时): ${errorMessage}`);
      });
    }

    return this.mapToDto(softDeletedArticle);
  }

  /**
   * 清理已删除的图片文件。
   * 仅当图片在所有文章中都未被引用时，才会执行物理删除。
   * @param deletedImages - 包含待删除图片文件名的数组
   */
  private async _handleImageCleanup(deletedImages: string[]) {
    this.logger.log(
      `开始图片清理任务，待处理图片: ${deletedImages.join(', ')}`,
    );

    // 1. 获取所有未删除文章中正在使用的图片
    const allInUseImagesResult = await this.prisma.article.findMany({
      where: { delete: 0 },
      select: { images: true },
    });

    // 2. 将所有正在使用的图片文件名收集到一个 Set 中，以便快速查找
    const inUseImageSet = new Set<string>();
    allInUseImagesResult.forEach((article) => {
      const images = article.images as string[]; // Prisma 返回的 Json 类型需要断言
      if (Array.isArray(images)) {
        images.forEach((img) => inUseImageSet.add(img));
      }
    });

    // 3. 遍历待删除列表，判断是否可以安全删除
    for (const filename of deletedImages) {
      try {
        if (!inUseImageSet.has(filename)) {
          // 如果图片已不在任何文章中使用，则进行物理删除
          await this.uploadService.deleteFile(filename);
          this.logger.log(`成功删除孤立图片: ${filename}`);
        } else {
          this.logger.log(`图片 ${filename} 仍在被其他文章使用，跳过删除。`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`删除图片 ${filename} 失败: ${errorMessage}`);
        // 不向上抛出异常，以确保单个文件删除失败不影响其他文件处理
      }
    }
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
