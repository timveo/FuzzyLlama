import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, updateUserDto, user.id);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only change own password' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.changePassword(id, changePasswordDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.delete(id, user.id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get user usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only view own stats' })
  async getUsageStats(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.getUsageStats(id, user.id);
  }
}
