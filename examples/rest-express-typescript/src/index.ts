require('dotenv').config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { AccountsServer, ServerHooks } from '@accounts/server';
import { AccountsPassword } from '@accounts/password';
import accountsExpress, { userLoader } from '@accounts/rest-express';
import MongoDBInterface from '@accounts/mongo';
import { accountsOauth } from './oauth';

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/accounts-js-rest-example', {
  useNewUrlParser: true,
  // We can't set this variable to true since there is an issue and mongodb fail to connect in a lambda environment
  // useUnifiedTopology: true,
});
const db = mongoose.connection;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

interface UserDoc extends mongoose.Document {
  firstName: string;
  lastName: string;
}

const User = mongoose.model<UserDoc>(
  'User',
  new mongoose.Schema({ firstName: String, lastName: String })
);

const accountsPassword = new AccountsPassword({
  // This option is called when a new user create an account
  // Inside we can apply our logic to validate the user fields
  validateNewUser: (user) => {
    // For example we can allow only some kind of emails
    if (user.email.endsWith('.xyz')) {
      throw new Error('Invalid email');
    }
    return user;
  },
});

const accountsServer = new AccountsServer(
  {
    db: new MongoDBInterface(db),
    tokenSecret: 'secret',
  },
  {
    password: accountsPassword,
    oauth: accountsOauth,
  }
);

accountsServer.on(ServerHooks.ValidateLogin, ({ user }) => {
  // This hook is called every time a user try to login.
  // You can use it to only allow users with verified email to login.
  // If you throw an error here it will be returned to the client.
});

/**
 * Load and expose the accounts-js middleware
 */
app.use(accountsExpress(accountsServer));

/**
 * Return the current logged in user
 */
app.get('/user', userLoader(accountsServer), (req, res) => {
  res.json({ user: (req as any).user });
});

/**
 * Expose a public route to edit user informations
 * - route is protected
 * - update the current logged in user in the db
 */
app.put('/user', userLoader(accountsServer), async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    res.status(401);
    res.json({ message: 'Unauthorized' });
    return;
  }
  const user = await User.findById(userId).exec();
  user.firstName = req.body.firstName;
  user.lastName = req.body.lastName;
  await user.save();
  res.json(true);
});

app.listen(process.env.PORT || 4000, () => {
  console.log('Server listening on port 4000');
});
