import { Request } from 'express';

export interface AccountsSessionRequest extends Request {
  authToken?: string;
  user?: any;
  userId?: string;
}
