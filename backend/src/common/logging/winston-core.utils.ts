import { createLogger, format, transports } from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import 'winston-daily-rotate-file';

/**
 * 日志核心（Winston 实例）
 * 用途：提供进程级的 Winston 日志器，负责控制台输出与按日滚动的文件输出
 * 上游：`WinstonLoggerService` 封装了业务友好的 LoggerService 接口；任何模块调用 logger.*()
 * 下游：写入到控制台（开发/容器）与磁盘（生产）；文件路径受环境变量 LOG_DIR 控制
 */
// 过滤器：在 info 文件中排除 error 级别，避免重复与冲突
const excludeErrorFormat = format((info) =>
  info.level === 'error' ? false : info,
);

// 确保审计文件目录存在：LOG_DIR/audit
const baseLogDir = process.env.LOG_DIR || './logs';
const auditDir = join(baseLogDir, 'audit');
if (!existsSync(auditDir)) {
  mkdirSync(auditDir, { recursive: true });
}

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    // 注入时间戳，便于排查（上游：业务日志；下游：控制台/文件）
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    // 附带错误堆栈
    format.errors({ stack: true }),
    // 支持 printf 中的 %s/%d 等格式化
    format.splat(),
    // 输出 JSON 便于收集
    format.json(),
    // 终端/文件的最终文本格式
    format.printf(
      ({
        level,
        message,
        timestamp,
      }: {
        level;
        message: string;
        timestamp: string;
      }) => {
        return `${timestamp} ${level}: ${message}`;
      },
    ),
  ),
  transports: [
    // 控制台输出（上游：开发/容器调试）
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
    // 文件输出（按日滚动）- info 级别（排除 error，独立文件）
    new transports.DailyRotateFile({
      filename: process.env.LOG_DIR + '/application-info-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      zippedArchive: false,
      maxSize: '30m',
      maxFiles: '30d',
      format: format.combine(excludeErrorFormat()),
      auditFile: join(auditDir, 'application-info-audit.json'),
    }),
    // 文件输出（按日滚动）- error 级别（独立文件）
    new transports.DailyRotateFile({
      filename: process.env.LOG_DIR + '/application-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: false,
      maxSize: '30m',
      maxFiles: '30d',
      auditFile: join(auditDir, 'application-error-audit.json'),
    }),
  ],
});
