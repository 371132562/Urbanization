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
│   │   ├── services/       # API服务
│   │   ├── types/          # 类型定义
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── dist/               # 构建输出
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── businessComponent/  # 业务模块
│   │   ├── exceptions/         # 异常处理
│   │   ├── interceptors/       # 拦截器
│   │   ├── upload/            # 文件上传
│   │   └── utils/             # 工具函数
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

本项目使用GitHub Actions进行自动化构建和Docker镜像发布：

### GitHub工作流
- **触发条件**: 推送代码到 `master` 分支时自动触发
- **构建内容**: 自动构建主客户端（frontend）和8个测试客户端包，每个包均包含完整的前后端启动后可以直接访问端口使用
- **发布方式**: 自动创建GitHub Release，包含所有客户端的运行包

> ⚠️ 说明：**frontend** 该目录为正式前端，其他八个前端仅供测试或演示，普通用户可忽略，无需下载和部署。

## 部署说明

### 环境配置

项目使用环境文件进行配置，请根据部署环境创建相应的环境文件：

- **开发环境**: 前端使用 `.env.development`，后端使用 `.env.development`
- **生产环境**: 前端使用 `.env.production`，后端使用 `.env.production`

请参考项目中的环境文件示例进行配置。

### 部署方式

> ⚠️ **重要提示**：以下所有配置文件和命令仅供参考，请根据实际部署环境和需求进行调整。

本项目支持两种部署方式：

#### 方式一：Docker Compose部署（推荐用于根目录部署）

适用于将应用部署在服务器根目录下的场景，如 `http://yourdomain.com/`。

**1. 环境配置**
```bash
# 后端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
DEPLOY_PATH=/
PORT=3333
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
- **API接口**: `http://yourdomain.com:1818/api/`
- **图片资源**: `http://yourdomain.com:1818/images/`

**4. 端口映射**
- 容器端口: 3333
- 主机端口: 1818 (可在docker-compose.yml中修改)

**5. 数据持久化**
- 数据库文件: 通过Docker卷持久化到 `./db` 目录
- 上传文件: 存储在 `./db/images` 目录
- 日志文件: 存储在 `./db/logs` 目录

#### 方式二：Nginx反向代理部署（推荐用于子路径部署）

适用于将应用部署在服务器子路径下的场景，如 `http://yourdomain.com/urbanization/`。

**1. 环境配置**
```bash
# 后端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
DEPLOY_PATH="/urbanization"
PORT="3333"

# 前端环境配置 (.env.production) - 仅供参考，请根据实际情况调整
VITE_DEPLOY_PATH=/urbanization/
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
注意后端服务默认包含前缀/api

**4. Nginx配置**
编辑 `/usr/local/etc/nginx/nginx.conf`，在http块中添加以下配置（仅供参考，请根据实际情况调整）：

```nginx
server {
    listen       80;
    server_name  localhost;

    # /urbanization 路径指向前端dist目录
    location /urbanization {
        alias /usr/local/var/www/dist;
        index index.html;
        try_files $uri $uri/ /urbanization/index.html;
        
        # 为JavaScript模块设置正确的MIME类型
        location ~* \.(js|mjs)$ {
            add_header Content-Type application/javascript;
        }
        
        # 为CSS文件设置正确的MIME类型
        location ~* \.css$ {
            add_header Content-Type text/css;
        }
        
        # 为其他静态资源设置正确的MIME类型
        location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
            add_header Content-Type image/png;
        }
        
        location ~* \.(woff|woff2|ttf|eot)$ {
            add_header Content-Type font/woff;
        }
    }

    # /urbanization/api 路径反向代理到本地3333端口
    location /urbanization/api/ {
        proxy_pass http://127.0.0.1:3333/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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