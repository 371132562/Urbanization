import type {
  ArticleItem,
  ArticleMetaItem,
  CreateArticleDto,
  UpdateArticleDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import {
  articleCreate,
  articleCreateScoreStandard,
  articleDelete,
  articleDetail,
  articleGetByPage,
  articleGetDetailsByIds,
  articleGetScoreStandard,
  articleList,
  articleListAll,
  articleUpdate,
  articleUpsertOrder
} from '@/services/apis'
import http from '@/services/base'

type ArticleStore = {
  // 状态
  articles: ArticleItem[]
  total: number
  currentPage: number
  pageSize: number
  loading: boolean
  searchTitle: string
  articleDetail: ArticleItem | null
  detailLoading: boolean
  submitLoading: boolean
  allArticles: ArticleMetaItem[]
  pageArticles: ArticleItem[]
  orderConfigLoading: boolean
  previewArticles: ArticleItem[]
  previewLoading: boolean
  scoreStandard: ArticleItem | null
  scoreStandardLoading: boolean

  // 操作
  getArticleList: (page?: number, pageSize?: number, title?: string) => Promise<void>
  setSearchTitle: (title: string) => void
  createArticle: (data: CreateArticleDto) => Promise<boolean>
  updateArticle: (data: UpdateArticleDto) => Promise<boolean>
  deleteArticle: (id: string) => Promise<boolean>
  getArticleDetail: (id: string) => Promise<void>
  clearArticleDetail: () => void
  getAllArticles: () => Promise<void>
  getArticlesByPage: (page: string) => Promise<void>
  upsertArticleOrder: (page: string, articleIds: string[]) => Promise<boolean>
  getArticleDetailsByIds: (ids: string[]) => Promise<void>
  getScoreStandard: () => Promise<void>
  createScoreStandard: (data: CreateArticleDto) => Promise<boolean>
  updateScoreStandard: (data: UpdateArticleDto) => Promise<boolean>
}

const useArticleStore = create<ArticleStore>((set, get) => ({
  // 初始状态
  articles: [],
  total: 0,
  currentPage: 1,
  pageSize: 10,
  loading: false,
  searchTitle: '',
  articleDetail: null,
  detailLoading: false,
  submitLoading: false,
  allArticles: [],
  pageArticles: [],
  orderConfigLoading: false,
  previewArticles: [],
  previewLoading: false,
  scoreStandard: null,
  scoreStandardLoading: false,

  // 获取文章列表
  getArticleList: async (page = 1, pageSize = 10, title) => {
    const searchTitle = title !== undefined ? title : get().searchTitle

    set({ loading: true })
    try {
      const response = await http.post(articleList, {
        page,
        pageSize,
        title: searchTitle
      })

      if (response && response.data) {
        set({
          articles: response.data.list,
          total: response.data.total,
          currentPage: page,
          pageSize
        })
      }
    } catch (error) {
      console.error('获取文章列表失败:', error)
      set({ articles: [], total: 0 })
    } finally {
      set({ loading: false })
    }
  },

  // 设置搜索标题
  setSearchTitle: (title: string) => {
    set({ searchTitle: title })
  },

  // 创建文章
  createArticle: async (data: CreateArticleDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleCreate, data)
      await get().getArticleList(1, get().pageSize, '') // 创建成功后回到第一页并清空搜索条件
      set({ searchTitle: '' })
      return true
    } catch (error) {
      console.error('创建文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 更新文章
  updateArticle: async (data: UpdateArticleDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpdate, data)
      await get().getArticleList(get().currentPage, get().pageSize) // 更新成功后刷新当前页
      return true
    } catch (error) {
      console.error('更新文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 删除文章
  deleteArticle: async (id: string) => {
    try {
      await http.post(articleDelete, { id })
      const { articles, currentPage, pageSize } = get()
      // 删除成功后，处理分页逻辑
      // 当删除的是当前页的最后一条数据时，需要返回上一页
      if (articles.length === 1 && currentPage > 1) {
        await get().getArticleList(currentPage - 1, pageSize)
      } else {
        await get().getArticleList(currentPage, pageSize) // 否则刷新当前页
      }
      return true
    } catch (error) {
      console.error('删除文章失败:', error)
      return false
    }
  },

  // 获取文章详情
  getArticleDetail: async (id: string) => {
    set({ detailLoading: true, articleDetail: null })
    try {
      const response = await http.post(articleDetail, { id })
      if (response && response.data) {
        set({ articleDetail: response.data })
      }
    } catch (error) {
      console.error('获取文章详情失败:', error)
      set({ articleDetail: null })
    } finally {
      set({ detailLoading: false })
    }
  },

  // 清除文章详情
  clearArticleDetail: () => {
    set({ articleDetail: null })
  },

  // 获取所有文章
  getAllArticles: async () => {
    set({ orderConfigLoading: true })
    try {
      const response = await http.post(articleListAll)
      if (response && response.data) {
        set({ allArticles: response.data })
      }
    } catch (error) {
      console.error('获取所有文章列表失败:', error)
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  // 根据页面获取文章
  getArticlesByPage: async (page: string) => {
    set({ orderConfigLoading: true })
    try {
      const response = await http.post(articleGetByPage, { page })
      if (response && response.data) {
        set({ pageArticles: response.data })
      }
    } catch (error) {
      console.error(`获取页面 ${page} 文章失败:`, error)
      set({ pageArticles: [] })
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  // 创建或更新文章顺序
  upsertArticleOrder: async (page: string, articles: string[]) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpsertOrder, { page, articles })
      return true
    } catch (error) {
      console.error('更新文章顺序失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 获取预览文章
  getArticleDetailsByIds: async (ids: string[]) => {
    set({ previewLoading: true, previewArticles: [] })
    try {
      const response = await http.post<ArticleItem[]>(articleGetDetailsByIds, {
        ids
      })
      if (response && response.data) {
        set({ previewArticles: response.data })
      }
    } catch (error) {
      console.error('获取预览文章失败:', error)
      set({ previewArticles: [] })
    } finally {
      set({ previewLoading: false })
    }
  },

  // 获取评价标准
  getScoreStandard: async () => {
    set({ scoreStandardLoading: true })
    try {
      const response = await http.post(articleGetScoreStandard)
      if (response && response.data) {
        set({ scoreStandard: response.data })
      }
    } catch (error) {
      console.error('获取评价标准失败:', error)
      set({ scoreStandard: null })
    } finally {
      set({ scoreStandardLoading: false })
    }
  },

  // 创建评价标准
  createScoreStandard: async (data: CreateArticleDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleCreateScoreStandard, data)
      await get().getScoreStandard() // 创建成功后刷新评价标准
      return true
    } catch (error) {
      console.error('创建评价标准失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 更新评价标准
  updateScoreStandard: async (data: UpdateArticleDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpdate, data)
      await get().getScoreStandard() // 更新成功后刷新评价标准
      return true
    } catch (error) {
      console.error('更新评价标准失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  }
}))

export default useArticleStore
