import { createParamDecorator } from '@nestjs/common';
import { getFieldFromDecoratorParams } from '../utils/GraphQLUtils';

/**
 * Parameter decorator to get the user ID from the request or GraphQL Context
 *
 * @example
 *   @Controller('cats')
 *   controller CatsController{
 *      @Get()
 *      cats(@UserId() userId: string){
 *        return `${userID}'s cats!`;
 *      }
 *   }
 */
export const UserId = createParamDecorator((_data: any, param: any) => getFieldFromDecoratorParams(param, 'userId'));
