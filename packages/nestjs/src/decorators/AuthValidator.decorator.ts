import { User } from '@accounts/types';
import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { AccountsSessionRequest } from '../interfaces/AccountsRequest';
import { AUTH_VALIDATOR_FUNCTIONS } from '../utils/accounts.constants';
import { GQLParam } from '../utils/GraphQLUtils';

export type AuthValidatorFn = (
  user: User,
  context: ExecutionContext,
  params: AccountsSessionRequest | GQLParam,
) => boolean | Promise<boolean>;

/**
 * A decorator to set validator functions for the Auth Guard.
 * If any of the values evaluate to false, the user will not be allowed to activate
 * the route or resolver.
 *
 * @param fns Functions to run when validating the auth guard, must return a
 *            boolean or a promise that resolves to a boolean
 *
 * @example
 *
 * const deactivatedValidator = (user) => !user.deactivated;
 * const promiseValidator = async (user) => {
 *     const posts = await db.findUserPosts(); //some async operation
 *     return posts.length > 0; // make sure to still return a boolean value
 * }
 *
 * @Controller("/auth")
 * @UseGuards(AuthGuard)
 * @AuthValidator(deactivatedValidator, promiseValidator)
 * class AuthController {
 *     @Get("/")
 * }
 */
export const AuthValidator = (...fns: AuthValidatorFn[]) => SetMetadata(AUTH_VALIDATOR_FUNCTIONS, fns);
