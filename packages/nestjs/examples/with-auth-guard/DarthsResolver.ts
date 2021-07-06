import { User } from '@accounts/types';
import { ExecutionContext, UseGuards, UseInterceptors } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { AccountsSessionRequest, AuthGuard, AuthValidator } from '../../lib';
import { AccountsErrorInterceptor } from '../../lib/interceptors/AccountsError.interceptor';
import { getGQLContext, GQLParam, isGQLParam } from '../../lib/utils/GraphQLUtils';

const IsDarthVader = (user: User) => user.username === 'darth_vader';
const TalkingToLuke = (_: User, _context: ExecutionContext, params: AccountsSessionRequest | GQLParam) =>
  isGQLParam(params) ? !!getGQLContext<any>(params).talkingToLuke : !!params.body.talkingToLuke;

@Resolver()
@UseInterceptors(AccountsErrorInterceptor)
@UseGuards(AuthGuard)
@AuthValidator(IsDarthVader)
export class DarthsResolver {
  @Query(_ => String)
  darthsSecret() {
    return 'I am Anakin Skywalker';
  }

  @Query(_ => String)
  @UseGuards(AuthGuard)
  @AuthValidator(TalkingToLuke, () => true)
  darthsDeepestSecret() {
    return 'Luke, I am your father';
  }

  @Query(_ => String)
  @UseGuards(AuthGuard)
  @AuthValidator(() => process.env.NODE_ENV === 'development') // Auth Validator can do anything, even if it's not user related
  devOnly() {
    return 'secret dev stuff';
  }
}
