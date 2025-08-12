/**
 * @file 该脚本用于为数据库填充初始数据。
 * 它被设计为幂等的，这意味着它可以多次运行而不会创建重复的数据。
 * 它使用内存缓存来通过减少数据库查询次数来提高性能。
 */

const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs'); // 引入 dayjs
const { continents } = require('./initialData/countries'); // 导入大洲和国家的初始数据
const indicatorData = require('./initialData/indicatorData'); // 导入指标体系的初始数据
const indicatorValues = require('./initialData/indicatorValues'); // 导入指标值的初始数据
const { generateUsers } = require('./initialData/authData');

const prisma = new PrismaClient();

/**
 * 填充大洲和国家的数据。
 * 通过预加载和缓存机制，避免重复创建，并提升性能。
 * @param {Map<string, object>} continentCache - 用于存储大洲数据的缓存，以英文名作为键，实现O(1)复杂度的查询。
 * @param {Map<string, object>} countryCache - 用于存储国家数据的缓存，以英文名作为键。
 */
async function seedContinentsAndCountries(continentCache, countryCache) {
  console.info('开始生成大洲和国家种子数据...');

  // 步骤 1: 预先一次性从数据库加载所有已存在的大洲和国家数据，以减少后续的数据库查询。
  const existingContinents = await prisma.continent.findMany();
  // 将查询到的数据存入缓存，键为英文名，值为整个对象。
  existingContinents.forEach((c) => continentCache.set(c.enName, c));

  const existingCountries = await prisma.country.findMany();
  existingCountries.forEach((c) => countryCache.set(c.enName, c));

  // 如果已经存在至少一个大洲，则跳过整个方法
  if (existingContinents.length > 0) {
    console.info('检测到已存在大洲数据，跳过大洲和国家的创建。');
    return;
  }

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
      console.info({ continent: continent.cnName }, `已创建大洲`);
    } else {
      console.debug({ continent: continent.cnName }, `大洲已存在, 跳过`);
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
        console.info({ country: countryData.cnName, continent: continent.cnName }, `已创建国家`);
      } else {
        console.debug({ country: countryData.cnName }, `国家已存在, 跳过`);
      }
    }
  }
  console.info('大洲和国家种子数据生成完毕!');
}

/**
 * 为每个国家在 UrbanizationWorldMap 表中创建一条默认记录。
 * 这条记录用于在前端地图上展示国家的城镇化状态。
 * @param {Map<string, object>} countryCache - 包含所有已处理国家信息的缓存。
 */
async function seedUrbanizationWorldMap(countryCache) {
  console.info('开始生成世界地图城镇化种子数据...');

  // 步骤 1: 预加载所有已存在的 UrbanizationWorldMap 记录的 countryId。
  const existingMapData = await prisma.urbanizationWorldMap.findMany({
    select: { countryId: true },
  });
  const existingCountryIdsInMap = new Set(existingMapData.map(data => data.countryId));

  // 如果已经存在至少一条记录，则跳过整个方法
  if (existingMapData.length > 0) {
    console.info('检测到已存在世界地图城镇化数据，跳过创建。');
    return;
  }

  // 步骤 2: 准备需要创建的新记录。
  const mapEntriesToCreate = [];
  // 遍历所有在国家缓存中的国家。
  for (const country of countryCache.values()) {
    // 检查该国家是否已经有了对应的地图记录。
    if (!existingCountryIdsInMap.has(country.id)) {
      // 如果没有，则将其添加到待创建列表中。
      // urbanization 字段在schema中默认为 false，所以无需显式设置。
      mapEntriesToCreate.push({
        countryId: country.id,
      });
    }
  }

  // 步骤 3: 如果有新的记录需要创建，则进行批量插入。
  if (mapEntriesToCreate.length > 0) {
    console.info({ count: mapEntriesToCreate.length }, `准备为 ${mapEntriesToCreate.length} 个国家创建新的世界地图城镇化记录...`);
    await prisma.urbanizationWorldMap.createMany({
      data: mapEntriesToCreate,
    });
    console.info('新的世界地图城镇化记录已批量创建完毕!');
  } else {
    console.info('没有新的世界地图城镇化记录需要创建。');
  }
  console.info('世界地图城镇化种子数据生成完毕!');
}

/**
 * 填充指标体系（一级、二级和三级指标），这是一个具有层级关系的数据结构。
 * 同样使用缓存来避免重复创建和优化性能。
 * @param {Map<string, object>} topIndicatorCache - 一级指标的缓存。
 * @param {Map<string, object>} secondaryIndicatorCache - 二级指标的缓存。
 * @param {Map<string, object>} detailedIndicatorCache - 三级指标的缓存。
 */
async function seedIndicators(topIndicatorCache, secondaryIndicatorCache, detailedIndicatorCache) {
  console.info('开始生成指标体系种子数据...');

  // 步骤 1: 预加载所有层级的现有指标数据到各自的缓存中。
  const existingTop = await prisma.topIndicator.findMany();
  existingTop.forEach((i) => topIndicatorCache.set(i.indicatorEnName, i));

  // 如果已经存在至少一个顶级指标，则跳过整个方法
  if (existingTop.length > 0) {
    console.info('检测到已存在指标体系数据，跳过创建。');
    return;
  }

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
      console.info({ indicator: topIndicatorData.indicatorCnName }, `创建一级指标`);
    } else {
      console.debug({ indicator: topIndicatorData.indicatorCnName }, `一级指标已存在, 跳过`);
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
        console.info({ indicator: secondaryIndicatorData.indicatorCnName }, `创建二级指标`);
      } else {
        console.debug({ indicator: secondaryIndicatorData.indicatorCnName }, `二级指标已存在, 跳过`);
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
          console.info({ indicator: detailedIndicatorData.indicatorCnName }, `创建三级指标`);
        } else {
          console.debug({ indicator: detailedIndicatorData.indicatorCnName }, `三级指标已存在, 跳过`);
        }
      }
    }
  }
  console.info('指标体系种子数据生成完毕!');
}

/**
 * 为国家和年份填充具体的指标数值。
 * 这是数据量最大的部分，因此采用了`createMany`进行高效的批量插入。
 * @param {Map<string, object>} countryCache - 已填充的国家数据的缓存。
 * @param {Map<string, object>} detailedIndicatorCache - 已填充的三级指标数据的缓存。
 */
async function seedIndicatorValues(countryCache, detailedIndicatorCache) {
  console.info('开始生成指标数值种子数据...');

  // 步骤 1: 预加载所有已存在的指标值记录，并将其转换为一个 Set 以进行高效的重复检查。
  // Set 的查找时间复杂度为 O(1)，远优于每次都在循环中查询数据库。
  const existingValues = await prisma.indicatorValue.findMany({
    // 只选择构成唯一约束的字段，以减少内存占用。
    select: { countryId: true, year: true, detailedIndicatorId: true },
  });
  // 创建一个唯一标识符字符串（例如 'countryId-year-indicatorId'）并存入Set。
  const existingValuesSet = new Set(
    existingValues.map(
      (v) =>
        `${v.countryId}-${dayjs(v.year).format('YYYY')}-${v.detailedIndicatorId}`,
    ),
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
      console.warn({ countryCn: countryData.countryCnName, countryEn: countryData.countryEnName }, `在缓存中未找到国家, 跳过此国家的所有条目.`);
      continue;
    }

    // 步骤 2.2: 遍历该国家下的所有指标值。
    for (const valueData of countryData.values) {
      // 同样地，优先使用英文名从缓存查找三级指标。
      const detailedIndicator = detailedIndicatorCache.get(valueData.indicatorEnName) ||
                                Array.from(detailedIndicatorCache.values()).find(i => i.indicatorCnName === valueData.indicatorCnName);

      // 如果指标在中英缓存中都找不到，记录警告并跳过。
      if (!detailedIndicator) {
        console.warn({ indicatorCn: valueData.indicatorCnName, indicatorEn: valueData.indicatorEnName }, `在缓存中未找到指标, 跳过此条目.`);
        continue;
      }
      // 将年份转换为 Date 对象，例如：2023 -> new Date('2023-06-01')
      const yearDate = dayjs(countryData.year.toString()).month(5).date(1).toDate();

      // 步骤 2.3: 在将数据添加到待创建列表前，检查其唯一性。
      // 使用与上面 `existingValuesSet` 相同的格式创建唯一标识符。
      const uniqueIdentifier = `${country.id}-${countryData.year}-${detailedIndicator.id}`;
      if (!existingValuesSet.has(uniqueIdentifier)) {
        // 如果该组合不存在，则将其添加到待创建数组中。
        valuesToCreate.push({
          countryId: country.id,
          detailedIndicatorId: detailedIndicator.id,
          year: yearDate,
      //    value: valueData.value, // 假设 value 可能为 null 或 undefined
          // Prisma 会自动处理 Decimal 类型，无需特殊转换
          ...(valueData.value !== null &&
            valueData.value !== undefined && { value: valueData.value }),
        });

        // 为了防止在同一次运行中添加重复记录，也将新的唯一标识符添加到 set 中。
        existingValuesSet.add(uniqueIdentifier);
      }
    }
  }

  // 步骤 3: 检查是否有任何新的记录需要被创建。
  if (valuesToCreate.length > 0) {
    console.info({ count: valuesToCreate.length }, `准备创建 ${valuesToCreate.length} 条新的指标数值...`);
    // 使用 `createMany` API 一次性将数组中的所有数据插入数据库，这是最高效的方式。
    await prisma.indicatorValue.createMany({
      data: valuesToCreate,
    });
    console.info('新的指标数值已批量创建完毕!');
  } else {
    console.info('没有新的指标数值需要创建.');
  }

  console.info('指标数值种子数据生成完毕!');
}

/**
 * 认证相关数据初始化（角色和用户）
 */
async function seedAuthData() {
  console.log('开始初始化认证数据...');
  // 只保留超管角色
  let adminRole = await prisma.role.findFirst({ where: { name: 'admin', delete: 0 } });
  if (adminRole) {
    adminRole = await prisma.role.update({
      where: { id: adminRole.id },
        data: {
        description: '拥有所有权限，可以访问所有功能模块',
        allowedRoutes: [],
        },
      });
    console.log('超管角色已存在，已更新');
    } else {
    adminRole = await prisma.role.create({
        data: {
        name: 'admin',
        description: '拥有所有权限，可以访问所有功能模块',
        allowedRoutes: [],
        },
      });
    console.log('超管角色已创建');
  }

  const encryptedUsers = await generateUsers();
  for (const user of encryptedUsers) {
    const existingUser = await prisma.user.findFirst({ where: { code: user.code, delete: 0 } });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: user.name,
          department: user.department,
          email: user.email,
          phone: user.phone,
          password: user.password,
          roleId: adminRole.id,
        },
      });
      console.log(`超管用户 "${user.name}" (${user.code}) 已更新`);
    } else {
      await prisma.user.create({
        data: {
          code: user.code,
          name: user.name,
          department: user.department,
          email: user.email,
          phone: user.phone,
          password: user.password,
          roleId: adminRole.id,
        },
      });
      console.log(`超管用户 "${user.name}" (${user.code}) 已创建`);
    }
  }
  console.log('认证数据初始化完成！');
  console.log('\n初始用户账号：');
  console.log('超管 账号/密码均为 8个8');
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
  await seedUrbanizationWorldMap(countryCache); // 在国家数据创建后，立即为其创建对应的地图展示数据。
  await seedIndicators(topIndicatorCache, secondaryIndicatorCache, detailedIndicatorCache);
  // await seedIndicatorValues(countryCache, detailedIndicatorCache);
  // 认证相关数据初始化
  await seedAuthData();
}

// 脚本的执行入口点。
main()
  .catch((e) => {
    // 捕获并打印任何在异步执行过程中发生的错误。
    console.error(e, '数据生成过程中发生错误:');
    process.exit(1); // 以非零退出码退出，表示执行失败。
  })
  .finally(async () => {
    // 无论成功或失败，最后都确保断开与数据库的连接，释放资源。
    await prisma.$disconnect();
  });

