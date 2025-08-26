import { Injectable, LoggerService } from '@nestjs/common';
import { logger as winstonLogger } from '../logging/winston-core.utils';
import { RequestContext } from '../context/request-context.utils';
import { getUserLogger } from '../logging/user-logger.utils';

/**
 * 应用级日志服务（WinstonLoggerService）
 * 用途：实现 Nest 的 LoggerService 接口，统一入口；自动拼接用户信息前缀
 * 上游：在 bootstrap 中被注入为全局 logger；各 Service/Interceptor 调用 this.logger.*()
 * 下游：委托给 winston 实例写入控制台/文件；前缀从 RequestContext 读取 [用户编号] [用户名称]
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  // 统一构造日志前缀；按需求输出 [用户编号] [用户名称]
  private withPrefix(message: unknown): {
    prefix: string;
    userId: string;
    message: string;
  } {
    const ctx = RequestContext.getStore();
    const userId = ctx?.user?.id ?? '访客';
    const userName = ctx?.user?.username ?? '访客';
    const text =
      typeof message === 'string' ? message : JSON.stringify(message);
    return {
      prefix: `[编号:${userId}] [用户名:${userName}] `,
      userId: String(userId),
      message: text,
    };
  }

  private writeToUserFile(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    text: string,
  ): void {
    const ctx = RequestContext.getStore();
    const userId = ctx?.user?.id;
    if (userId && userId !== '访客') {
      const userLogger = getUserLogger(String(userId));
      userLogger.log({ level, message: text });
    }
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    const { prefix, message: raw } = this.withPrefix(message);
    const text = `${prefix}${raw}`;
    winstonLogger.info(text, ...(optionalParams as []));
    this.writeToUserFile('info', text);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const { prefix, message: raw } = this.withPrefix(message);
    const text = `${prefix}${raw}`;
    winstonLogger.error(text, ...(optionalParams as []));
    this.writeToUserFile('error', text);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    const { prefix, message: raw } = this.withPrefix(message);
    const text = `${prefix}${raw}`;
    winstonLogger.warn(text, ...(optionalParams as []));
    this.writeToUserFile('warn', text);
  }

  debug?(message: unknown, ...optionalParams: unknown[]): void {
    const { prefix, message: raw } = this.withPrefix(message);
    const text = `${prefix}${raw}`;
    winstonLogger.debug(text, ...(optionalParams as []));
    this.writeToUserFile('debug', text);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]): void {
    const { prefix, message: raw } = this.withPrefix(message);
    const text = `${prefix}${raw}`;
    winstonLogger.verbose(text, ...(optionalParams as []));
    this.writeToUserFile('verbose', text);
  }
}
