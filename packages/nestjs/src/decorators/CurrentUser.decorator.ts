import { createParamDecorator } from '@nestjs/common';
import { getFieldFromDecoratorParams } from '../utils/GraphQLUtils';
import { isArray } from 'util';

/**
 * Parameter decorator to get the current logged in user from the request or GraphQL Context.
 * Also takes an array of sub-fields to drill down into. e.g. @CurrentUser(["name","first"]) will return user.name.first
 *
 * @example
 *   @Controller('spy')
 *   controller SpyController{
 *      @Get()
 *      spy(@CurrentUser() user?: any){
 *          if (user) {
 *              return `Logged in as ${JSON.stringify(user)}`
 *          } else {
 *              return `Hello Stranger, why don't you log in?`
 *          }
 *      }
 *   }
 *
 *
 * @example With fields to drill into
 *   @Controller('spy')
 *   controller SpyController{
 *      @Get()
 *      spy(@CurrentUser(["name","first"]) firstName?: string){
 *          if (user) {
 *              return `Logged in as ${firstName}`
 *          } else {
 *              return `Hello Stranger, why don't you log in?`
 *          }
 *      }
 *   }
 *
 */
export const CurrentUser = createParamDecorator((data: any | any[], param) => {
  if (!data) {
    getFieldFromDecoratorParams(param, 'user');
  }
  return getFieldFromDecoratorParams(param, 'user', ...(isArray(data) ? data : [data]));
});
