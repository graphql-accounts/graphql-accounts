import { createParamDecorator } from '@nestjs/common';
import { getFieldFromDecoratorParams } from '../utils/GraphQLUtils';

/**
 * Parameter decorator to get the current logged in user's current session auth token from the request or GraphQL Context.
 *
 * @example
 *   @Controller('spy')
 *   controller SpyController{
 *      @Get()
 *      spy(@AuthToken() token?: string){
 *        return `Logged in with auth token ${token}`;
 *      }
 *   }
 */
export const AuthToken = createParamDecorator((_data: any, param: any) =>
  getFieldFromDecoratorParams(param, 'authToken'),
);
