import 'reflect-metadata';
import { ApolloServer, makeExecutableSchema, gql } from 'apollo-server';
import { mergeTypeDefs, mergeResolvers } from '@graphql-toolkit/schema-merging';
import { AccountsModule } from '@accounts/graphql-api';
import { AccountsPassword } from '@accounts/password';
import { AccountsServer, ServerHooks } from '@accounts/server';
import { AccountsMikroOrm } from '@accounts/mikro-orm';
import { MikroORM } from 'mikro-orm';
import config, { User, Email } from './mikro-orm-config';

export const createAccounts = async () => {
  const orm = await MikroORM.init(config);
  const { em } = orm;

  const accountsDb = new AccountsMikroOrm({ em, UserEntity: User, EmailEntity: Email });

  const accountsPassword = new AccountsPassword({
    // This option is called when a new user create an account
    // Inside we can apply our logic to validate the user fields
    // By default accounts-js only allow 'username', 'email' and 'password' for the user
    // In order to add custom fields you need to pass the validateNewUser function when you
    // instantiate the 'accounts-password' package
    validateNewUser: (user) => {
      // For example we can allow only some kind of emails
      if (user.email.endsWith('.xyz')) {
        throw new Error('Invalid email');
      }
      return user;
    },
  });

  // Create accounts server that holds a lower level of all accounts operations
  const accountsServer = new AccountsServer(
    { db: accountsDb, tokenSecret: config.password },
    { password: accountsPassword }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountsServer.on(ServerHooks.ValidateLogin, ({ user }) => {
    // This hook is called every time a user try to login.
    // You can use it to only allow users with verified email to login.
    // If you throw an error here it will be returned to the client.
  });

  // Creates resolvers, type definitions, and schema directives used by accounts-js
  const accountsGraphQL = AccountsModule.forRoot({
    accountsServer,
  });

  const typeDefs = gql`
    type PrivateType @auth {
      field: String
    }

    # Our custom fields to add to the user
    extend input CreateUserInput {
      profile: CreateUserProfileInput!
    }

    extend type User {
      firstName: String!
      lastName: String!
    }

    input CreateUserProfileInput {
      firstName: String!
      lastName: String!
    }

    type Query {
      # Example of how to get the userId from the context and return the current logged in user or null
      me: User
      publicField: String
      # You can only query this if you are logged in
      privateField: String @auth
      privateType: PrivateType
    }

    type Mutation {
      _: String
    }
  `;

  const resolvers = {
    Query: {
      me: async (_, __, ctx) => {
        // ctx.userId will be set if user is logged in
        if (ctx.userId) {
          return accountsServer.findUserById(ctx.userId);
        }
        return null;
      },
      publicField: () => 'public',
      privateField: () => 'private',
      privateType: () => ({
        field: () => 'private',
      }),
    },
  };

  const schema = makeExecutableSchema({
    typeDefs: mergeTypeDefs([typeDefs, accountsGraphQL.typeDefs]),
    resolvers: mergeResolvers([accountsGraphQL.resolvers, resolvers]),
    schemaDirectives: {
      ...accountsGraphQL.schemaDirectives,
    },
  });

  // Create the Apollo Server that takes a schema and configures internal stuff
  const server = new ApolloServer({
    schema,
    context: accountsGraphQL.context,
  });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
};
createAccounts();