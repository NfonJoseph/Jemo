import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import { QueryUsersDto, UpdateUserDto, UserActionDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * List all users with pagination, search, filters
   * GET /api/admin/users
   */
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.adminUsersService.findAll(query);
  }

  /**
   * Get single user with full details
   * GET /api/admin/users/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  /**
   * Update user details
   * PATCH /api/admin/users/:id
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminUsersService.update(id, dto, admin.id);
  }

  /**
   * Perform action on user (activate, suspend, reset_password)
   * POST /api/admin/users/:id/action
   */
  @Post(':id/action')
  performAction(
    @Param('id') id: string,
    @Body() dto: UserActionDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminUsersService.performAction(id, dto, admin.id);
  }

  /**
   * Soft delete user
   * DELETE /api/admin/users/:id
   */
  @Delete(':id')
  softDelete(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminUsersService.softDelete(id, admin.id);
  }
}
