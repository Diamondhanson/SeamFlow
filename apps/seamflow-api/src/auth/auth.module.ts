import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Registers SupabaseAuthGuard and RolesGuard as global guards.
 * Order matters: SupabaseAuthGuard runs first to populate req.user,
 * then RolesGuard checks role-based access.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
