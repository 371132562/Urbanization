#!/bin/sh
set -e

# 在启动 NestJS 应用之前运行 Prisma migrate
echo "Running Prisma migrate..."
npx prisma migrate deploy --schema=./backend/prisma/schema.prisma

# 运行 Prisma seed
echo "Running Prisma seed..."
npx prisma db seed --schema=./backend/prisma/schema.prisma

# 启动 NestJS 应用
echo "Starting NestJS application..."
exec node ./backend/dist/src/main 