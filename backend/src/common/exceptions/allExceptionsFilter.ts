import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { BusinessException } from './businessException';
import { ErrorCode } from '../../../types/response';

/**
 * 全局异常过滤器（AllExceptionsFilter）
 * 用途：捕获系统内抛出的所有异常（业务异常/HTTP异常/未知异常），并统一转换为 { code, msg, data } 的响应结构
 * 上游：Controller/Service 中的任何 throw（例如 throw new BusinessException(...) 或 throw new HttpException(...)）
 * 下游：统一写回 HTTP 响应，状态码始终为 200（具体业务错误码放在 code 字段中），并输出错误日志
 */
@Catch() // 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name); // 上游：被 Nest 注入使用；下游：输出到 Winston

  catch(exception: unknown, host: ArgumentsHost) {
    // 上游：来自当前处理的异常对象（可能是任意类型）
    // 下游：将异常转换为标准响应并写回
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>(); // 下游：写回 HTTP 响应
    const request = ctx.getRequest<Request>(); // 上游：读取请求信息用于日志

    let code: number; // 下游：响应中的业务码
    let msg: string; // 下游：响应中的消息
    let data: unknown = null; // 下游：响应中的数据，异常时通常为 null 或详细错误

    if (exception instanceof BusinessException) {
      // 2xxxx 范围：自定义业务异常（上游：业务主动抛出）
      const exceptionResponse = exception.getResponse() as {
        code: ErrorCode;
        message: string;
      };
      code = exceptionResponse.code || ErrorCode.BUSINESS_FAILED;
      msg = exceptionResponse.message || '业务处理失败';
      data = (exception as Error).message || '业务处理失败';
    } else if (exception instanceof ThrottlerException) {
      // 限流异常处理
      code = ErrorCode.THROTTLE_ERROR;
      msg = '请求过于频繁，请稍后再试';
      data = '接口限流保护，请降低请求频率';
    } else if (exception instanceof HttpException) {
      // 处理 HttpException，但所有响应都是 200 状态码（统一由下游包装）
      const exceptionResponse = exception.getResponse() as {
        code?: number;
        message?: string | string[];
      };

      // 如果是 BusinessException 的透传（理论上不会走到这里），直接使用其错误码和消息
      if (exceptionResponse.code) {
        code = exceptionResponse.code;
        msg = (exceptionResponse.message as string) || '业务处理失败';
      } else {
        // 其他 HttpException 的处理
        const responseMessage =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionResponse.message;

        msg = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage || exception.message || 'HTTP请求错误';

        // 对于 ValidationPipe 抛出的错误，其 message 可能是一个数组
        if (Array.isArray(responseMessage)) {
          data = responseMessage; // 将详细验证错误放入 data
        } else {
          data = null;
        }

        // 根据异常类型设置错误码
        if (exception.getStatus() === 400) {
          code = ErrorCode.INVALID_INPUT;
          msg = '请求参数错误';
        } else if (exception.getStatus() === 404) {
          code = ErrorCode.RESOURCE_NOT_FOUND;
          msg = '请求资源不存在';
        } else {
          code = ErrorCode.SYSTEM_ERROR;
          msg = '服务器内部错误';
        }
      }
    } else {
      // 5xxxx 范围：其他未知错误（上游：可能来自第三方库/未捕获错误）
      code = ErrorCode.UNKNOWN_ERROR; // 使用定义的未知错误码
      msg = '未知系统错误发生';
      data = (exception as Error).message || '服务器内部发生未知错误'; // 捕获原始错误消息（下游：仅在日志中用于排查）
    }

    // 统一错误日志输出（下游：Winston -> 控制台/文件）
    const logMessage = `【${request.method}】${request.url} - ${code} - ${msg}`;
    this.logger.error(logMessage, (exception as Error).stack);

    // 统一返回 200 状态码，真正的业务错误码在 'code' 字段中（下游：前端）
    response.status(HttpStatus.OK).json({
      code,
      msg,
      data,
    });
  }
}
