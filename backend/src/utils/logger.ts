import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

export const logger = createLogger({
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
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH-mm-ss',
      level: 'info',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
    new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH-mm-ss',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
