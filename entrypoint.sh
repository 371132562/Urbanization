#!/bin/sh
set -e

# 在子shell中进入后端目录执行 Prisma 命令，不影响主脚本的当前目录
echo "Running Prisma commands inside ./backend directory..."
(
  cd backend
  echo "Running Prisma migrate..."
  npx prisma migrate deploy

  echo "Running Prisma seed..."
  npx prisma db seed
)

# 启动 NestJS 应用

echo "Starting NestJS application..."
# 进入backend目录启动应用，确保能读取到.env.production文件
cd backend
exec node ./dist/src/main 