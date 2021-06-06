import { QueryResolvers } from '../../../models';

export const Query: QueryResolvers<GraphQLModules.Context> = {
  getUser: (_, __, context) => context.user || null,
};
