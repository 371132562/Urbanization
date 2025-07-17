import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import { LoggerService } from '@nestjs/common';

// 从环境变量中获取日志根目录，如果未设置，则默认为 'logs'
// 这样做是为了兼容没有 Electron 环境的纯后端开发/调试场景
const logPathBase = process.env.LOG_PATH || 'logs';

// 创建基础winston logger实例
const winstonLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.printf(
      ({
        level,
        message,
        timestamp,
      }: {
        level: string;
        message: string;
        timestamp: string;
      }) => {
        return `${timestamp} ${level}: ${message}`;
      },
    ),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({
            level,
            message,
            timestamp,
          }: {
            level: string;
            message: string;
            timestamp: string;
          }) => {
            return `${timestamp} ${level}: ${message}`;
          },
        ),
      ),
    }),
    new transports.DailyRotateFile({
      // 使用 path.join 来确保路径在不同操作系统上都能正确拼接
      filename: path.join(logPathBase, 'application-info-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
    new transports.DailyRotateFile({
      filename: path.join(logPathBase, 'application-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// 创建一个实现NestJS LoggerService接口的日志服务
export class CustomLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  log(message: any, context?: string): void {
    const contextMessage = this.formatContext(context || this.context);
    winstonLogger.info(`${contextMessage}${message}`);
  }

  error(message: any, trace?: string, context?: string): void {
    const contextMessage = this.formatContext(context || this.context);
    winstonLogger.error(
      `${contextMessage}${message}${trace ? `\n${trace}` : ''}`,
    );
  }

  warn(message: any, context?: string): void {
    const contextMessage = this.formatContext(context || this.context);
    winstonLogger.warn(`${contextMessage}${message}`);
  }

  debug(message: any, context?: string): void {
    const contextMessage = this.formatContext(context || this.context);
    winstonLogger.debug(`${contextMessage}${message}`);
  }

  verbose(message: any, context?: string): void {
    const contextMessage = this.formatContext(context || this.context);
    winstonLogger.verbose(`${contextMessage}${message}`);
  }

  private formatContext(context?: string): string {
    return context ? `[${context}] ` : '';
  }
}

// 导出一个默认实例，供NestJS应用程序使用
export const logger = new CustomLogger();
