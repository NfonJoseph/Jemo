import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RiderApplyDto } from "./dto/rider-apply.dto";

@Injectable()
export class RiderApplyService {
  constructor(private readonly prisma: PrismaService) {}

  // This endpoint is disabled - delivery agency accounts are admin-created only
  async apply(userId: string, dto: RiderApplyDto) {
    throw new BadRequestException(
      "Self-service rider registration has been discontinued. Delivery agency accounts can only be created by administrators. Please contact support for more information."
    );
  }
}

