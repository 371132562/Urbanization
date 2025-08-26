import { Injectable, Logger } from '@nestjs/common';
import { Article, ArticleOrder, ArticleType } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/businessException';
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

  async create(
    createArticleDto: CreateArticleDto,
    type?: ArticleType,
  ): Promise<ArticleItem> {
    const { deletedImages: incomingDeletedImages, ...articleData } =
      createArticleDto;

    // 保险：根据 content 实际包含的图片，纠正 images / deletedImages
    const reconciled = this._reconcileImages(
      (articleData as unknown as { images?: string[] }).images ?? [],
      incomingDeletedImages ?? [],
      (articleData as unknown as { content?: string }).content ?? '',
    );
    (articleData as unknown as { images: string[] }).images = reconciled.images;

    const article = await this.prisma.article.create({
      data: {
        ...articleData,
        type: type || ArticleType.ARTICLE,
      },
    });

    // 异步清理不再使用的图片，不阻塞主流程
    if (reconciled.deletedImages && reconciled.deletedImages.length > 0) {
      this.uploadService
        .cleanupUnusedImages(reconciled.deletedImages)
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(`后台图片清理任务失败: ${errorMessage}`);
        });
    }

    return this.mapToDto(article);
  }

  async update(updateArticleDto: UpdateArticleDto): Promise<ArticleItem> {
    const {
      id,
      deletedImages: incomingDeletedImages,
      ...data
    } = updateArticleDto;

    // 保险：根据 content 实际包含的图片，纠正 images / deletedImages
    const reconciled = this._reconcileImages(
      (data as unknown as { images?: string[] }).images ?? [],
      incomingDeletedImages ?? [],
      (data as unknown as { content?: string }).content ?? '',
    );
    (data as unknown as { images: string[] }).images = reconciled.images;

    const article = await this.prisma.article.update({
      where: { id },
      data,
    });

    // 异步清理不再使用的图片，不阻塞主流程
    if (reconciled.deletedImages && reconciled.deletedImages.length > 0) {
      this.uploadService
        .cleanupUnusedImages(reconciled.deletedImages)
        .catch((err) => {
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

    // 2. 物理删除
    const deletedArticle = await this.prisma.article.delete({
      where: { id },
    });

    // 3. 异步清理该文章关联的图片
    const imagesToCheck = articleToDelete.images as string[];
    if (imagesToCheck && imagesToCheck.length > 0) {
      this.uploadService.cleanupUnusedImages(imagesToCheck).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`后台图片清理任务失败 (文章删除时): ${errorMessage}`);
      });
    }

    return this.mapToDto(deletedArticle);
  }

  /**
   * 清理已删除的图片文件。
   * 仅当图片在所有文章中都未被引用时，才会执行物理删除。
   * @param deletedImages - 包含待删除图片文件名的数组
   */

  /**
   * 根据 content 中引用情况与前端提交的 images/deletedImages 进行纠正
   * - 最终 images = 去重(前端 images ∪ content 中的图片)
   * - 最终 deletedImages = 前端 deletedImages 去除所有仍在 content 或最终 images 中的项
   */
  private _reconcileImages(
    imagesFromDto: string[],
    deletedImagesFromDto: string[],
    content: string,
  ): { images: string[]; deletedImages: string[] } {
    const contentImages = new Set(
      this.uploadService.parseImageFilenamesFromHtml(content),
    );

    // 合并 images（确保不丢）
    const finalImagesSet = new Set<string>(imagesFromDto);
    contentImages.forEach((f) => finalImagesSet.add(f));

    // 过滤 deleted（避免误删）
    const finalDeleted = (deletedImagesFromDto || []).filter(
      (f) => !contentImages.has(f) && !finalImagesSet.has(f),
    );

    // 可选日志：如有修正则打点
    if (finalImagesSet.size !== (imagesFromDto || []).length) {
      this.logger.log(
        `纠正 images：由 ${imagesFromDto.length} 调整为 ${finalImagesSet.size}`,
      );
    }
    if (finalDeleted.length !== (deletedImagesFromDto || []).length) {
      this.logger.log(
        `纠正 deletedImages：由 ${(deletedImagesFromDto || []).length} 调整为 ${finalDeleted.length}`,
      );
    }

    return { images: Array.from(finalImagesSet), deletedImages: finalDeleted };
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

  // 配置评价体系上方的评价标准文章，如果未配置，则返回空对象，前端根据空id判断不初始化并走创建逻辑，否则展示并走更新逻辑
  async getScoreStandard(): Promise<ArticleItem> {
    const article = await this.prisma.article.findFirst({
      where: { type: ArticleType.SCORE_STANDARD, delete: 0 },
    });
    return this.mapToDto(
      article
        ? article
        : {
            id: '',
            title: '',
            content: '',
            images: [],
            type: ArticleType.SCORE_STANDARD,
            createTime: new Date(),
            updateTime: new Date(),
            delete: 0,
          },
    );
  }
}
