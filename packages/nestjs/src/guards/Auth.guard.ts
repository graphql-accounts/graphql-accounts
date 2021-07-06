import { authenticated, User } from '@accounts/graphql-api';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthValidatorFn } from '../decorators/AuthValidator.decorator';
import { AccountsSessionRequest } from '../interfaces/AccountsRequest';
import { AUTH_VALIDATOR_FUNCTIONS } from '../utils/accounts.constants';
import { GQLParam } from '../utils/GraphQLUtils';

// todo: unify context better. It sounds like this will break see issue: https://github.com/nestjs/nest/issues/1581 and PR https://github.com/nestjs/nest/pull/2493
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const gqlCtx = ctx.getContext();
    if (gqlCtx) {
      try {
        const gqlParams: GQLParam = [ctx.getRoot(), ctx.getArgs(), gqlCtx, ctx.getInfo()];
        // use the authenticated function from accounts-js. All that's really needed is context
        await authenticated(() => null)(...gqlParams);
        return this.runValidators(gqlCtx.user, context, gqlParams);
      } catch (e) {
        return false;
      }
    }
    const req = context.switchToHttp().getRequest();
    if (!req || !req.user) {
      return false;
    }
    return this.runValidators(req.user, context, req);
  }

  /**
   * Run the validators setup by AuthValidator decorator
   * @param user
   * @param context
   * @param param
   */
  private async runValidators(
    user: User,
    context: ExecutionContext,
    param: AccountsSessionRequest | GQLParam,
  ): Promise<boolean> {
    // combine the validators from the class first, then the handler
    const validatorFns: Array<boolean | Promise<boolean>> = [
      ...this.getAndRunValidators(context.getClass(), user, context, param),
      ...this.getAndRunValidators(context.getHandler(), user, context, param),
    ];

    return (await Promise.all(validatorFns)).every(v => !!v); // Make sure that each promise resulted in a truthy value
  }

  /**
   * Discover and run the validator functions for this give scope
   * @param scope The class or member to check validators for
   * @param user
   * @param context
   * @param param
   */
  private getAndRunValidators(
    scope: any,
    user: User,
    context: ExecutionContext,
    param: AccountsSessionRequest | GQLParam,
  ): Array<boolean | Promise<boolean>> {
    return this.getValidators(scope).map(fn => fn(user, context, param));
  }

  private getValidators(scope: any): AuthValidatorFn[] {
    return this.reflector.get(AUTH_VALIDATOR_FUNCTIONS, scope) || [];
  }
}
