import Layout from '../components/Layout';
import Link from 'next/link';
import fetch from 'isomorphic-unfetch';
import cookies from 'next-cookies';
import Router from 'next/router';
import { accountsClient, accountsGraphQL } from '../utils/accounts';
import { EmailRecord } from '@accounts/types';
import { Button, Typography } from '@material-ui/core';

async function onResendEmail() {
  const { user } = this.state;
  await accountsGraphQL.sendVerificationEmail(user.emails[0].address);
}

async function onLogout() {
  await accountsClient.logout();
  Router.push('/login');
}

function auth(ctx) {
  const allCookies = cookies(ctx);
  console.log(allCookies);
  const token = allCookies[encodeURIComponent('accounts:accessToken')];
  /*
   * If `ctx.req` is available it means we are on the server.
   * Additionally if there's no token it means the user is not logged in.
   */
  if (ctx.req && !token) {
    ctx.res.writeHead(302, { Location: '/login' });
    ctx.res.end();
  }

  // We already checked for server. This should only happen on client.
  if (!token) {
    Router.push('/login');
  }
  return token;
}

async function getUser(token) {
  const user = await accountsGraphQL.getUser();
  return user;
}
type User = {
  username: string;
  id: string;
  emails: EmailRecord[];
};
const HomePage = (props: { token: string; user: User }) => (
  <Layout titleKey="Home">
    {/* <h1>Batman TV Shows</h1> */}
    <div></div>
    <div>
      <Typography gutterBottom={true}>Hello {props.user.username}, you are logged in</Typography>
      <Typography>Your 🍪AccessToken is: {props.token}</Typography>
      <Typography gutterBottom={true}>Email: {props.user.emails[0].address}</Typography>
      <Typography gutterBottom={true}>
        You email is {props.user.emails[0].verified ? 'verified' : 'unverified'}
      </Typography>
      {!props.user.emails[0].verified && (
        <Button onClick={onResendEmail}>Resend verification email</Button>
      )}
      <Link href="two-factor">
        <a>Set up 2fa</a>
      </Link>
      <Button variant="outlined" color="primary" onClick={onLogout}>
        <a>Logout</a>
      </Button>
    </div>
  </Layout>
);

HomePage.getInitialProps = async function(ctx) {
  const token = auth(ctx);
  const user = await getUser(token);

  return {
    token: token,
    user: user,
  };
};

export default HomePage;
