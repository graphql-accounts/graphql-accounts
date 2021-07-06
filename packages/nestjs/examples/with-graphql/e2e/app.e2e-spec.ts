import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import request from 'supertest';
import { ConfigService } from 'nestjs-config';
import { GraphQLModule } from '@graphql-modules/core';

import { AccountsClient } from '@accounts/client';
import { AccountsClientPassword } from '@accounts/client-password';
import { AccountsGraphQLClient } from '@accounts/graphql-client';
import { storageMock } from '../../shared/fixtures/StorageMock';

describe('with-graphql', () => {
  let app: INestApplication;
  let apolloClient: ApolloServerTestClient;
  let accountsGraphQL: AccountsGraphQLClient;
  let accountsClient: AccountsClient;
  let accountsPWClient: AccountsClientPassword;

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

    // apolloServer is protected, we need to cast module to any to get it
    apolloClient = createTestClient((module as any).apolloServer);

    // Create your transport
    accountsGraphQL = new AccountsGraphQLClient({
      graphQLClient: apolloClient,
      // other options
    });
    // Create the base AccountsClient
    accountsClient = new AccountsClient({ tokenStorage: storageMock() }, accountsGraphQL);
    // Create any strategies of the Accounts Client, just password here
    accountsPWClient = new AccountsClientPassword(accountsClient, {});
  });

  it('should mount graphql', () => {
    return request(app.getHttpServer())
      .get('/graphql')
      .expect(req => req.notFound === false);
  });

  it('should work with graphql-client', async () => {
    const res = await accountsPWClient.createUser({ email: 'foo@foobar.com', username: 'foo' });
    let pass = false;
    if (res === null) {
      pass = true;
    } else {
      pass = typeof res === 'string';
    }
    expect(pass).toBeTruthy();
  });
});
