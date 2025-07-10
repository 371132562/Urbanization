export enum ErrorCode {
  // 成功码 (1xxxx)
  SUCCESS = 10000,

  // 业务逻辑错误 (2xxxx)
  BUSINESS_FAILED = 20000, // 通用业务失败
  INVALID_INPUT = 20001, // 无效的输入/参数不合法
  RESOURCE_NOT_FOUND = 20002, // 业务资源未找到 (例如，请求了一个不存在的订单ID)
  DATA_STILL_REFERENCED = 20003, //数据被引用，无法删除
  DATA_EXIST = 20004, //数据已存在

  // 认证与权限错误 (3xxxx)
  UNAUTHORIZED = 30000, // 未认证 (例如，缺少token或token无效)
  FORBIDDEN = 30001, // 无权限 (例如，有token但权限不足)
  TOKEN_EXPIRED = 30002, // token 过期

  // 系统内部错误 (5xxxx)
  SYSTEM_ERROR = 50000, // 通用系统内部错误
  UNKNOWN_ERROR = 50001, // 未知错误
}

export type ResponseBody<T = any> = {
  code: ErrorCode;
  msg: string;
  data: T;
};
