import { Button, Result } from 'antd'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

type IProps = {
  error?: Error
  resetErrorBoundary?: () => void
}

const ErrorPage = ({ error: propsError, resetErrorBoundary }: IProps) => {
  const navigate = useNavigate()
  // React Router 会自动捕获路由错误，并通过这个 hook 提供
  const routeError = useRouteError()

  // 优先使用路由错误，其次是 props 传入的错误
  const error = routeError || propsError

  let status: '403' | '404' | '500' | 'error' = '500'
  let title = '抱歉，服务器出现了一些问题'
  let subTitle

  if (isRouteErrorResponse(error)) {
    status = error.status as any
    title = error.statusText || '发生未知路由错误'
    subTitle = error.data
  } else if (error instanceof Error) {
    title = '抱歉，页面出现了一些问题'
    subTitle = error.message
  }

  const handleRetry = () => {
    if (resetErrorBoundary) {
      // react-error-boundary 会注入这个函数，用于尝试重新渲染
      resetErrorBoundary()
    } else {
      // 对于路由错误，我们可以刷新页面来重试
      navigate(0)
    }
  }

  return (
    <Result
      status={status}
      title={title}
      subTitle={subTitle}
      extra={
        <Button
          type="primary"
          onClick={handleRetry}
        >
          重试
        </Button>
      }
    >
      {/* 在开发环境下，打印完整的错误信息方便调试 */}
      {import.meta.env.DEV && (
        <pre
          style={{
            textAlign: 'left',
            margin: '1rem',
            padding: '10px',
            background: '#f0f0f0',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
        </pre>
      )}
    </Result>
  )
}

export default ErrorPage
