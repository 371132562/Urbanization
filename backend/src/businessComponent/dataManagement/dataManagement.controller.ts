import { Controller, Post, Body } from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import { Prisma } from '@prisma/client';

@Controller('supplier')
export class DataManagementController {
  constructor(private readonly supplierService: DataManagementService) {}
}
