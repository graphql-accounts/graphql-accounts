import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../../';

@Resolver()
export class UserResolver {
  @Query(_ => String)
  public() {
    return 'beep boop';
  }

  @Query(_ => String)
  @UseGuards(AuthGuard)
  authenticatedSecret() {
    return 'secret';
  }
}
