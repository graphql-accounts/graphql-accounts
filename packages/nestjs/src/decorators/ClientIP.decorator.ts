import { createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { getClientIp } from 'request-ip';
import { getFieldFromDecoratorParams, isGQLParam } from '../utils/GraphQLUtils';

/**
 * Parameter decorator to get the current logged in user's IP address from the request or GraphQL Context.
 *
 * @example
 *   @Controller('spy')
 *   controller SpyController{
 *      @Get()
 *      spy(@ClientIP() ip?: string){
 *        return `Logged in from IP: ${ip}`;
 *      }
 *   }
 */
export const ClientIP = createParamDecorator((_data: any, req: Request) => {
  if (isGQLParam(req)) {
    getFieldFromDecoratorParams(req, 'ip');
  } else {
    return getClientIp(req); // fall back to using request-ip
  }
});
