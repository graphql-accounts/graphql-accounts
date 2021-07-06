import { createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { getFieldFromDecoratorParams, isGQLParam } from '../utils/GraphQLUtils';

/**
 * Parameter decorator to get the user's browser User Agent from the request or GraphQL Context
 *
 * @example
 *   @Controller('spy')
 *   controller SpyController{
 *      @Get()
 *      spy(@UserAgent() userAgent: string){
 *        return `Your Browser is: ${userAgent}`;
 *      }
 *   }
 */
export const UserAgent = createParamDecorator((_data: any, req: Request) => {
  if (isGQLParam(req)) {
    return getFieldFromDecoratorParams(req, 'userAgent');
  }
  // fall back to doing what accounts-rest does // todo: can we just call accounts-rest's middleware here?
  let userAgent: string = (req.headers['user-agent'] as string) || '';
  if (req.headers['x-ucbrowser-ua']) {
    // special case of UC Browser
    userAgent = req.headers['x-ucbrowser-ua'] as string;
  }
  return userAgent;
});
