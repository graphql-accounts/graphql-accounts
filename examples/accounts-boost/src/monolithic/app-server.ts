import accountsBoost, { authenticated } from '@accounts/boost';
import { AuthenticatedDirective, context } from '@accounts/graphql-api';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { ApolloServer } from 'apollo-server';

(async () => {
  const accounts = await accountsBoost({
    tokenSecret: 'terrible secret',
  });
  const accountsApp = accounts.graphql();

  const typeDefs = `
    type PrivateType @auth {
      privateField: String
    }

    type Query {
      publicField: String
      privateField: String @auth
      privateType: PrivateType
      privateFieldWithAuthResolver: String
    }

    type Mutation {
      privateMutation: String @auth
      publicMutation: String
    }
    `;

  const resolvers = {
    PrivateType: {
      privateField: () => 'private',
    },
    Query: {
      publicField: () => 'public',
      privateField: () => 'private',
      privateType: () => '',
      privateFieldWithAuthResolver: authenticated((root, args, context) => {
        return 'private';
      }),
    },
    Mutation: {
      privateMutation: () => 'private',
      publicMutation: () => 'public',
    },
  };

  const apolloServer = new ApolloServer({
    typeDefs: mergeTypeDefs([typeDefs, ...accountsApp.typeDefs]),
    resolvers: mergeResolvers([accountsApp.resolvers, resolvers]),
    schemaDirectives: {
      // In order for the `@auth` directive to work
      auth: AuthenticatedDirective,
    },
    context: ({ req, connection }) => {
      return context(
        { req, connection },
        {
          accountsServer: accounts.accountsServer,
        }
      );
    },
  } as any)
    .listen()
    .then((res) => {
      console.log(`GraphQL server running at ${res.url}`);
    });
})();
