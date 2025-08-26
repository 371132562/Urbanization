import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

/**
 * 日期时间处理工具（基于 dayjs）
 * 用途：提供带有默认时区（Asia/Shanghai）的 dayjs 实例与若干常用的年份处理函数
 * 上游：被各业务 Service 用于格式化导出文件名、记录日志时间戳、年份计算等
 * 下游：仅返回基础类型（number/string/Date），不直接产生副作用
 */

// 扩展 dayjs 插件（下游：为 dayjs 添加 UTC/时区能力）
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为北京时间（下游：所有 dayjs.tz 调用默认使用该时区）
dayjs.tz.setDefault('Asia/Shanghai');

/**
 * 获取年份数字
 * @param date 日期对象或字符串
 * @returns 年份数字
 */
export const getYear = (date: Date | string | number): number => {
  return dayjs.tz(date, 'Asia/Shanghai').year();
};

/**
 * 将年份数字转换为标准化的日期对象（用于数据库查询）
 * @param year 年份数字
 * @returns 标准化的日期对象（当年6月1日）
 */
export const yearToDate = (year: number): Date => {
  return dayjs.tz(`${year}-06-01`, 'Asia/Shanghai').toDate();
};

/**
 * 将日期对象转换为年份数字
 * @param date 日期对象
 * @returns 年份数字
 */
export const dateToYear = (date: Date): number => {
  return dayjs.tz(date, 'Asia/Shanghai').year();
};

/**
 * 获取当前年份
 * @returns 当前年份数字
 */
export const getCurrentYear = (): number => {
  return dayjs.tz('Asia/Shanghai').year();
};

/**
 * 验证年份是否有效
 * @param year 年份数字
 * @returns 是否有效（1900-2100）
 */
export const isValidYear = (year: number): boolean => {
  return year >= 1900 && year <= 2100;
};

/**
 * 格式化年份显示
 * @param year 年份数字
 * @returns 格式化后的年份字符串（例：2024年）
 */
export const formatYear = (year: number): string => {
  return `${year}年`;
};

// 导出配置好的 dayjs 实例，供上游调用（下游：无副作用）
export default dayjs;
