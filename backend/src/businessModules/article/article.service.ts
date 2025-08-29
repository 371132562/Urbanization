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
import { UploadService } from '../../commonModules/upload/upload.service';
import { ImageProcessorUtils } from '../../common/upload';

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
      type: article.type,
      createTime: article.createTime,
      updateTime: article.updateTime,
    };
  }

  private mapToMetaDto(
    article: Pick<
      Article,
      'id' | 'title' | 'type' | 'createTime' | 'updateTime'
    >,
  ): ArticleMetaItem {
    return {
      id: article.id,
      title: article.title,
      type: article.type,
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
    this.logger.log(`[开始] 获取文章详情 - 文章ID: ${id}`);

    try {
      const article = await this.prisma.article.findFirst({
        where: { id, delete: 0 },
      });

      if (!article) {
        this.logger.warn(`[验证失败] 获取文章详情 - 文章ID ${id} 不存在`);
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `文章ID ${id} 不存在`,
        );
      }

      this.logger.log(
        `[成功] 获取文章详情 - 文章ID: ${id}, 标题: ${article.title}`,
      );
      return this.mapToDto(article);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 获取文章详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async list(
    page: number,
    pageSize: number,
    title: string = '',
  ): Promise<ArticleListResponse> {
    this.logger.log(
      `[开始] 获取文章列表 - 页码: ${page}, 每页大小: ${pageSize}, 标题筛选: ${title || '无'}`,
    );

    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const whereCondition = {
        delete: 0,
        type: ArticleType.ARTICLE, // 只返回普通文章
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
            type: true,
            createTime: true,
            updateTime: true,
          },
        }),
        this.prisma.article.count({ where: whereCondition }),
      ]);

      this.logger.log(
        `[成功] 获取文章列表 - 共 ${total} 篇文章，当前页返回 ${articles.length} 篇，页码: ${page}`,
      );

      return {
        list: articles.map((article) => this.mapToMetaDto(article)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(
        `[失败] 获取文章列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async listAll(): Promise<ArticleMetaItem[]> {
    this.logger.log('[开始] 获取所有文章列表');

    try {
      const articles = await this.prisma.article.findMany({
        where: {
          delete: 0,
          type: ArticleType.ARTICLE, // 只返回普通文章
        },
        orderBy: {
          updateTime: 'desc',
        },
        select: {
          id: true,
          title: true,
          type: true,
          createTime: true,
          updateTime: true,
        },
      });

      this.logger.log(`[成功] 获取所有文章列表 - 共 ${articles.length} 篇文章`);
      return articles.map((article) => this.mapToMetaDto(article));
    } catch (error) {
      this.logger.error(
        `[失败] 获取所有文章列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async create(
    createArticleDto: CreateArticleDto,
    type?: ArticleType,
  ): Promise<ArticleItem> {
    this.logger.log(`[开始] 创建文章 - 标题: ${createArticleDto.title}`);

    try {
      const { deletedImages: incomingDeletedImages, ...articleData } =
        createArticleDto;

      // 使用工具类处理图片数据
      const { processedData, deletedImages } =
        ImageProcessorUtils.processArticleImages({
          ...articleData,
          deletedImages: incomingDeletedImages,
        });

      const article = await this.prisma.article.create({
        data: {
          ...processedData,
          type: type || ArticleType.ARTICLE,
        } as {
          title: string;
          content: string;
          images: string[];
          type: ArticleType;
        },
      });

      // 异步清理不再使用的图片，不阻塞主流程
      if (deletedImages.length > 0) {
        this.logger.log(
          `[资源清理] 清理文章图片 - 待清理图片数量: ${deletedImages.length}`,
        );
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          deletedImages,
          '后台图片清理',
        );
      }

      this.logger.log(
        `[成功] 创建文章 - 文章ID: ${article.id}, 标题: ${article.title}`,
      );
      return this.mapToDto(article);
    } catch (error) {
      this.logger.error(
        `[失败] 创建文章 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(updateArticleDto: UpdateArticleDto): Promise<ArticleItem> {
    this.logger.log(`[开始] 更新文章 - 文章ID: ${updateArticleDto.id}`);

    try {
      const {
        id,
        deletedImages: incomingDeletedImages,
        ...data
      } = updateArticleDto;

      // 使用工具类处理图片数据
      const { processedData, deletedImages } =
        ImageProcessorUtils.processArticleImages({
          ...data,
          deletedImages: incomingDeletedImages,
        });

      const article = await this.prisma.article.update({
        where: { id },
        data: processedData,
      });

      // 异步清理不再使用的图片，不阻塞主流程
      if (deletedImages.length > 0) {
        this.logger.log(
          `[资源清理] 清理文章图片 - 待清理图片数量: ${deletedImages.length}`,
        );
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          deletedImages,
          '后台图片清理',
        );
      }

      this.logger.log(
        `[成功] 更新文章 - 文章ID: ${article.id}, 标题: ${article.title}`,
      );
      return this.mapToDto(article);
    } catch (error) {
      this.logger.error(
        `[失败] 更新文章 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<ArticleItem> {
    this.logger.log(`[开始] 删除文章 - 文章ID: ${id}`);

    try {
      // 1. 查找要删除的文章，以获取其图片列表
      const articleToDelete = await this.prisma.article.findFirst({
        where: { id, delete: 0 },
      });

      if (!articleToDelete) {
        this.logger.warn(`[验证失败] 删除文章 - 文章ID ${id} 不存在或已被删除`);
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
      const imagesToClean = deletedArticle.images as string[];
      if (imagesToClean.length > 0) {
        this.logger.log(
          `[资源清理] 清理删除文章的图片 - 待清理图片数量: ${imagesToClean.length}`,
        );
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          imagesToClean,
          '删除文章后的图片清理',
        );
      }

      this.logger.log(
        `[成功] 删除文章 - 文章ID: ${id}, 标题: ${deletedArticle.title}`,
      );
      return this.mapToDto(deletedArticle);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除文章 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 清理已删除的图片文件。
   * 仅当图片在所有文章中都未被引用时，才会执行物理删除。
   * @param deletedImages - 包含待删除图片文件名的数组
   */

  async upsertArticleOrder(
    upsertArticleOrderDto: UpsertArticleOrderDto,
  ): Promise<ArticleOrderDto> {
    const { page, articles } = upsertArticleOrderDto;

    this.logger.log(
      `[开始] 更新文章排序 - 页面: ${page}, 文章数量: ${articles.length}`,
    );

    try {
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
        this.logger.warn(
          `[验证失败] 更新文章排序 - 文章ID ${nonExistentIds.join(', ')} 不存在或已被删除`,
        );
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

      this.logger.log(
        `[成功] 更新文章排序 - 页面: ${page}, 排序ID: ${result.id}`,
      );
      return this.mapToArticleOrderDto(result);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 更新文章排序 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getArticlesByPage(page: string): Promise<ArticleItem[]> {
    this.logger.log(`[开始] 获取页面文章 - 页面: ${page}`);

    try {
      const articleOrder = await this.prisma.articleOrder.findFirst({
        where: { page, delete: 0 },
      });

      if (!articleOrder) {
        this.logger.log(`[成功] 获取页面文章 - 页面: ${page}, 未配置文章排序`);
        return [];
      }

      const articleIds = articleOrder.articles as string[];
      if (!Array.isArray(articleIds) || articleIds.length === 0) {
        this.logger.log(`[成功] 获取页面文章 - 页面: ${page}, 文章排序为空`);
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

      this.logger.log(
        `[成功] 获取页面文章 - 页面: ${page}, 返回 ${sortedArticles.length} 篇文章`,
      );
      return sortedArticles;
    } catch (error) {
      this.logger.error(
        `[失败] 获取页面文章 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getDetailsByIds(ids: string[]): Promise<ArticleItem[]> {
    if (!ids || ids.length === 0) {
      this.logger.log('[成功] 获取文章详情 - 文章ID列表为空');
      return [];
    }

    this.logger.log(`[开始] 获取文章详情 - 文章ID数量: ${ids.length}`);

    try {
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

      this.logger.log(
        `[成功] 获取文章详情 - 请求 ${ids.length} 篇文章，返回 ${sortedArticles.length} 篇`,
      );
      return sortedArticles;
    } catch (error) {
      this.logger.error(
        `[失败] 获取文章详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // 配置评价体系上方的评价标准文章，如果未配置，则返回空对象，前端根据空id判断不初始化并走创建逻辑，否则展示并走更新逻辑
  async getScoreStandard(): Promise<ArticleItem> {
    this.logger.log('[开始] 获取评分标准文章');

    try {
      const article = await this.prisma.article.findFirst({
        where: { type: ArticleType.SCORE_STANDARD, delete: 0 },
      });

      const result = this.mapToDto(
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

      if (article) {
        this.logger.log(
          `[成功] 获取评分标准文章 - 文章ID: ${article.id}, 标题: ${article.title}`,
        );
      } else {
        this.logger.log(
          '[成功] 获取评分标准文章 - 未配置评分标准文章，返回空对象',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分标准文章 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
