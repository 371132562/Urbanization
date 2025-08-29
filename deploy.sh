#!/bin/bash

# 城镇化项目部署脚本
# 按顺序执行：git pull -> 安装依赖 -> 前端构建 -> Prisma操作 -> 后端构建 -> pm2 reload

echo "🚀 开始部署城镇化项目..."

# 1. 拉取最新代码
echo "📥 正在拉取最新代码..."
git pull
if [ $? -ne 0 ]; then
    echo "❌ git pull 失败，部署终止"
    exit 1
fi
echo "✅ 代码拉取成功"

# 2. 安装依赖
echo "📦 正在安装依赖..."

# 安装根目录依赖
echo "🔧 安装根目录依赖..."
pnpm install --frozen-lockfile
if [ $? -ne 0 ]; then
    echo "❌ 根目录依赖安装失败，部署终止"
    exit 1
fi
echo "✅ 依赖安装成功"

# 3. Prisma 操作
echo "🗄️ 正在执行 Prisma 操作..."
cd backend
echo "🔧 生成 Prisma 客户端..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma generate 失败，部署终止"
    exit 1
fi
echo "✅ Prisma 客户端生成成功"

echo "🔧 执行数据库迁移..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Prisma migrate deploy 失败，部署终止"
    exit 1
fi
echo "✅ 数据库迁移成功"
cd ..

# 4. 并行构建前端和后端
echo "🔨 正在并行构建前端和后端..."

# 前端构建（后台执行）
echo "📱 前端构建开始..."
cd frontend
pnpm build > ../frontend-build.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 后端构建（后台执行）
echo "🔧 后端构建开始..."
cd backend
pnpm build > ../backend-build.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待两个构建进程完成
echo "⏳ 等待构建完成..."
wait $FRONTEND_PID
FRONTEND_EXIT_CODE=$?

wait $BACKEND_PID
BACKEND_EXIT_CODE=$?

# 检查构建结果
if [ $FRONTEND_EXIT_CODE -ne 0 ]; then
    echo "❌ 前端构建失败，查看日志：cat frontend-build.log"
    exit 1
fi
echo "✅ 前端构建成功"

if [ $BACKEND_EXIT_CODE -ne 0 ]; then
    echo "❌ 后端构建失败，查看日志：cat backend-build.log"
    exit 1
fi
echo "✅ 后端构建成功"

# 清理构建日志文件
rm -f frontend-build.log backend-build.log

# 5. 检查进程是否存在，不存在则启动，存在则reload
echo "🔄 正在管理应用进程..."
cd backend
if pm2 describe urbanization >/dev/null 2>&1; then
    echo "📱 进程已存在，正在重新加载..."
    pm2 reload urbanization
    if [ $? -ne 0 ]; then
        echo "❌ 应用重新加载失败"
        exit 1
    fi
    echo "✅ 应用重新加载成功"
else
    echo "🚀 进程不存在，正在启动新进程..."
    pm2 start 'node ./dist/src/main.js' --name urbanization
    if [ $? -ne 0 ]; then
        echo "❌ 应用启动失败"
        exit 1
    fi
    echo "✅ 应用启动成功"
fi
cd ..

echo "🎉 部署完成！"
