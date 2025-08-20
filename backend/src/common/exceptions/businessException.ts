import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../../types/response';

/**
 * 业务异常（BusinessException）
 * 用途：在业务逻辑中主动抛出，交由全局异常过滤器统一转换为标准响应结构
 * 上游：业务 Service/Controller 在校验失败、资源不存在、权限不足等场景调用 throw new BusinessException(...)
 * 下游：被 `AllExceptionsFilter` 捕获并格式化为 { code, msg, data } 的统一响应；HTTP 状态码保持 200
 */
export class BusinessException extends HttpException {
  constructor(code: ErrorCode = ErrorCode.BUSINESS_FAILED, message?: string) {
    // 强制 HTTP 状态码为 200，以便异常过滤器能统一包装响应
    // 注意：真正的业务错误码由 code 决定，HTTP 层始终 200 便于前端统一处理
    super({ code, message: message || '业务处理失败' }, HttpStatus.OK);
  }
}
