#!/bin/bash

# 设置UTF-8编码，确保中文字符正确显示
export LANG=zh_CN.UTF-8

echo "正在启动 Docker 服务，请稍候..."

# 检查 Docker 是否正在运行
# 通过 docker info 命令检查Docker守护进程的状态
if ! docker info > /dev/null 2>&1; then
    echo "错误：Docker Desktop 未运行。"
    echo "请先启动 Docker Desktop，然后重新运行此脚本。"
    # 等待用户输入，防止窗口直接关闭
    read -p "按回车键退出..."
    exit 1
fi

echo "Docker 已成功连接。正在拉取最新镜像并启动容器..."

# --pull always: 强制总是尝试拉取镜像的最新版本
# --remove-orphans: 删除在 docker-compose.yml 文件中已不存在的服务的容器
docker-compose up -d --pull always --remove-orphans

# 检查上一条命令的退出码，$? 为 0 表示成功
if [ $? -ne 0 ]; then
    echo ""
    echo "启动过程中发生错误。请检查上面的日志输出。"
    read -p "按回车键退出..."
else
    echo ""
    echo "服务已成功启动！"
    echo "您现在可以通过浏览器访问应用。"
fi

echo ""
read -p "按任意键退出窗口..." 