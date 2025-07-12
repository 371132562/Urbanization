import { Injectable, LoggerService } from '@nestjs/common';
import { logger as winstonLogger } from './logger';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  log(message: any, ...optionalParams: any[]) {
    winstonLogger.info(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    winstonLogger.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    winstonLogger.warn(message, ...optionalParams);
  }

  debug?(message: any, ...optionalParams: any[]) {
    winstonLogger.debug(message, ...optionalParams);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    winstonLogger.verbose(message, ...optionalParams);
  }
} 