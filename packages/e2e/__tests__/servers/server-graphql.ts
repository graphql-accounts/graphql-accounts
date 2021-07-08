import { AccountsClient } from '@accounts/client';
import { AccountsClientPassword } from '@accounts/client-password';
import { AccountsModule } from '@accounts/graphql-api';
import { AccountsGraphQLClient } from '@accounts/graphql-client';
import { AccountsPassword } from '@accounts/password';
import { AccountsServer } from '@accounts/server';
import { DatabaseInterface, User } from '@accounts/types';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { ApolloServer } from 'apollo-server';
import fetch from 'node-fetch';

import { ServerTestInterface } from '.';
import { DatabaseTestInterface } from '../databases';
import { DatabaseTest } from '../databases/mongo';

// Server
// Client
(global as any).fetch = fetch;

const convertUrlToToken = (url: string): string => {
  const split = url.split('/');
  return split[split.length - 1];
};

export class ServerGraphqlTest implements ServerTestInterface {
  public port = 5000;

  public accountsServer: AccountsServer;
  public accountsPassword: AccountsPassword;
  public accountsDatabase: DatabaseInterface;

  public accountsClient: AccountsClient;
  public accountsClientPassword: AccountsClientPassword;

  public emails: any[];

  private apolloServer: ApolloServer;
  private databaseTest: DatabaseTestInterface;

  constructor() {
    this.databaseTest = new DatabaseTest();
    this.accountsDatabase = this.databaseTest.accountsDatabase;
    this.accountsPassword = new AccountsPassword();
    this.accountsServer = new AccountsServer(
      {
        db: this.accountsDatabase,
        tokenSecret: 'test',
        emailTemplates: {
          from: 'accounts-js <no-reply@accounts-js.com>',
          verifyEmail: {
            subject: () => 'Verify your account email',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          resetPassword: {
            subject: () => 'Reset your password',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          enrollAccount: {
            subject: () => 'Set your password',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          passwordChanged: {
            subject: () => 'Your password has been changed',
            text: () => `Your account password has been successfully changed`,
            html: () => `Your account password has been successfully changed.`,
          },
          magicLink: {
            subject: () => 'Your magic link',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
        },
        sendMail: async (mail) => {
          this.emails.push(mail);
        },
      },
      {
        password: this.accountsPassword,
      }
    );
    const { schema, context } = AccountsModule.forRoot({
      accountsServer: this.accountsServer,
    });

    this.apolloServer = new ApolloServer({
      schema,
      context,
    });

    const apolloClient = new ApolloClient({
      uri: `http://localhost:${this.port}`,
      cache: new InMemoryCache(),
    });

    const accountsClientGraphQL = new AccountsGraphQLClient({
      graphQLClient: apolloClient,
    });
    this.accountsClient = new AccountsClient({}, accountsClientGraphQL);
    this.accountsClientPassword = new AccountsClientPassword(this.accountsClient);
    this.emails = [];
  }

  public async start() {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await this.apolloServer.listen({ port: this.port });
    await this.databaseTest.start();
  }

  public async stop() {
    await this.apolloServer.stop();
    await this.databaseTest.stop();
  }
}
