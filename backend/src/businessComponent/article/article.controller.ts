import { Controller, Post, Body } from '@nestjs/common';

import { ArticleService } from './article.service';
import { ArticleListDto } from '../../../types/dto';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('list')
  async getArticleList(@Body() body: ArticleListDto) {
    const { page = 1, pageSize = 10, title = '' } = body;
    return this.articleService.getList(page, pageSize, title);
  }
}
