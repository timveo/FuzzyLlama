import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        planTier: true,
        emailVerified: true,
        monthlyAgentExecutions: true,
        lastExecutionReset: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
    // Check if user is updating their own profile
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        emailVerified: updateUserDto.email !== user.email ? false : user.emailVerified,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        planTier: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    currentUserId: string,
  ) {
    // Check if user is changing their own password
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only change your own password');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a password (OAuth users don't)
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses OAuth and does not have a password',
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async delete(id: string, currentUserId: string) {
    // Check if user is deleting their own account
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user (cascade will delete related data)
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Account deleted successfully' };
  }

  async getUsageStats(id: string, currentUserId: string) {
    // Check if user is viewing their own stats
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only view your own usage stats');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        planTier: true,
        monthlyAgentExecutions: true,
        lastExecutionReset: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get project count
    const projectCount = await this.prisma.project.count({
      where: { ownerId: id },
    });

    // Define limits based on plan tier
    const limits = {
      FREE: { projects: 1, executions: 50 },
      PRO: { projects: 10, executions: 500 },
      TEAM: { projects: Infinity, executions: 2000 },
      ENTERPRISE: { projects: Infinity, executions: Infinity },
    };

    const tierLimits = limits[user.planTier] || limits.FREE;

    return {
      planTier: user.planTier,
      usage: {
        projects: projectCount,
        agentExecutions: user.monthlyAgentExecutions,
      },
      limits: tierLimits,
      lastReset: user.lastExecutionReset,
    };
  }
}
