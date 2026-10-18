// ============================================================================
// The dev hooks refuse to act on a remote project unless you say so in words.
//
// WHY THIS EXISTS: on 2026-10-18, during a routine check that the health
// endpoints responded, `POST /health/run-purge` was called against PRODUCTION.
// It deleted nothing — no account was past its grace period that day — but the
// next two were twelve days from being due, and it would have destroyed them
// without a prompt, a confirmation, or a trace.
//
// The reason it was reachable is mundane and will be true on any developer's
// machine: `apps/seamflow-api/.env` carries `NODE_ENV=development` and the
// PRODUCTION Supabase credentials. The P-23 fix stops these routes existing in
// production, and does nothing here, because locally the environment genuinely
// IS development.
//
// WHY NOT JUST POINT DATABASE_URL SOMEWHERE ELSE: because the purge does not
// only touch the database. It deletes storage objects and the auth user through
// `supabase.admin()`, so a local DATABASE_URL with production Supabase
// credentials would delete a tailor's photos and their login while leaving
// their rows on the laptop — a half-purge across two systems, which is worse
// than either mistake on its own. The thing that has to be checked is the
// PROJECT, not the database.
//
// THE RULE
//   * Supabase running locally (the CLI serves 127.0.0.1:54321) → allowed.
//     This is the normal development loop and it stays frictionless.
//   * Any remote project → refused, unless DEV_DESTRUCTIVE_HOOKS is set to the
//     exact phrase below.
//
// The phrase is long and has to be read to be typed, which is the entire point.
// `=true` is the kind of thing that ends up in a shell profile or a CI matrix
// by accident; this is not.
// ============================================================================

import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DESTRUCTIVE_OPT_IN = 'i-know-this-is-not-production';

@Injectable()
export class LocalTargetGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const url = this.config.get<string>('SUPABASE_URL') ?? '';
    if (isLocal(url)) return true;

    if (this.config.get<string>('DEV_DESTRUCTIVE_HOOKS') === DESTRUCTIVE_OPT_IN) {
      return true;
    }

    throw new ForbiddenException({
      error: 'remote_project',
      message:
        `This endpoint destroys or grants real things, and SUPABASE_URL points at ${hostOf(url)}, ` +
        'which is not a local project. Point it at a local Supabase (supabase start), or set ' +
        `DEV_DESTRUCTIVE_HOOKS=${DESTRUCTIVE_OPT_IN} if you genuinely mean to act on that project.`,
      project: hostOf(url),
    });
  }
}

/** The Supabase CLI serves on 127.0.0.1:54321; allow the usual local spellings. */
function isLocal(url: string): boolean {
  const host = hostOf(url);
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.test') ||
    // The Android emulator's alias for the host machine.
    host === '10.0.2.2'
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url || '(unset)';
  }
}
