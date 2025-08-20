import { AsyncLocalStorage } from 'async_hooks';

// 请求上下文中的用户类型定义（可根据实际用户结构扩展）
export type RequestUser = {
  id: string | number;
  username?: string;
};

// 请求上下文存储结构定义
export type RequestContextStore = {
  requestId: string;
  user?: RequestUser;
  path?: string;
  method?: string;
};

/**
 * 请求上下文（基于 AsyncLocalStorage）
 * 用途：在一次 HTTP 请求的调用链中传递“上下文数据”（requestId、user等），避免层层传参
 * 上游：在中间件初始化（RequestContextMiddleware），拦截器补充 user（UserContextInterceptor）
 * 下游：日志服务从此处读取用户与 requestId 信息，拼接到日志前缀中
 */
export class RequestContext {
  private static als = new AsyncLocalStorage<RequestContextStore>();

  // 在一个新的上下文中执行回调
  static run<T>(store: RequestContextStore, callback: () => T): T {
    return this.als.run(store, callback);
  }

  // 获取当前请求的上下文存储
  static getStore(): RequestContextStore | undefined {
    return this.als.getStore();
  }

  // 设置当前请求的用户信息（在Jwt守卫通过后由拦截器设置）
  static setUser(user?: RequestUser): void {
    const store = this.getStore();
    if (store) {
      store.user = user;
    }
  }
}
