const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// process.cwd() 是项目根目录，因为脚本是从根目录通过 pnpm 调用的
const rootDir = process.cwd();

// 定义各个关键路径
const releaseDir = path.join(rootDir, 'release');
const appDir = path.join(releaseDir, 'app');
const packageAssetsDir = path.join(rootDir, '.package'); // 我们存放打包资产的目录

async function main() {
  try {
    console.log('🚀 开始全自动打包，请稍候...');

    // 1. 清理旧的发布目录
    console.log('🧹 清理旧的 release 目录...');
    await fs.remove(releaseDir);
    await fs.ensureDir(releaseDir); // 确保 release 目录存在
    await fs.ensureDir(appDir); // 确保 release/app 目录存在

    // 2. 首先在根目录安装/更新所有依赖
    console.log('📦 正在根目录执行 pnpm install 以确保所有依赖最新...');
    execSync('pnpm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ 依赖安装/更新完成。');

    // 3. 构建前端
    console.log('🏗️  正在构建前端应用 (React)...');
    execSync('pnpm --filter frontend build', { stdio: 'inherit' });
    await fs.copy(path.join(rootDir, 'frontend', 'dist'), path.join(appDir, 'frontend', 'dist'));
    console.log('✅ 前端构建并复制完成。');

    // 4. 构建后端
    console.log('🏗️  正在构建后端应用 (NestJS)...');
    execSync('pnpm --filter backend build', { stdio: 'inherit' });
    const backendAppDir = path.join(appDir, 'backend');
    await fs.copy(path.join(rootDir, 'backend', 'dist'), path.join(backendAppDir, 'dist'));
    console.log('✅ 后端构建完成。');

    // 5. 复制后端核心文件和所有依赖模块（替代安装步骤）
    console.log('📦 正在复制后端核心文件...');
    await fs.copy(path.join(rootDir, 'backend', 'prisma'), path.join(backendAppDir, 'prisma'));
    await fs.copy(
      path.join(rootDir, 'backend', 'package.json'),
      path.join(backendAppDir, 'package.json'),
    );
    console.log('📦 正在复制项目根目录的 node_modules (这可能需要一些时间)...');
    await fs.copy(path.join(rootDir, 'node_modules'), path.join(appDir, 'node_modules'));
    console.log('📦 正在复制 backend 目录的 node_modules...');
    await fs.copy(path.join(rootDir, 'backend', 'node_modules'), path.join(backendAppDir, 'node_modules'));
    console.log('✅ 后端文件和依赖复制完成。');

    // 6. 复制启动器、说明文档和便携版Node.js
    console.log('🚀 正在复制启动器、说明文档和便携版 Node.js...');
    await fs.copy(
      path.join(packageAssetsDir, 'node-portable'),
      path.join(releaseDir, 'node-portable'),
    );
    await fs.copy(path.join(packageAssetsDir, 'start.bat'), path.join(releaseDir, 'start.bat'));
    await fs.copy(path.join(packageAssetsDir, 'readme.txt'), path.join(releaseDir, 'readme.txt'));

    // 为了跨平台兼容性，我们同样检查并复制 start.sh
    const startShPath = path.join(packageAssetsDir, 'start.sh');
    if (await fs.pathExists(startShPath)) {
      console.log('🐧 检测到 start.sh，一并复制...');
      await fs.copy(startShPath, path.join(releaseDir, 'start.sh'));
    }
    console.log('✅ 启动器、说明文档和 Node.js 复制完成。');

    console.log('\n🎉🎉🎉 全自动打包成功！🎉🎉🎉');
    console.log(`\n最终的发布包已生成在项目根目录下的 ${path.basename(releaseDir)} 文件夹中。`);
    console.log('现在你可以将这个文件夹压缩后分发给用户了。');
  } catch (error) {
    console.error('\n❌ 打包过程中发生错误:', error);
    process.exit(1);
  }
}

// 确保 fs-extra 已经安装
if (!fs.pathExistsSync(path.join(rootDir, 'node_modules', 'fs-extra'))) {
  console.warn('⚠️  警告: 依赖 fs-extra 未安装，请在项目根目录运行 pnpm add -D -w fs-extra');
  process.exit(1);
}

main();
