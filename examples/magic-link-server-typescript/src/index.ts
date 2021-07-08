import mongoose from 'mongoose';
import MongoDBInterface from '@accounts/mongo';
import { DatabaseManager } from '@accounts/database-manager';
import AccountsMagicLink from '@accounts/magic-link';
import { AccountsServer } from '@accounts/server/lib/accounts-server';

const start = async () => {
  await mongoose.connect('mongodb://localhost:27017/accounts-js-magic-link-example', {
    useNewUrlParser: true,
  });
  const mongoConn = mongoose.connection;

  // Build a storage for storing users
  const userStorage = new MongoDBInterface(mongoConn);
  // Create database manager (create user, find users, sessions etc) for accounts-js
  const accountsDb = new DatabaseManager({
    sessionStorage: userStorage,
    userStorage,
  });

  const accountsMagicLink = new AccountsMagicLink({});

  // Create accounts server that holds a lower level of all accounts operations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const accountsServer = new AccountsServer(
    { db: accountsDb, tokenSecret: 'secret' },
    {
      magicLink: accountsMagicLink,
    }
  );

  // Setup a user (or use one from a previous run)
  const user = await userStorage.findUserByUsername('magnus');

  const userId = user
    ? user.id
    : await userStorage.createUser({
        email: 'magnus@accounts.js.org',
        username: 'magnus',
        password: 'secret!123',
      });

  // We clear previous tokens since an error with such a low quality token as used
  // below can cause issues moving on.
  await userStorage.removeAllLoginTokens(userId);

  // Before a user can use a token to authenticate or login, the token must be
  // registered on the user. You can use whichever token generator you want, but
  // generateRandomToken available in the server package can be used (and is used)
  // internally. The token must be unique as it internally is used to find the user
  // during login.
  await userStorage.addLoginToken(userId, 'magnus@accounts.js.org', 'goodtoken');

  // Here we show that you can authenticate using the token, the function that
  // will be used if logging in through the general accounts interface.
  const authenticated = await accountsMagicLink.authenticate({ token: 'goodtoken' });

  // See in the output that we successfully authenticated the user. If the authentication
  // failed, the example will exit with a stacktrace.
  if (authenticated) {
    console.log('Success! User logged in using token from magic link');
  }
};

start();
