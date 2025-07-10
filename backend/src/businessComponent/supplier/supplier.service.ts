// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../../prisma/prisma.service';
// import { Prisma, Supplier } from '@prisma/client';
//
// import {
//   SupplierPageParams,
//   ListByPage,
//   SupplierListItem,
// } from '../../../types/dto';
// import { BusinessException } from '../../exceptions/businessException';
// import { ErrorCode } from '../../../types/response';
//
// @Injectable()
// export class SupplierService {
//   constructor(private prisma: PrismaService) {}
//
//   async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
//     return this.prisma.supplier.create({ data });
//   }
//
//   async update(
//     id: string,
//     data: Prisma.SupplierUpdateInput,
//   ): Promise<Supplier> {
//     return this.prisma.supplier.update({
//       where: { id },
//       data,
//     });
//   }
//
//   async list(
//     data: SupplierPageParams,
//   ): Promise<ListByPage<SupplierListItem[]>> {
//     const { page, pageSize, name, phone, wechat } = data;
//     const skip = (page - 1) * pageSize; // 计算要跳过的记录数
//
//     const where: Prisma.SupplierWhereInput = {
//       delete: 0, // 仅查询未删除的供货商
//     };
//
//     if (name) {
//       where.name = {
//         contains: name,
//       };
//     }
//
//     if (phone) {
//       where.phone = {
//         contains: phone,
//       };
//     }
//
//     if (wechat) {
//       where.wechat = {
//         contains: wechat,
//       };
//     }
//
//     const [suppliers, totalCount] = await this.prisma.$transaction([
//       this.prisma.supplier.findMany({
//         skip: skip,
//         take: pageSize,
//         orderBy: {
//           createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
//         },
//         where,
//         include: {
//           _count: {
//             select: {
//               groupBuy: {
//                 where: {
//                   delete: 0,
//                 },
//               },
//             },
//           },
//         },
//       }),
//       this.prisma.supplier.count({ where }), // 获取总记录数
//     ]);
//
//     return {
//       data: suppliers.map((supplier) => ({
//         ...supplier,
//         groupBuyCount: supplier._count.groupBuy,
//       })),
//       page: page,
//       pageSize: pageSize,
//       totalCount: totalCount,
//       totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
//     };
//   }
//
//   async detail(id: string): Promise<Supplier | null> {
//     return this.prisma.supplier.findUnique({
//       where: { id },
//     });
//   }
//
//   async delete(id: string): Promise<Supplier> {
//     const groupBuyCount = await this.prisma.groupBuy.count({
//       where: {
//         supplierId: id,
//         delete: 0, // 只检查未删除的团购单
//       },
//     });
//
//     if (groupBuyCount > 0) {
//       throw new BusinessException(
//         ErrorCode.DATA_STILL_REFERENCED,
//         `该供货商下存在关联的团购单（${groupBuyCount}条），无法删除。`,
//       );
//     }
//     return this.prisma.supplier.update({
//       where: { id },
//       data: { delete: 1 },
//     });
//   }
//
//   async deleteImage(id: string, filename: string): Promise<void> {
//     // 使用 Prisma 事务确保原子性操作
//     await this.prisma
//       .$transaction(async (tx) => {
//         // 获取供应商详情
//         const detail = await tx.supplier.findUnique({ where: { id } });
//
//         // 检查供应商是否存在
//         if (!detail) {
//           throw new BusinessException(
//             ErrorCode.RESOURCE_NOT_FOUND,
//             `供应商 ${id} 不存在。`,
//           );
//         }
//
//         // 3. 从图片列表中移除指定文件名
//         const updatedImages = (detail.images as Prisma.JsonArray).filter(
//           (item: string) => item !== filename,
//         );
//
//         // 4. 更新供应商的图片列表
//         await tx.supplier.update({
//           where: { id },
//           data: {
//             images: updatedImages,
//           },
//         });
//       })
//       .catch((error) => {
//         // 捕获事务中的任何错误，并重新抛出，以便上层控制器可以处理
//         console.error('删除图片事务失败:', error);
//         throw error; // 将错误重新抛出
//       });
//   }
//
//   async listAll(): Promise<Supplier[]> {
//     return this.prisma.supplier.findMany({
//       where: {
//         delete: 0,
//       },
//       orderBy: {
//         createdAt: 'asc',
//       },
//     });
//   }
// }
