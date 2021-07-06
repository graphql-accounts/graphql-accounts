import { AccountsClient } from '@accounts/client';
import { AccountsClientPassword } from '@accounts/client-password';
import { AccountsModuleContext } from '@accounts/graphql-api';
import { AccountsGraphQLClient } from '@accounts/graphql-client';
import { PasswordCreateUserType, PasswordLoginType } from '@accounts/password';
import { GraphQLModule } from '@graphql-modules/core';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApolloServerBase, gql } from 'apollo-server-core';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import { ConfigService } from 'nestjs-config';
import { UserDatabase } from '../../shared/database.service';
import { storageMock } from '../../shared/fixtures/StorageMock';
import { AppModule } from '../app.module';

function createTestClients(apolloServer: ApolloServerBase, context?: AccountsModuleContext) {
  if (context) {
    apolloServer.requestOptions.context = context;
  }

  // apolloServer is protected, we need to cast module to any to get it
  const apolloClient = createTestClient(apolloServer as any);

  // Create your transport
  const accountsGraphQL = new AccountsGraphQLClient({
    graphQLClient: apolloClient,
    // other options
  });
  // Create the base AccountsClient
  const accountsClient = new AccountsClient({ tokenStorage: storageMock() }, accountsGraphQL);
  // Create any strategies of the Accounts Client, just password here
  const accountsPWClient = new AccountsClientPassword(accountsClient, {});

  return {
    apolloClient,
    accountsGraphQL,
    accountsClient,
    accountsPWClient,
  };
}

describe('with-auth-guard', () => {
  let app: INestApplication;
  let apolloServer: ApolloServerBase;
  let originalRequestOpts: any;
  let apolloClient: ApolloServerTestClient;
  let accountsClient: AccountsClient;
  let accountsPWClient: AccountsClientPassword;
  const darth: PasswordCreateUserType = {
    username: 'darth_vader',
    password: 'foobar',
    email: 'darth@empire.galaxy',
  };
  const luke: PasswordCreateUserType = {
    username: 'luke_skywalker',
    password: 'bar',
    email: 'luke@rebels.org',
  };

  beforeAll(async () => {
    const imports = [];

    const moduleFixture = await Test.createTestingModule({
      imports: [...imports, AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const module: GraphQLModule = moduleFixture.get<GraphQLModule>(GraphQLModule);

    apolloServer = (module as any).apolloServer as ApolloServerBase;
    originalRequestOpts = { ...apolloServer.requestOptions };

    let {
      accountsPWClient: _accountsPWClient,
      accountsClient: _accountsClient,
      apolloClient: _apolloClient,
    } = createTestClients(apolloServer);
    accountsPWClient = _accountsPWClient;
    accountsClient = _accountsClient;
    apolloClient = _apolloClient;

    await accountsPWClient.createUser(darth);
    await accountsPWClient.createUser(luke);

    const db = moduleFixture.get<UserDatabase>(UserDatabase);
    expect(db._users.length).toBe(2);
    // verifyEmails(db);
  });

  afterEach(async () => {
    await accountsClient.logout();
    apolloServer.requestOptions = { ...originalRequestOpts };
  });

  // const verifyEmails = (db: UserDatabase) => {
  //   db._users.forEach(v => v.emails.forEach(email => (email.verified = true)));
  // };
  const loginParams: (user: PasswordCreateUserType) => PasswordLoginType = userIn => {
    const { password, ...user } = userIn;
    return {
      user,
      password,
    };
  };

  const publicQuery = async (client: ApolloServerTestClient = apolloClient) => {
    const res = await client.query({
      query: gql`
        {
          public
        }
      `,
    });
    expect(res.data.public).toBe('beep boop');
  };

  const authenticatedSecretQuery = async (client: ApolloServerTestClient = apolloClient) => {
    const res = await client.query({
      query: gql`
        {
          authenticatedSecret
        }
      `,
    });
    expect(res.data.authenticatedSecret).toBe('secret');
  };
  const darthsSecretQuery = async (client: ApolloServerTestClient = apolloClient) => {
    const res = await client.query({
      query: gql`
        {
          darthsSecret
        }
      `,
    });
    expect(res.data).toBeTruthy();
    expect(res.data.darthsSecret).toBe('I am Anakin Skywalker');
  };
  const darthsDeepestSecretQuery = async (
    talkingToLuke: boolean = true,
    client: ApolloServerTestClient = apolloClient,
  ) => {
    const query = () =>
      client.query({
        query: gql`
          {
            darthsDeepestSecret
          }
        `,
      });

    if (talkingToLuke) {
      const res = await query();
      expect(res.data).toBeDefined();
      expect(res.data).toMatchObject({ darthsDeepestSecret: 'Luke, I am your father' });
    } else {
      const res = await query();
      expect(res).toBeDefined();
      expect(res.errors).toHaveLength(1);
    }
  };

  it('should allow non-guarded routes', () => publicQuery(apolloClient));

  it.each(['darthsSecret', 'darthsDeepestSecret', 'devOnly', 'authenticatedSecret'])(
    'should not allow access to secured queries %s',
    async query => {
      const res = await apolloClient.query({
        query: gql`
          {
            ${query}
          }
        `,
      });
      expect(res.errors.length).toBe(1);
      // expect(res.errors[0]).toBe('Not Authenticated');
      expect(res.data).toBe(null);
    },
  );

  describe('when logged in', () => {
    let loggedInApolloClient: ApolloServerTestClient;
    beforeEach(async () => {
      const context: AccountsModuleContext = {
        user: luke as any,
        userId: 'asdf',
        userAgent: 'test',
        ip: 'test',
        authToken: 'foo',
      };
      let { apolloClient } = createTestClients(apolloServer, context);
      loggedInApolloClient = apolloClient;
    });

    it('should allow access on query level guard', async () => {
      await publicQuery(loggedInApolloClient);
      await authenticatedSecretQuery(loggedInApolloClient);
    });

    it.each(['darthsSecret', 'darthsDeepestSecret', 'devOnly'])(
      'should not allow access to secured queries %s',
      async query => {
        const res = await loggedInApolloClient.query({
          query: gql`
            {
              ${query}
            }
          `,
        });
        expect(res.errors.length).toBe(1);
        // expect(res.errors[0]).toBe('Not Authenticated');
        expect(res.data).toBe(null);
      },
    );
  });
  describe('when logged in as darth vader', () => {
    let loggedInApolloClient: ApolloServerTestClient;
    beforeEach(async () => {
      const context: AccountsModuleContext = {
        user: darth as any,
        userId: 'asdf',
        userAgent: 'test',
        ip: 'test',
        authToken: 'foo',
      };
      let { apolloClient } = createTestClients(apolloServer, context);
      loggedInApolloClient = apolloClient;
    });

    it('should allow resolver level guard', async () => {
      await publicQuery(loggedInApolloClient);
      await authenticatedSecretQuery(loggedInApolloClient);
      await darthsSecretQuery(loggedInApolloClient);
    });

    it.each(['darthsDeepestSecret', 'devOnly'])('should not allow access to secured query %s', async query => {
      const res = await loggedInApolloClient.query({
        query: gql`
            {
              ${query}
            }
          `,
      });
      expect(res.errors.length).toBe(1);
      // expect(res.errors[0]).toBe('Not Authenticated');
      expect(res.data).toBe(null);
    });
  });

  describe('when logged in as darth vader and talkingToLuke', () => {
    it('should guard with a dynamic auth checker when not talkingToLuke', () => {
      const context: AccountsModuleContext & { [i: string]: any } = {
        user: darth as any,
        userId: 'asdf',
        userAgent: 'test',
        ip: 'test',
        authToken: 'foo',
        talkingToLuke: false, // Add something else to context to check
      };
      let { apolloClient } = createTestClients(apolloServer, context);
      const clientToUse = apolloClient;
      darthsDeepestSecretQuery(false, clientToUse);
    });

    it('should allow access with a dynamic auth checker', () => {
      const context: AccountsModuleContext & { [i: string]: any } = {
        user: darth as any,
        userId: 'asdf',
        userAgent: 'test',
        ip: 'test',
        authToken: 'foo',
        talkingToLuke: true, // Add something else to context to check
      };
      let { apolloClient } = createTestClients(apolloServer, context);
      const clientToUse = apolloClient;
      darthsDeepestSecretQuery(true, clientToUse);
    });
  });
});
