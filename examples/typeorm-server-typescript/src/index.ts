import { ApolloServer, makeExecutableSchema } from 'apollo-server';
import { mergeGraphQLSchemas, mergeResolvers } from 'graphql-toolkit';

import { AccountsModule } from '@accounts/graphql-api';
import { AccountsPassword } from '@accounts/password';
import { AccountsServer } from '@accounts/server';
import { AccountsTypeorm } from '@accounts/typeorm';
// import { Connection } from 'typeorm';
import { connect } from './conn';

export const createAccounts = async () => {
  const connection = await connect(process.env.TEST_DATABASE_URL);

  const tokenSecret = 'ACCOUNTS_SECRET' || 'not very secret secret';
  const db = new AccountsTypeorm({ connection, cache: 1000 });
  const password = new AccountsPassword({
    // twoFactor: {
    //     appName: 'Prime',
    // },
  });

  const accountsServer = new AccountsServer(
    {
      db,
      tokenSecret,
      siteUrl: 'http://localhost:3000',
    },
    { password }
  );

  const accounts = AccountsModule.forRoot({
    accountsServer,
  });
  // Creates resolvers, type definitions, and schema directives used by accounts-js
  const accountsGraphQL = AccountsModule.forRoot({
    accountsServer,
  });

  const typeDefs = `
  type PrivateType @auth {
    field: String
  }

  # Our custom fields to add to the user
  extend input CreateUserInput {
    profile: CreateUserProfileInput!
  }

  input CreateUserProfileInput {
    firstName: String!
    lastName: String!
  }

  type Query {
    publicField: String
    privateField: String @auth
    privateType: PrivateType
  }

  type Mutation {
    _: String
  }
  `;

  const resolvers = {
    Query: {
      publicField: () => 'public',
      privateField: () => 'private',
      privateType: () => ({
        field: () => 'private',
      }),
    },
  };

  const schema = makeExecutableSchema({
    typeDefs: mergeGraphQLSchemas([typeDefs, accountsGraphQL.typeDefs]),
    resolvers: mergeResolvers([accountsGraphQL.resolvers as any, resolvers]) as any,
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
    // tslint:disable-next-line:no-console
    console.log(`🚀  Server ready at ${url}`);
  });
};
// return accounts;
// };
createAccounts();

// import { DatabaseManager } from '@accounts/database-manager';

// import MongoDBInterface from '@accounts/mongo';
// import mongoose from 'mongoose';
// conn = Connection;
// const start = async () => {
//     // Create database connection
//     // await mongoose.connect('mongodb://localhost:27017/accounts-js-graphql-example');
//     // const mongoConn = mongoose.connection;
//     // const tokenSecret = "ACCOUNTS_SECRET" || 'not very secret secret';
//     const db = new AccountsTypeorm({ cache: 1000 });
//     const accountsPassword = new AccountsPassword({
//         // This option is called when a new user create an account
//         // Inside we can apply our logic to validate the user fields
//         validateNewUser: user => {
//             // For example we can allow only some kind of emails
//             if (user.email.endsWith('.xyz')) {
//                 throw new Error('Invalid email');
//             }
//             return user;
//         },
//     });
//     // Build a storage for storing users
//     // const userStorage = new MongoDBInterface(mongoConn);
//     // Create database manager (create user, find users, sessions etc) for accounts-js
//     // const accountsDb = new DatabaseManager({
//     //     sessionStorage: userStorage,
//     //     userStorage,
//     // });

//     // Create accounts server that holds a lower level of all accounts operations
//     const accountsServer = new AccountsServer(
//         { db, tokenSecret: 'secret' },
//         { accountsPassword }
//     );

//     // Creates resolvers, type definitions, and schema directives used by accounts-js
//     const accountsGraphQL = AccountsModule.forRoot({
//         accountsServer,
//     });

//     const typeDefs = `
//   type PrivateType @auth {
//     field: String
//   }

//   # Our custom fields to add to the user
//   extend input CreateUserInput {
//     profile: CreateUserProfileInput!
//   }

//   input CreateUserProfileInput {
//     firstName: String!
//     lastName: String!
//   }

//   type Query {
//     publicField: String
//     privateField: String @auth
//     privateType: PrivateType
//   }

//   type Mutation {
//     _: String
//   }
//   `;

//     const resolvers = {
//         Query: {
//             publicField: () => 'public',
//             privateField: () => 'private',
//             privateType: () => ({
//                 field: () => 'private',
//             }),
//         },
//     };

//     const schema = makeExecutableSchema({
//         typeDefs: mergeGraphQLSchemas([typeDefs, accountsGraphQL.typeDefs]),
//         resolvers: mergeResolvers([accountsGraphQL.resolvers as any, resolvers]) as any,
//         schemaDirectives: {
//             ...accountsGraphQL.schemaDirectives,
//         },
//     });

//     // Create the Apollo Server that takes a schema and configures internal stuff
//     const server = new ApolloServer({
//         schema,
//         context: accountsGraphQL.context,
//     });

//     server.listen(4000).then(({ url }) => {
//         // tslint:disable-next-line:no-console
//         console.log(`🚀  Server ready at ${url}`);
//     });
// };
// start();
