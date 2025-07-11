// seed.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 定义大洲和国家数据
const continentsWithCountries = [
  {
    cnName: '亚洲',
    enName: 'Asia',
    countries: [
      { cnName: '中国', enName: 'China' },
      { cnName: '日本', enName: 'Japan' },
      { cnName: '韩国', enName: 'South Korea' },
      { cnName: '印度', enName: 'India' },
      { cnName: '新加坡', enName: 'Singapore' },
    ],
  },
  {
    cnName: '欧洲',
    enName: 'Europe',
    countries: [
      { cnName: '德国', enName: 'Germany' },
      { cnName: '法国', enName: 'France' },
      { cnName: '英国', enName: 'United Kingdom' },
      { cnName: '意大利', enName: 'Italy' },
      { cnName: '西班牙', enName: 'Spain' },
    ],
  },
  {
    cnName: '北美洲',
    enName: 'North America',
    countries: [
      { cnName: '美国', enName: 'United States' },
      { cnName: '加拿大', enName: 'Canada' },
      { cnName: '墨西哥', enName: 'Mexico' },
    ],
  },
  {
    cnName: '南美洲',
    enName: 'South America',
    countries: [
      { cnName: '巴西', enName: 'Brazil' },
      { cnName: '阿根廷', enName: 'Argentina' },
    ],
  },
  {
    cnName: '非洲',
    enName: 'Africa',
    countries: [
      { cnName: '埃及', enName: 'Egypt' },
      { cnName: '尼日利亚', enName: 'Nigeria' },
      { cnName: '南非', enName: 'South Africa' },
    ],
  },
  {
    cnName: '大洋洲',
    enName: 'Oceania',
    countries: [
      { cnName: '澳大利亚', enName: 'Australia' },
      { cnName: '新西兰', enName: 'New Zealand' },
    ],
  },
  {
    cnName: '南极洲',
    enName: 'Antarctica',
    countries: [],
  },
];


async function main() {
  console.log('开始清理旧数据...');
  // 为防止外键约束问题，先删除国家，再删除大洲
  await prisma.country.deleteMany({});
  await prisma.continent.deleteMany({});
  console.log('旧数据清理完毕。');

  console.log('开始生成种子数据...');

  // 注意：这里的实现方式是“先清空再创建”，适用于开发环境。
  // 如果需要一个“幂等”的脚本（即多次运行结果一致而不会重复创建或报错），
  // 建议在 Prisma Schema 中为 cnName 或 enName 添加 @@unique 约束，
  // 然后在这里使用 prisma.continent.upsert 方法。

  for (const continentData of continentsWithCountries) {
    const continent = await prisma.continent.create({
      data: {
        cnName: continentData.cnName,
        enName: continentData.enName,
      },
    });
    console.log(`已创建大洲: ${continent.cnName}`);

    if (continentData.countries.length > 0) {
      const countriesData = continentData.countries.map((country) => ({
        ...country,
        continentId: continent.id,
      }));

      await prisma.country.createMany({
        data: countriesData,
      });
      console.log(`  -> 已为其创建 ${continentData.countries.length} 个国家.`);
    }
  }

  console.log('种子数据生成完毕!');
}

main()
  .catch((e) => {
    console.error('数据生成过程中发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
