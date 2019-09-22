import { AccountsClient } from '@accounts/client';
import { AccountsClientPassword } from '@accounts/client-password';
import GraphQLClient from '@accounts/graphql-client';
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import fetch from 'isomorphic-fetch';
import { CookieStorage } from 'cookie-storage';

const cookieStorage = new CookieStorage();
const link = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  fetch,
});
const cache = new InMemoryCache();
const apolloClient = new ApolloClient({
  link,
  cache,
});

const accountsGraphQL = new GraphQLClient({ graphQLClient: apolloClient });
const accountsClient = new AccountsClient(
  {
    // We tell the accounts-js client to use cookieStorage to store the tokens
    tokenStorage: cookieStorage,
  },
  accountsGraphQL
);

const accountsPassword = new AccountsClientPassword(accountsClient);

export { accountsClient, accountsGraphQL, accountsPassword, apolloClient };
