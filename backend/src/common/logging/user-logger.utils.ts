import { createLogger, format, transports, Logger } from 'winston';
import 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * 用户级日志工具
 * 用途：为每个用户编号创建/复用独立的 winston 日志器，将该用户的日志写入独立目录并按日滚动
 * 上游：`WinstonLoggerService` 在检测到上下文中存在用户编号时调用
 * 下游：写入到磁盘目录 LOG_DIR/users/<userId>/application-*.log
 */

const userLoggers = new Map<string, Logger>();

// 创建与缓存用户专属日志器
export const getUserLogger = (userId: string): Logger => {
  if (userLoggers.has(userId)) {
    return userLoggers.get(userId)!;
  }

  const baseLogDir = process.env.LOG_DIR || './logs';
  const userDir = join(baseLogDir, 'users', userId);
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  // 确保用户目录下的审计目录存在：LOG_DIR/users/<userId>/audit
  const userAuditDir = join(userDir, 'audit');
  if (!existsSync(userAuditDir)) {
    mkdirSync(userAuditDir, { recursive: true });
  }

  // 将 info 与 error 拆分为不同文件，避免重复与冲突
  const userLogger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
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
      new transports.DailyRotateFile({
        filename: join(userDir, 'application-info-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        zippedArchive: false,
        maxSize: '100m',
        maxFiles: '30d',
        auditFile: join(userAuditDir, 'application-info-audit.json'),
      }),
      new transports.DailyRotateFile({
        filename: join(userDir, 'application-error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        zippedArchive: false,
        maxSize: '100m',
        maxFiles: '30d',
        auditFile: join(userAuditDir, 'application-error-audit.json'),
      }),
    ],
  });

  userLoggers.set(userId, userLogger);
  return userLogger;
};
