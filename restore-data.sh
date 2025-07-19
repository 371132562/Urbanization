#!/bin/bash

# 设置UTF-8编码，确保中文字符正确显示
export LANG=zh_CN.UTF-8

# --- 配置 ---
VOLUME_NAME="urbanization_db"
# --- 配置结束 ---


echo "--- 数据恢复脚本 ---"

# 检查 Docker 是否正在运行
if ! docker info > /dev/null 2>&1; then
    echo "错误：Docker Desktop 未运行。"
    echo "请先启动 Docker Desktop，然后重新运行此脚本。"
    read -p "按回车键退出..."
    exit 1
fi

# 寻找最新的备份文件 (backup-*.tar)
# ls -t: 按修改时间降序排序
# backup-*.tar: 匹配所有符合命名规则的备份文件
# | head -n 1: 取出列表中的第一个，即最新的文件
LATEST_BACKUP=$(ls -t backup-*.tar 2>/dev/null | head -n 1)

if [ -z "${LATEST_BACKUP}" ]; then
    echo "错误：在当前目录下未找到任何备份文件 (例如 'backup-YYYY-MM-DD-HH-MM-SS.tar')。"
    read -p "按回车键退出..."
    exit 1
fi

echo "找到最新的备份文件: ${LATEST_BACKUP}"
echo "将要恢复数据到数据卷: ${VOLUME_NAME}"
echo ""
# 提供清晰的警告信息
echo "警告：此操作将用备份文件中的数据覆盖卷 '${VOLUME_NAME}' 中的现有内容。"
echo "请确保您希望这么做。在继续之前，建议先停止正在使用该卷的 Docker 容器(执行 docker-compose down)。"
echo ""

# 等待用户确认
read -p "是否继续恢复操作? (输入 y 继续，其他任意键取消): " CONFIRMATION
# 将输入转为小写进行比较
if [ "${CONFIRMATION,,}" != "y" ]; then
    echo "操作已取消。"
    read -p "按回车键退出..."
    exit 0
fi


echo "正在停止并删除现有服务容器，以释放数据卷..."
# docker-compose down 会停止并删除容器，但默认不会删除卷
docker-compose down

echo "开始恢复数据..."
# 启动一个临时容器，将备份文件解压到目标数据卷
# -v "${VOLUME_NAME}:/volume_data": 挂载目标卷
# -v "$(pwd):/backup": 挂载包含备份文件的当前目录
# alpine: 轻量级镜像
# tar -xf "/backup/${LATEST_BACKUP}" -C /volume_data: 在容器内解压
#   -x: 解压归档文件
#   -f: 指定要解压的文件
#   -C /volume_data: 指定解压的目标目录
docker run --rm \
    -v "${VOLUME_NAME}:/volume_data" \
    -v "$(pwd):/backup" \
    alpine \
    tar -xf "/backup/${LATEST_BACKUP}" -C /volume_data

if [ $? -eq 0 ]; then
    echo ""
    echo "数据恢复成功！"
    echo "建议您现在重新启动服务以应用已恢复的数据 (运行 start-app.sh)。"
else
    echo ""
    echo "数据恢复过程中发生错误。"
    echo "请检查以上日志输出。"
fi

echo ""
read -p "按任意键退出窗口..." 