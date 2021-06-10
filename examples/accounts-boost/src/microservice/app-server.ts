import accountsBoost, { authenticated } from '@accounts/boost';
import { setContext } from 'apollo-link-context';
import { HttpLink } from 'apollo-link-http';
import { ApolloServer } from 'apollo-server';
import { mergeSchemas } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { introspectSchema, makeRemoteExecutableSchema } from '@graphql-tools/wrap';
import fetch from 'node-fetch';
import { AuthenticatedDirective, context } from '@accounts/graphql-api';

const accountsServerUri = 'http://localhost:4003/';

(async () => {
  const accounts = await accountsBoost({
    tokenSecret: 'terrible secret',
    micro: true, // setting micro to true will instruct `@accounts/boost` to only verify access tokens without any additional session logic
  });

  const accountsApp = accounts.graphql();

  // // Note: the following steps are optional and only required if you want to stitch the remote accounts schema with your apps schema.

  // // Creates a link to fetch the remote schema from the accounts microservice.

  const http = new HttpLink({ uri: accountsServerUri, fetch: fetch as any });

  const link = setContext((request, previousContext) => {
    if (!previousContext.graphqlContext) {
      return {};
    }
    // Attach the Authorization to requests which are proxied to the remote schema.
    // This step is optional and only required if you want the `getUser` query to return data.
    return {
      headers: {
        Authorization: 'Bearer ' + previousContext.graphqlContext.authToken,
      },
    };
  }).concat(http);

  const remoteSchema = await introspectSchema(link as any);

  const executableRemoteSchema = makeRemoteExecutableSchema({
    schema: remoteSchema,
    link,
  } as any);

  // The @auth directive needs to be declared in your typeDefs

  const typeDefs = `
    directive @auth on FIELD_DEFINITION | OBJECT

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

  const executableLocalSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const apolloServer = await new ApolloServer({
    schema: mergeSchemas({
      schemas: [executableLocalSchema, executableRemoteSchema],
      schemaDirectives: {
        // In order for the `@auth` directive to work
        auth: AuthenticatedDirective,
      } as any,
    }),
    context: ({ req, connection }) => {
      return context(
        { req, connection },
        {
          accountsServer: accounts.accountsServer,
        }
      );
    },
  }).listen();

  console.log(`GraphQL server running at ${apolloServer.url}`);
})();
