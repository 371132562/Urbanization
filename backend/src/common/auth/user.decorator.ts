import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type UserInfo = {
  userId: string;
  userCode: string;
  userName: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
    allowedRoutes: string[];
  };
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
