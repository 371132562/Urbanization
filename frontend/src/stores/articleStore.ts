import type {
  ArticleItem,
  CreateArticleDto,
  UpdateArticleDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import {
  articleCreate,
  articleDelete,
  articleDetail,
  articleList,
  articleUpdate
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

  // 操作
  getArticleList: (page?: number, pageSize?: number, title?: string) => Promise<void>
  setSearchTitle: (title: string) => void
  createArticle: (data: CreateArticleDto) => Promise<boolean>
  updateArticle: (data: UpdateArticleDto) => Promise<boolean>
  deleteArticle: (id: string) => Promise<boolean>
  getArticleDetail: (id: string) => Promise<void>
  clearArticleDetail: () => void
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
      await get().getArticleList(get().currentPage, get().pageSize) // 删除成功后刷新当前页
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
  }
}))

export default useArticleStore
