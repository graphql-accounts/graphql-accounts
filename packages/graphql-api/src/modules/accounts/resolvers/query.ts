import { QueryResolvers } from '../../../models';

export const Query: QueryResolvers = {
  getUser: (_, __, context) => context.user || null,
};
