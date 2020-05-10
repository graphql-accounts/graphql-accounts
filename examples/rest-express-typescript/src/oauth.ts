import { AccountsOauth, OAuthProvider } from '@accounts/oauth';
import axios from 'axios';
import qs from 'qs';

class AccountsGoogleOAuth implements OAuthProvider {
  async authenticate(params) {
    /* eslint-disable @typescript-eslint/camelcase */
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: process.env.OAUTH_GOOGLE_CALLBACK_URL,
        client_id: process.env.OAUTH_GOOGLE_CLIENT_ID,
        client_secret: process.env.OAUTH_GOOGLE_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const token = response.data.access_token;
    /* eslint-enable @typescript-eslint/camelcase */

    const userProfileRes = await axios.get(
      'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(JSON.stringify(userProfileRes.data, null, 2));

    return {
      id: userProfileRes.data.id,
      data: userProfileRes.data,
    };
  }

  async getRegistrationPayload(oauthUser) {
    return {
      email: oauthUser.data.email,
      firstName: oauthUser.data.given_name,
      lastName: oauthUser.data.family_name,
    };
  }
}

export const accountsOauth = new AccountsOauth({
  google: new AccountsGoogleOAuth(),
});
