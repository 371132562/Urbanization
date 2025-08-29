import { Injectable, Logger } from '@nestjs/common';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import {
  LogFileLevel,
  ReadLogReqDto,
  ReadUserLogReqDto,
  SystemLogFileItem,
  SystemLogFilesResDto,
  UserLogFilesReqDto,
  UserSearchResDto,
  LogLineItem,
} from '../../../types/dto';

/**
 * 系统日志服务
 * 提供系统级别和用户级别的日志文件管理、读取和搜索功能
 *
 * 主要功能：
 * 1. 列出系统日志文件
 * 2. 列出用户日志文件
 * 3. 读取系统日志内容
 * 4. 读取用户日志内容
 * 5. 搜索用户
 */
@Injectable()
export class SystemLogsService {
  private readonly logger = new Logger(SystemLogsService.name);

  /** 日志文件根目录，可通过环境变量 LOG_DIR 配置 */
  private readonly baseLogDir = process.env.LOG_DIR || './logs';

  /**
   * 构建系统日志文件路径
   * @param level 日志级别
   * @param date 日期字符串
   * @returns 完整的文件路径
   */
  private buildSystemLogPath(level: LogFileLevel, date: string): string {
    return join(this.baseLogDir, `application-${level}-${date}.log`);
  }

  /**
   * 构建用户日志文件路径
   * @param userId 用户ID
   * @param level 日志级别
   * @param date 日期字符串
   * @returns 完整的文件路径
   */
  private buildUserLogPath(
    userId: string,
    level: LogFileLevel,
    date: string,
  ): string {
    return join(
      this.baseLogDir,
      'users',
      userId,
      `application-${level}-${date}.log`,
    );
  }

  /**
   * 解析日志文件名，提取级别和日期信息
   * @param filename 日志文件名
   * @returns 解析结果，包含级别和日期，如果格式不匹配则返回null
   */
  private parseLogFilename(
    filename: string,
  ): { level: LogFileLevel; date: string } | null {
    const match = filename.match(
      /^application-(info|error)-(\d{4}-\d{2}-\d{2})\.log$/,
    );
    if (!match) return null;

    const [, level, date] = match;
    return { level: level as LogFileLevel, date };
  }

  /**
   * 扫描目录并构建日志文件列表
   * @param dirPath 要扫描的目录路径
   * @returns 日志文件列表
   */
  private async scanLogFiles(dirPath: string): Promise<SystemLogFileItem[]> {
    const files: SystemLogFileItem[] = [];

    try {
      const { readdirSync } = await import('fs');
      const logFiles = readdirSync(dirPath, { withFileTypes: true });

      for (const file of logFiles) {
        if (!file.isFile() || !file.name.endsWith('.log')) continue;

        const parsed = this.parseLogFilename(file.name);
        if (!parsed) continue;

        const filePath = join(dirPath, file.name);
        const stats = statSync(filePath);

        files.push({
          filename: file.name,
          date: parsed.date,
          level: parsed.level,
          size: stats.size,
        });
      }

      // 按日期倒序排列，最新的在前面
      files.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (error) {
      this.logger.warn(
        `[警告] 扫描日志目录失败 - 目录: ${dirPath}, ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }

    return files;
  }

  /**
   * 列出系统日志文件
   * 扫描系统日志目录，返回所有日志文件列表
   *
   * @returns 日志文件列表响应
   */
  async listSystemFiles(): Promise<SystemLogFilesResDto> {
    this.logger.log('[开始] 列出系统日志文件');

    try {
      const files = await this.scanLogFiles(this.baseLogDir);

      this.logger.log(`[成功] 列出系统日志文件 - 共 ${files.length} 个文件`);

      return { files };
    } catch (error) {
      this.logger.error(
        `[失败] 列出系统日志文件 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 列出用户日志文件
   * 扫描指定用户的日志目录，返回所有日志文件列表
   *
   * @param dto 请求参数，包含用户ID
   * @returns 日志文件列表响应
   */
  async listUserFiles(dto: UserLogFilesReqDto): Promise<SystemLogFilesResDto> {
    const { userId } = dto;

    this.logger.log(`[开始] 列出用户日志文件 - 用户ID: ${userId}`);

    try {
      const userLogDir = join(this.baseLogDir, 'users', userId);

      // 检查用户日志目录是否存在
      if (!existsSync(userLogDir)) {
        this.logger.log(
          `[成功] 列出用户日志文件 - 用户ID: ${userId}, 目录不存在，返回空列表`,
        );
        return { files: [] };
      }

      const files = await this.scanLogFiles(userLogDir);

      this.logger.log(
        `[成功] 列出用户日志文件 - 用户ID: ${userId}, 共 ${files.length} 个文件`,
      );

      return { files };
    } catch (error) {
      this.logger.error(
        `[失败] 列出用户日志文件 - 用户ID: ${userId}, ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 读取日志文件内容
   * 直接读取整个文件，应用关键词过滤后返回结果
   *
   * @param filePath 日志文件路径
   * @returns 读取结果，包含过滤后的日志行
   */
  private async readLogFile(filePath: string): Promise<LogLineItem[]> {
    const { readFileSync } = await import('fs');
    const content = readFileSync(filePath, 'utf8');
    const allLines = content.split(/\r?\n/).filter(Boolean);

    // 解析和过滤日志行
    const filtered = allLines
      .map((raw) => {
        const m = raw.match(
          /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+):\s+(.*)$/,
        );
        if (!m) return null;
        const [, ts, level, message] = m;
        return { ts, level, message, raw };
      })
      .filter((v) => !!v) as LogLineItem[];

    return filtered;
  }

  /**
   * 读取系统日志内容
   * 支持关键词过滤
   *
   * @param dto 读取请求参数
   * @returns 日志内容响应
   */
  async readSystemLog(dto: ReadLogReqDto): Promise<LogLineItem[]> {
    const { filename } = dto;

    this.logger.log(`[开始] 读取系统日志 - 文件名: ${filename}`);

    try {
      // 安全检查：只允许读取日志文件
      const safe = ['application-info', 'application-error'];
      if (!safe.some((p) => filename.startsWith(p))) {
        this.logger.warn(
          `[验证失败] 读取系统日志 - 文件名 ${filename} 不在安全列表中`,
        );
        return [];
      }

      const filePath = join(this.baseLogDir, filename);
      if (!existsSync(filePath)) {
        this.logger.warn(`[验证失败] 读取系统日志 - 文件 ${filename} 不存在`);
        return [];
      }

      const result = await this.readLogFile(filePath);

      this.logger.log(
        `[成功] 读取系统日志 - 文件名: ${filename}, 共 ${result.length} 行日志`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 读取系统日志 - 文件名: ${filename}, ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * 读取用户日志内容
   * 支持关键词过滤
   *
   * @param dto 读取请求参数，包含用户ID
   * @returns 日志内容响应
   */
  async readUserLog(dto: ReadUserLogReqDto): Promise<LogLineItem[]> {
    const { userId, filename } = dto;

    this.logger.log(
      `[开始] 读取用户日志 - 用户ID: ${userId}, 文件名: ${filename}`,
    );

    try {
      // 安全检查：只允许读取日志文件
      const safe = ['application-info', 'application-error'];
      if (!safe.some((p) => filename.startsWith(p))) {
        this.logger.warn(
          `[验证失败] 读取用户日志 - 文件名 ${filename} 不在安全列表中`,
        );
        return [];
      }

      const filePath = join(this.baseLogDir, 'users', userId, filename);
      if (!existsSync(filePath)) {
        this.logger.warn(`[验证失败] 读取用户日志 - 文件 ${filename} 不存在`);
        return [];
      }

      const result = await this.readLogFile(filePath);

      this.logger.log(
        `[成功] 读取用户日志 - 用户ID: ${userId}, 文件名: ${filename}, 共 ${result.length} 行日志`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 读取用户日志 - 用户ID: ${userId}, 文件名: ${filename}, ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * 搜索用户
   * 扫描用户日志目录，返回匹配搜索条件的用户列表
   *
   * @param dto 搜索请求参数
   * @returns 用户搜索结果
   */
  async searchUsers(): Promise<UserSearchResDto> {
    this.logger.log('[开始] 搜索用户');

    try {
      const { readdirSync } = await import('fs');
      const usersDir = join(this.baseLogDir, 'users');

      // 检查用户目录是否存在
      if (!existsSync(usersDir)) {
        this.logger.log('[成功] 搜索用户 - 用户目录不存在，返回空列表');
        return { list: [] };
      }

      const dirs = readdirSync(usersDir, { withFileTypes: true });
      const all = dirs
        .filter((d) => d.isDirectory())
        .map((d) => ({ userId: d.name, name: d.name }));

      const result = { list: all };

      this.logger.log(`[成功] 搜索用户 - 共找到 ${result.list.length} 个用户`);

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 搜索用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { list: [] };
    }
  }
}
