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
  INVALID_CREDENTIALS = 30003, // 用户名或密码错误
  // USER_NOT_FOUND = 30004, // 用户不存在（已用4xxxx覆盖）
  ACCOUNT_DISABLED = 30005, // 账户被禁用
  PASSWORD_INCORRECT = 30006, // 密码错误

  // 角色管理相关错误 (4xxxx)
  ROLE_NOT_FOUND = 40001, // 角色不存在
  ROLE_NAME_EXIST = 40002, // 角色名已存在
  ROLE_CANNOT_DELETE_ADMIN = 40003, // 超管角色不可删除
  ROLE_CANNOT_EDIT_ADMIN = 40004, // 超管角色不可编辑

  // 用户管理相关错误 (4xxxx)
  USER_NOT_FOUND = 40011, // 用户不存在
  USER_CODE_EXIST = 40012, // 用户编号已存在
  USER_CANNOT_DELETE_ADMIN = 40013, // 超管用户不可删除
  USER_CANNOT_EDIT_ADMIN = 40014, // 超管用户不可编辑

  // 系统内部错误 (5xxxx)
  SYSTEM_ERROR = 50000, // 通用系统内部错误
  UNKNOWN_ERROR = 50001, // 未知错误
}

export type ResponseBody<T = any> = {
  code: ErrorCode;
  msg: string;
  data: T;
};
