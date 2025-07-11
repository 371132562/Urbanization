// seed.js
const { PrismaClient } = require('@prisma/client');
const { continents } = require('./countries');

const prisma = new PrismaClient();

async function main() {
  console.log('开始生成种子数据...');

  for (const continentData of Object.values(continents)) {
    let continent = await prisma.continent.findUnique({
      where: { enName: continentData.enName },
    });

    if (!continent) {
      continent = await prisma.continent.create({
        data: {
          enName: continentData.enName,
          cnName: continentData.cnName,
        },
      });
      console.log(`已创建大洲: ${continent.cnName}`);
    } else {
      console.log(`大洲已存在, 跳过: ${continent.cnName}`);
    }

    for (const countryData of continentData.countries) {
      const existingCountry = await prisma.country.findUnique({
        where: { enName: countryData.enName },
      });

      if (!existingCountry) {
        await prisma.country.create({
          data: {
            enName: countryData.enName,
            cnName: countryData.cnName,
            continentId: continent.id,
          },
        });
        console.log(`已创建国家: ${countryData.cnName}`);
      } else {
        console.log(`国家已存在, 跳过: ${countryData.cnName}`);
      }
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
