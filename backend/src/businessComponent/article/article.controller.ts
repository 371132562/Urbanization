import { Controller, Post, Body } from '@nestjs/common';

import { ArticleService } from './article.service';
import {
  ArticleListDto,
  CreateArticleDto,
  DeleteArticleDto,
  UpdateArticleDto,
} from '../../../types/dto';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('list')
  async getArticleList(@Body() body: ArticleListDto) {
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

  @Post('delete')
  async deleteArticle(@Body() deleteArticleDto: DeleteArticleDto) {
    return this.articleService.delete(deleteArticleDto.id);
  }
}
