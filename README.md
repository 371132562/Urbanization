# 世界城镇化水平统计分析系统

## 项目简介

本项目是一个世界各国城镇化水平统计分析系统，采用前后端分离架构，支持数据管理、指标分析、综合评价等功能。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **UI组件库**: Ant Design 5
- **路由**: React Router 7
- **样式**: Tailwind CSS + Ant Design
- **图表**: ECharts
- **编辑器**: WangEditor

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: SQLite + Prisma ORM
- **文件上传**: Multer
- **日志**: Winston
- **静态文件服务**: @nestjs/serve-static

## 项目结构

```
Urbanization/
├── frontend/                 # 正式前端项目
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # 状态管理
│   │   ├── services/       # API服务（Axios实例在 services/base.ts）
│   │   ├── types/          # 类型定义（见 src/types/index.ts）
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── dist/               # 构建输出
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── businessModules/  # 业务模块
│   │   ├── commonModules/    # 公共模块
│   │   ├── common/           # 公共文件
│   │   ├── exceptions/       # 异常处理（common/exceptions）
│   │   ├── interceptors/     # 拦截器（common/interceptors）
│   │   ├── upload/           # 文件上传（commonModules/upload + common/upload）
│   │   └── utils/            # 工具函数
│   ├── prisma/               # 数据库配置
│   └── types/                # 类型定义
```

## 开发说明

### 开发环境要求

- Node.js >= 20
- pnpm >= 8
- Git

### 安装依赖

```bash
# 安装根目录依赖
pnpm install
```

### 开发规范

#### 项目架构与开发规范
- 此项目是monorepo项目，包含frontend和backend两个子项目
- 依赖管理统一使用pnpm，部分依赖会安装在根目录下的package中，避免重复安装
- 前端使用Vite作为构建工具
- 前端后端均使用TypeScript开发
- 每次单步生成尽量修改相关性较强的模块和文件，避免大范围修改不同模块
- 代码中必须书写简洁明了的功能解释中文注释
- 文件名命名优先采用驼峰命名法camelCase
- git commit 要符合规范，以feat，fix，chore等开头然后书写具体内容

#### 类型系统规范
- TypeScript开发中必须优先使用type而非interface
- 所有数据结构必须使用TypeScript类型定义，禁止使用any
- 复杂对象使用交叉类型或联合类型
- 类型定义优先放在backend/types目录下供前后端共用
- 所有请求/响应数据结构必须有TypeScript类型定义
- 所有代码都需要改正eslint错误

#### 前端开发规范
- 组件命名采用PascalCase
- pages目录下的页面组件应专注于界面展示，避免复杂数据处理逻辑
- Props必须明确定义TypeScript类型
- 使用受控组件处理表单，避免直接操作DOM
- useEffect必须明确声明依赖项
- 使用React.memo优化组件性能
- 公共逻辑提取为自定义Hook或HOC
- 变量/函数使用camelCase，类/接口用PascalCase，常量用UPPER_SNAKE_CASE
- api地址写在apis.ts文件中,在stores文件中进行调用和数据层的逻辑

#### 前端样式规范
- 样式方案优先级：Ant Design > Tailwind CSS > CSS Modules
- 避免使用全局样式
- 保持全局风格一致性
- 加载效果优先使用骨架屏

#### 状态管理与API调用
- 统一使用Zustand进行状态管理
- 数据处理逻辑集中在stores目录
- API地址统一在services/apis.ts或common.ts中定义
- 使用services/base.ts中的Axios实例处理请求
- 错误处理统一在拦截器中处理
- 组件中避免直接调用API

#### 后端开发规范
- 接口必须统一使用POST方法
- 业务错误需返回合适的Error信息，优先使用自定义的BusinessException搭配ErrorCode
- 新增错误类型时在ErrorCode中定义
- 遵循NestJS最佳实践
- 使用Prisma处理数据库操作

## 用户认证与权限管理

### 认证体系
- **认证方式**: JWT Token认证
- **登录接口**: `/auth/login`，支持用户编号(code) + 密码登录

### 路由权限配置
- **路由配置**: 在 `frontend/src/router/routesConfig.tsx` 中统一配置，运行时由 `frontend/src/router.tsx` 动态生成 `RouteObject[]`
- **权限字段**:
  - `adminOnly: true`: 系统管理菜单仅超管可见，不参与权限分配
  - 其余菜单基于角色的 `allowedRoutes` 精确到叶子路由筛选（见 `getFilteredRoutes`）

### 初始数据
- **种子数据**: 通过 `backend/prisma/seed.js` 初始化
- **超管角色**: 自动创建 admin 角色，`allowedRoutes` 为空数组
- **超管用户**: 自动创建编号为 `88888888` 的超管用户，绑定 admin 角色
- **初始密码**: 超管初始密码为 `88888888`（账号与密码均为 8 个 8）

### 启动开发服务器

```bash
# 启动后端服务
cd backend
pnpm start:dev

# 启动前端服务（新终端）
cd frontend
pnpm dev
```

### 数据库操作

```bash
# 生成Prisma客户端
cd backend
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 查看数据库
npx prisma studio
```

## Docker镜像讲解

本项目使用 GitHub Actions 进行自动化构建和 Docker 镜像发布：

### GitHub工作流
- **触发条件**: 推送代码到 `master` 分支时自动触发
- **构建内容**: 自动构建主客户端（frontend）和8个测试客户端包，每个包均包含完整的前后端启动后可以直接访问端口使用
- **发布方式**: 自动创建GitHub Release，包含所有客户端的运行包

> ⚠️ 说明：**frontend** 该目录为正式前端，其他八个前端仅供测试或演示，普通用户可忽略，无需下载和部署。

## 部署说明

### 环境配置

项目使用环境变量进行配置，请根据部署环境创建相应的环境文件：

- 前端（示例 `.env.development` / `.env.production`）
  - `VITE_DEPLOY_PATH=/` 或 `/urbanization`（用于子路径部署，`router` 的 `basename` 来源）
  - `VITE_API_BASE_URL=/api`（后端全局前缀为 `/api`）

- 后端（示例 `.env.development` / `.env.production`）
  - `PORT=3888`
  - `DEPLOY_PATH=/` 或 `/urbanization`（影响静态文件 `serveRoot`）
  - `UPLOAD_DIR=./db/images`（图片物理存储路径）

### 部署方式

> ⚠️ **重要提示**：以下所有配置文件和命令仅供参考，请根据实际部署环境和需求进行调整。

本项目支持两种部署方式：

#### 方式一：Docker Compose 部署（可以用于根目录部署）

适用于将应用部署在服务器根目录下的场景，如 `http://yourdomain.com/`。

**1. 环境配置**
```bash
# 后端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
DEPLOY_PATH=/
PORT=3888
UPLOAD_DIR=./db/images

# 前端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
VITE_DEPLOY_PATH=/
```

**2. 启动服务**
```bash
# 启动服务 - 仅供参考，请根据实际情况调整
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

**3. 访问方式**
- **应用地址**: `http://yourdomain.com:1818`
- **API接口**: `http://yourdomain.com:1818/api/`（后端 `main.ts` 全局前缀）
- **图片资源**: `http://yourdomain.com:1818/images/`（由 `ServeStaticModule` 基于 `DEPLOY_PATH` + `images` 提供）

**4. 端口映射**
- 容器端口: 3888
- 主机端口: 1818（见 `docker-compose.yml` 映射 `1818:3888`）

**5. 数据持久化**
- 数据库文件: 通过Docker卷持久化到 `./db` 目录
- 上传文件: 存储在 `./db/images` 目录
- 日志文件: 存储在 `./db/logs` 目录

#### 方式二（推荐）：Nginx 反向代理部署（可用于任意路径部署）

适用于将应用部署在服务器子路径下的场景，如 `http://yourdomain.com/urbanization/`。

**1. 环境配置**
```bash
# 后端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
DEPLOY_PATH="/"
PORT="3888"

# 前端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
VITE_DEPLOY_PATH=/urbanization
```
```bash
# 根目录下安装依赖
pnpm install
```

**2. 前端构建**

```bash
# 构建前端项目 - 仅供参考，请根据实际情况调整
cd frontend
pnpm build

# 创建nginx静态文件目录 - 仅供参考，请根据实际情况调整
sudo mkdir -p /usr/local/var/www/dist

# 复制前端构建产物 - 仅供参考，请根据实际情况调整
sudo cp -r dist/* /usr/local/var/www/dist/
```

**3. 后端启动**
```bash
# 启动后端服务 - 仅供参考，请根据实际情况调整
cd backend
pnpm build
node ./dist/src/main 
```
注意后端服务默认包含前缀 `/api`

**4. Nginx配置**
Linux 请编辑 `/etc/nginx/nginx.conf`（macOS 可参考 `/usr/local/etc/nginx/nginx.conf`），在 http 块中添加以下配置（仅供参考，请根据实际情况调整）：

```nginx
 server {
        listen       80;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        # /urbanization/api/ 路径反向代理到本地3888端口（优先级最高）
        location /urbanization/api/ {
            proxy_pass http://127.0.0.1:3888/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 处理跨域
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS, PUT, DELETE';
            add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';

            # 处理 OPTIONS 预检
            if ($request_method = 'OPTIONS') {
                return 204;
            }

            # 文件上传与超时配置（需与后端 main.ts 限制相匹配）
            client_max_body_size 10M;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # /urbanization/images/ 路径反向代理到本地3888端口（图片静态文件）
        location /urbanization/images/ {
            proxy_pass http://127.0.0.1:3888/images/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # /urbanization 路径指向前端dist目录（支持带斜杠和不带斜杠的访问）
        location /urbanization {
            # 处理不带斜杠的访问，重定向到带斜杠的路径
            rewrite ^/urbanization$ /urbanization/ permanent;
        }
        
        location /urbanization/ {
            alias /var/www/urbanization/frontend/dist/;
            index index.html index.htm;
            try_files $uri $uri/ /urbanization/index.html;
            
            # 为JavaScript模块设置正确的MIME类型
            location ~* \.(js|mjs)$ { add_header Content-Type application/javascript; }
            # 为CSS文件设置正确的MIME类型
            location ~* \.css$   { add_header Content-Type text/css; }
            # 为其他静态资源设置正确的MIME类型
            location ~* \.(png|jpg|jpeg|gif|ico|svg)$ { add_header Content-Type image/png; }
            location ~* \.(woff|woff2|ttf|eot)$ { add_header Content-Type font/woff; }
        }

        # 默认路径配置（注释掉原来的配置）
        location / {
            root   html;
            index  index.html index.htm;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
```

**5. 重启Nginx**
```bash
# 检查配置语法 - 仅供参考，请根据实际情况调整
sudo nginx -t

# 重新加载配置 - 仅供参考，请根据实际情况调整
sudo nginx -s reload
```

**6. 访问方式**
- **前端页面**: `http://yourdomain.com/urbanization`
- **后端API**: `http://yourdomain.com/urbanization/api/exampleApi`
- **图片资源**: `http://yourdomain.com/urbanization/images/filename.jpg`

### 部署注意事项

#### 通用注意事项
1. **环境变量**: 确保生产环境的环境变量配置正确
2. **数据备份**: 定期备份数据库文件和上传文件
3. **端口冲突**: 确保部署端口未被占用
4. **资源限制**: 根据服务器配置调整资源限制
5. **网络配置**: 如需外部访问，请配置相应的防火墙规则

#### Docker部署注意事项
1. **镜像构建**: 确保Dockerfile配置正确
2. **数据卷**: 检查数据卷挂载路径和权限
3. **网络**: 确保容器间网络通信正常
4. **日志**: 定期清理容器日志文件

#### Nginx部署注意事项
1. **路径配置**: 确保DEPLOY_PATH与nginx配置一致
2. **静态文件**: 确保前端构建产物路径正确
3. **MIME类型**: 检查静态资源的MIME类型配置
4. **文件上传权限**: 确保nginx临时文件目录权限正确
5. **图片静态文件**: 确保nginx配置了图片静态文件代理路径

#### 常见问题排查

##### 文件上传接口问题
**问题描述**: 访问 `http://localhost/urbanization/api/upload` 时出现nginx错误页面，显示"An error occurred"。

**可能原因**:
1. **nginx临时文件目录权限不足**: nginx无法写入临时文件目录
2. **后端服务未启动**: 3333端口无服务响应
3. **nginx配置错误**: location块匹配优先级问题

**解决方案(仅供参考，根据实际情况调整)**:

1. **修复nginx权限问题**:
```bash
# 修复nginx临时文件目录权限
sudo chown -R $(whoami):admin /usr/local/var/run/nginx
sudo chmod -R 755 /usr/local/var/run/nginx

# 重新加载nginx配置
sudo nginx -s reload
```

2. **检查后端服务状态**:
```bash
# 检查3333端口是否有服务运行
lsof -i :3888

# 如果服务未运行，启动后端服务
cd backend
pnpm start:dev
```

3. **验证API代理配置**:
```bash
# 测试直接访问后端API
curl -X POST http://127.0.0.1:3888/api/upload -F "file=@/dev/null"

# 测试通过nginx代理访问API
curl -X POST http://localhost/urbanization/api/upload -F "file=@/dev/null"
```

4. **检查nginx错误日志**:
```bash
# 查看nginx错误日志
sudo tail -f /usr/local/var/log/nginx/error.log
```

**预期结果**: 
- 直接访问后端API应返回业务错误信息（如"不支持的文件类型"）
- 通过nginx代理访问应返回相同的业务错误信息
- nginx错误日志中不应出现权限相关错误

**注意事项**:
- 确保nginx配置中API代理location块位于静态文件location块之前
- 文件上传接口需要处理multipart/form-data格式，nginx需要足够的权限处理临时文件
- 建议定期检查nginx日志文件大小，避免日志文件过大影响性能

##### 图片静态文件访问问题
**问题描述**: 上传的图片无法通过 `http://localhost/urbanization/images/filename.jpg` 访问，显示404错误。

**可能原因**:
1. **nginx未配置图片代理**: 缺少 `/urbanization/images/` 路径的代理配置
2. **后端ServeStaticModule配置错误**: 图片服务路径配置不正确
3. **图片文件不存在**: 文件未正确保存到指定目录

**解决方案**:

1. **检查nginx配置**:
确保nginx配置中包含图片静态文件代理：
```nginx
# /urbanization/images/ 路径反向代理到本地3333端口（图片静态文件）
location /urbanization/images/ {
    proxy_pass http://127.0.0.1:3888/images/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

2. **检查后端配置**:
确保后端环境变量配置正确：
```bash
# backend/.env
UPLOAD_DIR="./db/images"
DEPLOY_PATH="/"
```