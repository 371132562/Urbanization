/**
 * @file 该脚本用于为数据库填充初始数据。
 * 它被设计为幂等的，这意味着它可以多次运行而不会创建重复的数据。
 * 它使用内存缓存来通过减少数据库查询次数来提高性能。
 */

const { PrismaClient } = require('@prisma/client');
const { continents } = require('./initialData/countries'); // 导入大洲和国家的初始数据
const indicatorData = require('./initialData/indicatorData'); // 导入指标体系的初始数据
const indicatorValues = require('./initialData/indicatorValues'); // 导入指标值的初始数据

const prisma = new PrismaClient();

/**
 * 填充大洲和国家的数据。
 * 通过预加载和缓存机制，避免重复创建，并提升性能。
 * @param {Map<string, object>} continentCache - 用于存储大洲数据的缓存，以英文名作为键，实现O(1)复杂度的查询。
 * @param {Map<string, object>} countryCache - 用于存储国家数据的缓存，以英文名作为键。
 */
async function seedContinentsAndCountries(continentCache, countryCache) {
  console.log('开始生成大洲和国家种子数据...');

  // 步骤 1: 预先一次性从数据库加载所有已存在的大洲和国家数据，以减少后续的数据库查询。
  const existingContinents = await prisma.continent.findMany();
  // 将查询到的数据存入缓存，键为英文名，值为整个对象。
  existingContinents.forEach((c) => continentCache.set(c.enName, c));

  const existingCountries = await prisma.country.findMany();
  existingCountries.forEach((c) => countryCache.set(c.enName, c));

  // 步骤 2: 遍历从`countries.js`导入的初始数据。
  for (const continentData of Object.values(continents)) {
    // 检查当前大洲是否已存在于缓存中。
    let continent = continentCache.get(continentData.enName);
    if (!continent) {
      // 如果不存在，则在数据库中创建新记录。
      continent = await prisma.continent.create({
        data: {
          enName: continentData.enName,
          cnName: continentData.cnName,
        },
      });
      // 将新创建的记录添加到缓存中，以便在后续操作中直接使用，无需再次查询。
      continentCache.set(continent.enName, continent);
      console.log(`已创建大洲: ${continent.cnName}`);
    } else {
      console.log(`大洲已存在, 跳过: ${continent.cnName}`);
    }

    // 步骤 3: 遍历当前大洲下的国家列表。
    for (const countryData of continentData.countries) {
      // 同样地，检查国家是否已存在于缓存中。
      if (!countryCache.has(countryData.enName)) {
        // 如果不存在，创建国家记录，并关联到刚刚获取或创建的大洲ID。
        const country = await prisma.country.create({
          data: {
            enName: countryData.enName,
            cnName: countryData.cnName,
            continentId: continent.id, // 使用父级记录的ID进行关联
          },
        });
        countryCache.set(country.enName, country);
        console.log(`已创建国家: ${countryData.cnName}`);
      } else {
        console.log(`国家已存在, 跳过: ${countryData.cnName}`);
      }
    }
  }
  console.log('大洲和国家种子数据生成完毕!');
}

/**
 * 填充指标体系（一级、二级和三级指标），这是一个具有层级关系的数据结构。
 * 同样使用缓存来避免重复创建和优化性能。
 * @param {Map<string, object>} topIndicatorCache - 一级指标的缓存。
 * @param {Map<string, object>} secondaryIndicatorCache - 二级指标的缓存。
 * @param {Map<string, object>} detailedIndicatorCache - 三级指标的缓存。
 */
async function seedIndicators(topIndicatorCache, secondaryIndicatorCache, detailedIndicatorCache) {
  console.log('开始生成指标体系种子数据...');

  // 步骤 1: 预加载所有层级的现有指标数据到各自的缓存中。
  const existingTop = await prisma.topIndicator.findMany();
  existingTop.forEach((i) => topIndicatorCache.set(i.indicatorEnName, i));
  const existingSecondary = await prisma.secondaryIndicator.findMany();
  existingSecondary.forEach((i) => secondaryIndicatorCache.set(i.indicatorEnName, i));
  const existingDetailed = await prisma.detailedIndicator.findMany();
  existingDetailed.forEach((i) => detailedIndicatorCache.set(i.indicatorEnName, i));

  // 步骤 2: 从最顶层（一级指标）开始，遍历初始数据。
  for (const topIndicatorData of indicatorData) {
    let topIndicator = topIndicatorCache.get(topIndicatorData.indicatorEnName);
    if (!topIndicator) {
      topIndicator = await prisma.topIndicator.create({
        data: {
          indicatorCnName: topIndicatorData.indicatorCnName,
          indicatorEnName: topIndicatorData.indicatorEnName,
          weight: topIndicatorData.weight,
          description: topIndicatorData.description,
        },
      });
      topIndicatorCache.set(topIndicator.indicatorEnName, topIndicator);
      console.log(`创建一级指标: ${topIndicatorData.indicatorCnName}`);
    } else {
      console.log(`一级指标已存在, 跳过: ${topIndicatorData.indicatorCnName}`);
    }

    // 步骤 3: 遍历当前一级指标下的二级指标。
    for (const secondaryIndicatorData of topIndicatorData.secondaryIndicators) {
      let secondaryIndicator = secondaryIndicatorCache.get(secondaryIndicatorData.indicatorEnName);
      if (!secondaryIndicator) {
        secondaryIndicator = await prisma.secondaryIndicator.create({
          data: {
            indicatorCnName: secondaryIndicatorData.indicatorCnName,
            indicatorEnName: secondaryIndicatorData.indicatorEnName,
            weight: secondaryIndicatorData.weight,
            description: secondaryIndicatorData.description,
            topIndicatorId: topIndicator.id, // 关联到父级（一级指标）的ID
          },
        });
        secondaryIndicatorCache.set(secondaryIndicator.indicatorEnName, secondaryIndicator);
        console.log(`创建二级指标: ${secondaryIndicatorData.indicatorCnName}`);
      } else {
        console.log(`二级指标已存在, 跳过: ${secondaryIndicatorData.indicatorCnName}`);
      }

      // 步骤 4: 遍历当前二级指标下的三级指标。
      for (const detailedIndicatorData of secondaryIndicatorData.detailedIndicators) {
        if (!detailedIndicatorCache.has(detailedIndicatorData.indicatorEnName)) {
          const detailedIndicator = await prisma.detailedIndicator.create({
            data: {
              indicatorCnName: detailedIndicatorData.indicatorCnName,
              indicatorEnName: detailedIndicatorData.indicatorEnName,

              weight: detailedIndicatorData.weight,
              unit: detailedIndicatorData.unit,
              description: detailedIndicatorData.description,
              secondaryIndicatorId: secondaryIndicator.id, // 关联到父级（二级指标）的ID
            },
          });
          detailedIndicatorCache.set(detailedIndicator.indicatorEnName, detailedIndicator);
          console.log(`创建三级指标: ${detailedIndicatorData.indicatorCnName}`);
        } else {
          console.log(`三级指标已存在, 跳过: ${detailedIndicatorData.indicatorCnName}`);
        }
      }
    }
  }
  console.log('指标体系种子数据生成完毕!');
}

/**
 * 为国家和年份填充具体的指标数值。
 * 这是数据量最大的部分，因此采用了`createMany`进行高效的批量插入。
 * @param {Map<string, object>} countryCache - 已填充的国家数据的缓存。
 * @param {Map<string, object>} detailedIndicatorCache - 已填充的三级指标数据的缓存。
 */
async function seedIndicatorValues(countryCache, detailedIndicatorCache) {
  console.log('开始生成指标数值种子数据...');

  // 步骤 1: 预加载所有已存在的指标值记录，并将其转换为一个 Set 以进行高效的重复检查。
  // Set 的查找时间复杂度为 O(1)，远优于每次都在循环中查询数据库。
  const existingValues = await prisma.indicatorValue.findMany({
    // 只选择构成唯一约束的字段，以减少内存占用。
    select: { countryId: true, year: true, detailedIndicatorId: true },
  });
  // 创建一个唯一标识符字符串（例如 'countryId-year-indicatorId'）并存入Set。
  const existingValuesSet = new Set(
    existingValues.map((v) => `${v.countryId}-${v.year}-${v.detailedIndicatorId}`),
  );

  // 用于存储所有待创建的新记录的数组。
  const valuesToCreate = [];

  // 步骤 2: 遍历从 `indicatorValues.js` 加载的数据。这是一个嵌套结构。
  for (const countryData of indicatorValues) {
    // 步骤 2.1: 首先根据英文名从缓存中查找国家。这更高效。
    // 如果找不到，则尝试遍历缓存，用中文名作为后备查找方式。
    const country = countryCache.get(countryData.countryEnName) || 
                    Array.from(countryCache.values()).find(c => c.cnName === countryData.countryCnName);

    // 如果国家在中英缓存中都找不到，则无法关联，只能跳过该国家的所有数据。
    if (!country) {
      console.warn(`警告: 在缓存中未找到国家 "${countryData.countryCnName}" 或 "${countryData.countryEnName}", 跳过此国家的所有条目.`);
      continue;
    }

    // 步骤 2.2: 遍历该国家下的所有指标值。
    for (const valueData of countryData.values) {
      // 同样地，优先使用英文名从缓存查找三级指标。
      const detailedIndicator = detailedIndicatorCache.get(valueData.indicatorEnName) ||
                                Array.from(detailedIndicatorCache.values()).find(i => i.indicatorCnName === valueData.indicatorCnName);

      // 如果指标找不到，则跳过此条记录。
      if (!detailedIndicator) {
        console.warn(`警告: 在缓存中未找到三级指标 "${valueData.indicatorCnName}" 或 "${valueData.indicatorEnName}", 跳过此条目.`);
        continue;
      }

      // 步骤 2.3: 检查组合了国家、年份和指标的记录是否已经存在于数据库中。
      const valueIdentifier = `${country.id}-${countryData.year}-${detailedIndicator.id}`;
      if (!existingValuesSet.has(valueIdentifier)) {
        // 如果不存在，则将这条准备好的、包含所有外键ID的新记录添加到待创建数组中。
        valuesToCreate.push({
          countryId: country.id,
          detailedIndicatorId: detailedIndicator.id,
          year: countryData.year,
          value: valueData.value, // `value` 字段在 schema 中是可选的，可以是 null
        });
        // 同时，将标识符添加到Set中，以防止在同一次运行中因为源文件有重复而重复添加。
        existingValuesSet.add(valueIdentifier); 
      }
    }
  }

  // 步骤 3: 检查是否有任何新的记录需要被创建。
  if (valuesToCreate.length > 0) {
    console.log(`准备创建 ${valuesToCreate.length} 条新的指标数值...`);
    // 使用 `createMany` API 一次性将数组中的所有数据插入数据库，这是最高效的方式。
    await prisma.indicatorValue.createMany({
      data: valuesToCreate,
    });
    console.log('新的指标数值已批量创建完毕!');
  } else {
    console.log('没有新的指标数值需要创建.');
  }

  console.log('指标数值种子数据生成完毕!');
}

/**
 * 主函数，是整个填充脚本的入口和调度中心。
 * 它负责初始化所有需要的缓存，并按正确的依赖顺序调用各个填充函数。
 */
async function main() {
  // 集中初始化所有缓存，然后作为参数传递给各个函数，以共享数据。
  const continentCache = new Map();
  const countryCache = new Map();
  const topIndicatorCache = new Map();
  const secondaryIndicatorCache = new Map();
  const detailedIndicatorCache = new Map();

  // 按顺序执行填充函数。必须先填充国家和指标，才能填充依赖它们ID的指标值。
  await seedContinentsAndCountries(continentCache, countryCache);
  await seedIndicators(topIndicatorCache, secondaryIndicatorCache, detailedIndicatorCache);
  await seedIndicatorValues(countryCache, detailedIndicatorCache);
}

// 脚本的执行入口点。
main()
  .catch((e) => {
    // 捕获并打印任何在异步执行过程中发生的错误。
    console.error('数据生成过程中发生错误:', e);
    process.exit(1); // 以非零退出码退出，表示执行失败。
  })
  .finally(async () => {
    // 无论成功或失败，最后都确保断开与数据库的连接，释放资源。
    await prisma.$disconnect();
  });

