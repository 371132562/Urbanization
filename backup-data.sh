#!/bin/bash

# 设置UTF-8编码，确保中文字符正确显示
export LANG=zh_CN.UTF-8

# --- 配置 ---
# 这是在 docker-compose.yml 中定义的数据库持久化卷的名称。
# 请确保这个名称与 docker-compose.yml 文件中的 volumes 定义或容器使用的外部卷名称完全匹配。
VOLUME_NAME="urbanization_db"
# 定义备份文件的名称，格式为 backup-年-月-日-时-分-秒.tar
BACKUP_FILE="backup-$(date +%Y-%m-%d-%H-%M-%S).tar"
# --- 配置结束 ---


echo "正在准备备份数据库卷: ${VOLUME_NAME}"

# 检查 Docker 是否正在运行
if ! docker info > /dev/null 2>&1; then
    echo "错误：Docker Desktop 未运行。"
    echo "请先启动 Docker Desktop，然后重新运行此脚本。"
    read -p "按回车键退出..."
    exit 1
fi

echo "Docker 已连接。开始执行备份操作..."
echo "备份文件将保存为: ${BACKUP_FILE}"

# 使用一个临时的、轻量的 Alpine Linux 容器来访问卷并创建备份
# --rm: 容器退出后自动删除，保持环境整洁。
# -v "${VOLUME_NAME}:/volume_data": 将名为 ${VOLUME_NAME} 的 Docker 卷挂载到容器内的 /volume_data 目录。这是数据源。
# -v "$(pwd):/backup": 将当前工作目录（脚本所在的目录）挂载到容器内的 /backup 目录。这是备份目标。
# alpine: 一个非常小的 Linux 发行版镜像。
# tar -czf "/backup/${BACKUP_FILE}" -C /volume_data . : 在容器内执行的命令
#   tar: 压缩打包命令
#   -c: 创建一个新的归档文件
#   -z: 使用 gzip 进行压缩，可以减小备份文件体积（可选，如果数据很大建议使用）
#   -f "/backup/${BACKUP_FILE}": 指定输出的归档文件路径和名称
#   -C /volume_data: 切换到 /volume_data 目录，这样打包的内容不包含上层路径
#   .: 表示打包该目录下的所有文件和文件夹
docker run --rm \
    -v "${VOLUME_NAME}:/volume_data" \
    -v "$(pwd):/backup" \
    alpine \
    tar -cf "/backup/${BACKUP_FILE}" -C /volume_data .

if [ $? -eq 0 ]; then
    echo ""
    echo "备份成功！"
    echo "备份文件 ${BACKUP_FILE} 已保存在当前目录下。"
else
    echo ""
    echo "备份过程中发生错误。"
    echo "请检查以上日志输出，并确认 Docker 卷 '${VOLUME_NAME}' 是否存在。"
fi

echo ""
read -p "按任意键退出窗口..." 