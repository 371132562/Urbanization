import { Controller, Post, Body } from '@nestjs/common';
import { ArticleService } from './article.service';
import {
  ArticleItem,
  CreateArticleDto,
  UpdateArticleDto,
  UpsertArticleOrderDto,
  ArticleOrderDto,
  ArticleListDto,
  DeleteArticleDto,
  ArticleMetaItem,
  ArticleListResponse,
} from '../../../types/dto';
import { ArticleType } from '@prisma/client';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('list')
  async getArticleList(
    @Body() body: ArticleListDto,
  ): Promise<ArticleListResponse> {
    const { page = 1, pageSize = 10, title = '' } = body;
    return this.articleService.list(page, pageSize, title);
  }

  @Post('detail')
  async getArticleDetail(@Body() body: DeleteArticleDto) {
    return this.articleService.detail(body.id);
  }

  @Post('create')
  async createArticle(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Post('update')
  async updateArticle(@Body() updateArticleDto: UpdateArticleDto) {
    return this.articleService.update(updateArticleDto);
  }

  @Post('createScoreStandard')
  async createScoreStandard(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(
      createArticleDto,
      ArticleType.SCORE_STANDARD,
    );
  }
  @Post('getScoreStandard')
  async getScoreStandard(): Promise<ArticleItem> {
    return this.articleService.getScoreStandard();
  }

  @Post('delete')
  async deleteArticle(@Body() deleteArticleDto: DeleteArticleDto) {
    return this.articleService.delete(deleteArticleDto.id);
  }

  @Post('listAll')
  async listAll(): Promise<ArticleMetaItem[]> {
    return this.articleService.listAll();
  }

  @Post('order')
  async upsertArticleOrder(
    @Body() upsertArticleOrderDto: UpsertArticleOrderDto,
  ): Promise<ArticleOrderDto> {
    return this.articleService.upsertArticleOrder(upsertArticleOrderDto);
  }

  @Post('getByPage')
  async getArticlesByPage(
    @Body() { page }: { page: string },
  ): Promise<ArticleItem[]> {
    return this.articleService.getArticlesByPage(page);
  }

  @Post('getDetailsByIds')
  async getDetailsByIds(
    @Body() { ids }: { ids: string[] },
  ): Promise<ArticleItem[]> {
    return this.articleService.getDetailsByIds(ids);
  }
}
