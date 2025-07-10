// import { Controller, Post, Body } from '@nestjs/common';
// import { SupplierService } from './supplier.service';
// import { Prisma } from '@prisma/client';
//
// import { SupplierPageParams } from '../../../types/dto';
//
// @Controller('supplier')
// export class SupplierController {
//   constructor(private readonly supplierService: SupplierService) {}
//   @Post('create')
//   create(@Body() data: Prisma.SupplierCreateInput) {
//     return this.supplierService.create(data);
//   }
//
//   @Post('update')
//   update(@Body() data: { id: string } & Prisma.SupplierUpdateInput) {
//     const { id, ...updateData } = data;
//     return this.supplierService.update(id, updateData);
//   }
//
//   @Post('list')
//   list(@Body() data: SupplierPageParams) {
//     return this.supplierService.list(data);
//   }
//
//   @Post('detail')
//   detail(@Body('id') id: string) {
//     return this.supplierService.detail(id);
//   }
//
//   @Post('delete')
//   delete(@Body('id') id: string) {
//     return this.supplierService.delete(id);
//   }
//
//   @Post('deleteImage')
//   async deleteImage(@Body() data: { id: string; filename: string }) {
//     return this.supplierService.deleteImage(data.id, data.filename);
//   }
//
//   @Post('listAll')
//   listAll() {
//     return this.supplierService.listAll();
//   }
// }
