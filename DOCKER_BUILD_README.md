# Docker 构建配置说明

本项目支持多个前端项目的独立构建和部署，每个前端项目都有对应的Dockerfile和GitHub工作流。

## 📁 文件结构

### Dockerfile 文件
- `Dockerfile` - 原始配置，用于frontend项目（向后兼容）
- `Dockerfile.data` - 用于frontend-data项目
- `Dockerfile.score` - 用于frontend-score项目  
- `Dockerfile.evaluation` - 用于frontend-evaluation项目

### Docker Compose 文件
- `docker-compose.yml` - 原始配置（向后兼容）
- `docker-compose.data.yml` - 数据管理客户端配置（端口3333，容器名urbanization-data）
- `docker-compose.score.yml` - 评分管理客户端配置（端口3334，容器名urbanization-score）
- `docker-compose.evaluation.yml` - 评估管理客户端配置（端口3335，容器名urbanization-evaluation）

### 启动脚本文件
- `start.ps1` - 原始启动脚本（向后兼容）
- `start-data.ps1` - 数据管理客户端启动脚本
- `start-score.ps1` - 评分管理客户端启动脚本
- `start-evaluation.ps1` - 评估管理客户端启动脚本

### GitHub 工作流文件
- `.github/workflows/create-release.yml` - 原始工作流（向后兼容）
- `.github/workflows/create-release-data.yml` - 数据管理客户端发布
- `.github/workflows/create-release-score.yml` - 评分管理客户端发布
- `.github/workflows/create-release-evaluation.yml` - 评估管理客户端发布

## 🔧 构建配置特点

### 1. 独立的镜像名称
每个项目使用独立的镜像名称，确保：
- `linstar666/urbanization-data:latest` - 数据管理客户端
- `linstar666/urbanization-score:latest` - 评分管理客户端
- `linstar666/urbanization-evaluation:latest` - 评估管理客户端
- 脚本中的 `urbanization.tar` 文件名可以复用
- 启动、备份、恢复脚本无需修改
- 用户下载的包文件名保持一致

### 2. 前端目录统一
所有Dockerfile都将前端构建产物复制到 `./frontend/dist` 目录，确保：
- 后端NestJS的ServeStaticModule配置无需修改
- 静态文件服务路径保持一致

### 3. 触发条件优化
每个工作流都有特定的路径触发条件：
- `frontend-data/**` - 数据管理项目变更
- `frontend-score/**` - 评分管理项目变更
- `frontend-evaluation/**` - 评估管理项目变更
- `backend/**` - 后端变更（所有项目都会触发）

### 4. 端口、卷和容器隔离
每个项目使用独立的端口、数据卷和容器名称：
- 数据管理：端口3333，卷db_data，容器urbanization-data
- 评分管理：端口3334，卷db_score，容器urbanization-score
- 评估管理：端口3335，卷db_evaluation，容器urbanization-evaluation

## 🚀 使用方法

### 本地构建
```bash
# 构建数据管理版本
docker build -f Dockerfile.data -t urbanization:data .

# 构建评分管理版本
docker build -f Dockerfile.score -t urbanization:score .

# 构建评估管理版本
docker build -f Dockerfile.evaluation -t urbanization:evaluation .
```

### 本地运行
```bash
# 运行数据管理版本（端口3333）
docker-compose -f docker-compose.data.yml up -d

# 运行评分管理版本（端口3334）
docker-compose -f docker-compose.score.yml up -d

# 运行评估管理版本（端口3335）
docker-compose -f docker-compose.evaluation.yml up -d
```

### 自动构建
当代码推送到master分支时，GitHub Actions会根据变更的文件路径自动选择对应的Dockerfile进行构建：

1. **修改frontend-data目录** → 触发数据管理客户端构建（端口3333）
2. **修改frontend-score目录** → 触发评分管理客户端构建（端口3334）
3. **修改frontend-evaluation目录** → 触发评估管理客户端构建（端口3335）
4. **修改backend目录** → 触发所有客户端构建

## 📦 发布包

每个构建都会生成：
- `urbanization.tar` - 主应用镜像
- `alpine.tar` - Alpine基础镜像
- `urbanization.zip` - 完整的客户端运行包

发布包包含：
- Docker Compose配置文件
- PowerShell启动脚本
- 备份和恢复脚本
- 使用说明文档

## 🔄 向后兼容

- 原有的 `Dockerfile` 和工作流仍然可用
- 所有脚本中的文件名和参数保持不变
- 用户可以无缝升级到新的多项目架构

## 📝 注意事项

1. **并发控制**：每个工作流都有独立的并发组，避免冲突
2. **路径触发**：确保只有相关文件变更时才触发构建
3. **统一输出**：所有构建都生成相同的文件名，便于脚本处理
4. **版本标签**：不同项目使用不同的版本标签前缀（release-data-、release-score-、release-evaluation-）
5. **端口隔离**：不同项目使用不同端口，避免冲突
6. **数据卷隔离**：每个项目使用独立的数据卷，数据互不干扰
7. **文件重命名**：GitHub工作流会自动将对应的docker-compose和start脚本文件重命名，确保用户使用体验一致
8. **容器隔离**：每个项目使用不同的容器名称，避免与原始urbanization容器冲突
9. **依赖处理**：Dockerfile中正确处理了前端对后端workspace依赖的关系
10. **环境变量**：构建时设置了必要的环境变量（NODE_ENV、VITE_APP_TITLE） 