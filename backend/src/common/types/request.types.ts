import { Request } from 'express';
import { RequestUser } from './user.types';

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
