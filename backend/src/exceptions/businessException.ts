import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../types/response';

export class BusinessException extends HttpException {
  constructor(code: ErrorCode = ErrorCode.BUSINESS_FAILED, message?: string) {
    // 强制 HTTP 状态码为 200，以便异常过滤器能统一处理
    // 这里的 200 只是为了让请求成功返回，真正的业务错误码由 code 决定
    super({ code, message: message || '业务处理失败' }, HttpStatus.OK);
  }
}
