import { QueryResolvers } from '../../../models';
import { ModuleContext } from '@graphql-modules/core';
import { AccountsContext } from '../../../utils/context-builder';

export const Query: QueryResolvers<ModuleContext<AccountsContext>> = {
  getUser: (_, __, context) => context.user || null,
};
