import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: "ok" };
  }

  @Get("db")
  async checkDb() {
    try {
      await this.prisma.user.count();
      return { status: "ok", db: "connected" };
    } catch (error) {
      throw new HttpException(
        { status: "error", db: "disconnected" },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
