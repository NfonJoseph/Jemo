import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * Allows both authenticated and unauthenticated users through.
 * If authenticated, populates req.user with the user data.
 * If not authenticated, req.user is undefined (no error thrown).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent's canActivate to attempt JWT validation
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: any, user: TUser): TUser | null {
    // Don't throw on errors or missing user - just return null
    // This allows both authenticated and unauthenticated access
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
