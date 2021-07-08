import { User, TokenRecord } from '@accounts/types';

export const getUserLoginTokens = (user: User): TokenRecord[] => {
  return user.services?.magicLink?.loginTokens ?? [];
};
