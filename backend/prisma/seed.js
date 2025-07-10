// seed.js
const { PrismaClient } = require('@prisma/client');
const { fakerZH_CN: faker } = require('@faker-js/faker');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// 图片目录路径
const imagesDir = path.resolve(__dirname, '..', 'uploads', 'images');

async function main() {
  console.log('开始生成种子数据...');

  let imageFiles = [];
  try {
    // 确保图片目录存在
    if (fs.existsSync(imagesDir)) {
      imageFiles = fs.readdirSync(imagesDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      });
      if (imageFiles.length === 0) {
        console.warn(
          '警告: /uploads/images 目录下没有找到图片文件。图片字段将为空。',
        );
      }
    } else {
      console.warn('警告: /uploads/images 目录不存在。图片字段将为空。');
      fs.mkdirSync(imagesDir, { recursive: true }); // 创建目录，以便下次可以放置图片
    }
  } catch (error) {
    console.error('读取图片目录失败:', error);
    console.warn('警告: 读取图片目录失败，图片字段将为空。');
    process.exit(1); // 退出进程并指示失败
  }

  // 辅助函数：随机获取图片文件名
  const getRandomImages = (count = 1) => {
    if (imageFiles.length === 0) {
      return [];
    }
    const shuffled = [...imageFiles].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * count) + 1);
  };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 生成 CustomerAddress 数据
      const customerAddressesData = Array.from({ length: 35 }).map(() => ({
        name: faker.location.streetAddress(true),
        delete: 0,
      }));
      const createdCustomerAddresses =
        await tx.customerAddress.createManyAndReturn({
          data: customerAddressesData,
        });
      const customerAddressIds = createdCustomerAddresses.map((ca) => ca.id);
      console.log(
        `生成了 ${customerAddressIds.length} 条 CustomerAddress 数据.`,
      );

      // 2. 生成 ProductType 数据
      const productTypesData = Array.from({ length: 35 }).map(() => ({
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        delete: 0,
      }));
      const createdProductTypes = await tx.productType.createManyAndReturn({
        data: productTypesData,
      });
      const productTypeIds = createdProductTypes.map((pt) => pt.id);
      console.log(`生成了 ${productTypeIds.length} 条 ProductType 数据.`);

      // 3. 生成 Supplier 数据
      const suppliersData = Array.from({ length: 35 }).map(() => ({
        name: faker.company.name(),
        phone: faker.phone.number('1#########'),
        wechat: faker.internet.username(),
        description: faker.lorem.paragraph(),
        rating: faker.helpers.arrayElement(['优秀', '良好', '一般']),
        images: getRandomImages(3), // 随机1到3张图片
        delete: 0,
      }));
      const createdSuppliers = await tx.supplier.createManyAndReturn({
        data: suppliersData,
      });
      const supplierIds = createdSuppliers.map((s) => s.id);
      console.log(`生成了 ${supplierIds.length} 条 Supplier 数据.`);

      // 4. 生成 Product 数据 (依赖 ProductType)
      const productsData = Array.from({ length: 35 }).map(() => ({
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        productTypeId: faker.helpers.arrayElement(productTypeIds),
        delete: 0,
      }));
      const createdProducts = await tx.product.createManyAndReturn({
        data: productsData,
      });
      const productIds = createdProducts.map((p) => p.id);
      console.log(`生成了 ${productIds.length} 条 Product 数据.`);

      // 5. 生成 Customer 数据 (依赖 CustomerAddress)
      const customersData = Array.from({ length: 35 }).map(() => ({
        name: faker.person.fullName(),
        phone: faker.phone.number('1#########'),
        wechat: faker.internet.username(),
        address: faker.location.streetAddress(true),
        description: faker.lorem.sentence(),
        customerAddressId: faker.helpers.arrayElement(customerAddressIds),
        delete: 0,
      }));
      const createdCustomers = await tx.customer.createManyAndReturn({
        data: customersData,
      });
      const customerIds = createdCustomers.map((c) => c.id);
      console.log(`生成了 ${customerIds.length} 条 Customer 数据.`);

      // 6. 生成 GroupBuy 数据 (依赖 Supplier 和 Product)
      const groupBuysData = Array.from({ length: 35 }).map(() => ({
        name: `${faker.commerce.productAdjective()}团购`,
        description: faker.lorem.paragraph(),
        groupBuyStartDate: faker.date.recent({ days: 30 }),
        supplierId: faker.helpers.arrayElement(supplierIds),
        productId: faker.helpers.arrayElement(productIds),
        units: [
          // 生成随机规格
          {
            id: faker.string.uuid(),
            unit: '500g',
            price: faker.commerce.price({ min: 10, max: 50 }),
            costPrice: faker.commerce.price({ min: 5, max: 20 }),
          },
          {
            id: faker.string.uuid(),
            unit: '1kg',
            price: faker.commerce.price({ min: 50, max: 100 }),
            costPrice: faker.commerce.price({ min: 20, max: 50 }),
          },
        ],
        images: getRandomImages(3), // 随机1到3张图片
        delete: 0,
      }));
      const createdGroupBuys = await tx.groupBuy.createManyAndReturn({
        data: groupBuysData,
      });
      const groupBuyIds = createdGroupBuys.map((gb) => gb.id);
      console.log(`生成了 ${groupBuyIds.length} 条 GroupBuy 数据.`);

      // 7. 生成 Order 数据 (依赖 Customer 和 GroupBuy)
      const ordersData = Array.from({ length: 35 }).map(() => {
        const randomGroupBuy = faker.helpers.arrayElement(createdGroupBuys);
        const units = randomGroupBuy.units;
        const randomUnit = faker.helpers.arrayElement(units);

        return {
          customerId: faker.helpers.arrayElement(customerIds),
          groupBuyId: randomGroupBuy.id,
          unitId: randomUnit.id, // 使用实际的 unitId
          quantity: faker.number.int({ min: 1, max: 10 }),
          description: faker.lorem.sentence(),
          status: faker.helpers.arrayElement([
            'NOTPAID',
            'COMPLETED',
            'REFUNDED',
          ]),
          delete: 0,
        };
      });
      const createdOrders = await tx.order.createManyAndReturn({
        data: ordersData,
      });
      console.log(`生成了 ${createdOrders.length} 条 Order 数据.`);

      console.log('所有数据生成成功！');
    });
  } catch (e) {
    console.error('数据生成过程中发生错误，事务已回滚:', e);
    process.exit(1); // 退出进程并指示失败
  } finally {
    await prisma.$disconnect();
  }
}

main();
