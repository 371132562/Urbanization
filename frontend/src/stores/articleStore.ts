import type { Article } from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import { articleList } from '@/services/apis'
import http from '@/services/base'

type ArticleState = {
  // 状态
  articles: Article[]
  total: number
  currentPage: number
  pageSize: number
  loading: boolean
  searchTitle: string

  // 操作
  getArticleList: (page?: number, pageSize?: number, title?: string) => Promise<void>
  setSearchTitle: (title: string) => void
}

const useArticleStore = create<ArticleState>((set, get) => ({
  // 初始状态
  articles: [],
  total: 0,
  currentPage: 1,
  pageSize: 10,
  loading: false,
  searchTitle: '',

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
  }
}))

export default useArticleStore
