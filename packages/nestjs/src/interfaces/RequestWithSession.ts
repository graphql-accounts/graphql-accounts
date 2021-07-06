import { Request } from 'express';

export interface RequestWithSession extends Request {
  session: any;
}
