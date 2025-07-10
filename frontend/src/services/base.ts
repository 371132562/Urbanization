// 基于axios封装的请求模块
import { notification } from 'antd' // 导入 Ant Design 的 notification 组件
import axios from 'axios'
import { ErrorCode } from 'urbanization-backend/types/response.ts'

// 创建axios实例
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // API基础URL（从环境变量获取）
  timeout: 10000 // 请求超时时间（毫秒）
})

// 请求拦截器
http.interceptors.request.use(
  config => {
    // 添加token到请求头
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  error => {
    // 处理请求错误，例如网络不通，请求被取消等
    notification.error({
      message: '错误',
      description: '网络请求失败，请稍后再试！'
    })
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  response => {
    // 处理响应数据
    const { status, data } = response
    const { code, msg } = data // 解构后端返回的 code, msg, data
    // 统一处理后端返回的成功状态（HTTP Status 200）
    if (status === 200) {
      if (code === ErrorCode.SUCCESS) {
        // 业务成功，直接返回后端 data 字段的数据
        return data
      } else {
        // 后端返回了 HTTP Status 200，但业务 code 表示错误
        notification.error({
          message: '错误',
          description: msg
        })
        // 可以根据不同的 code 做更精细的错误处理或跳转
        switch (code) {
          case ErrorCode.TOKEN_EXPIRED:
          case ErrorCode.UNAUTHORIZED:
            // 认证过期或未认证，可以清空本地 token 并跳转到登录页
            // localStorage.removeItem('token')
            // 这里可以添加路由跳转逻辑，例如：
            // router.push('/login');
            break
          case ErrorCode.FORBIDDEN:
            // 权限不足
            // message.warn('您没有操作权限！'); // 已经在上面统一 error 提示，这里可以额外区分
            break
          case ErrorCode.INVALID_INPUT:
            // 参数校验错误，msg 会更具体
            // message.error(msg);
            break
          case ErrorCode.SYSTEM_ERROR:
          case ErrorCode.UNKNOWN_ERROR:
            // 系统错误
            // message.error('服务器开小差了，请稍后再试！');
            break
          default:
            // 其他业务错误
            break
        }
        // 对于业务错误，仍然通过 Promise.reject 抛出，以便调用者可以捕获
        return Promise.reject(data)
      }
    } else {
      // 理论上，如果后端异常过滤器设置得好，不会出现 status 不是 200 的情况
      // 但为了健壮性，仍然保留这部分处理
      notification.error({
        message: '错误',
        description: `HTTP 错误: ${status} - ${msg || '未知错误'}`
      })
      return Promise.reject(new Error(msg || 'HTTP Error'))
    }
  },
  error => {
    // 处理网络错误、请求超时、HTTP 非 2xx 响应等
    if (error.response) {
      // 请求已发出，但服务器响应的状态码不在 2xx 范围内
      const { status, data } = error.response
      let errorMessage = data.msg || data.message || '未知错误'

      // 根据 HTTP 状态码进行提示
      switch (status) {
        case 400:
          errorMessage = '请求参数错误，请检查输入！'
          // 如果后端 ValidationPipe 返回的 data.message 是数组，可以显示更详细的错误
          if (Array.isArray(data.data) && data.data.length > 0) {
            errorMessage += ': ' + data.data.join('; ')
          }
          break
        case 401:
          errorMessage = '您的认证已过期或无效，请重新登录！'
          localStorage.removeItem('token')
          // router.push('/login'); // 跳转到登录页
          break
        case 403:
          errorMessage = '您没有权限执行此操作！'
          break
        case 404:
          errorMessage = '请求的资源不存在！'
          break
        case 500:
          errorMessage = '服务器内部错误，请稍后再试！'
          break
        default:
          errorMessage = `网络错误: ${status}`
      }
      notification.error({
        message: '错误',
        description: errorMessage
      })
    } else if (error.request) {
      // 请求已发出但没有收到响应 (例如网络断开或服务器没有响应)
      notification.error({
        message: '错误',
        description: '服务器无响应，请检查网络或稍后再试！'
      })
    } else {
      // 发送请求时出了问题
      notification.error({
        message: '错误',
        description: '请求发送失败：' + error.message
      })
    }
    return Promise.reject(error)
  }
)

export default http
