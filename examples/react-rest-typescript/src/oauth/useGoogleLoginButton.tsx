import React from 'react';
import { Button } from '@material-ui/core';
import qs from 'qs';
import { useAuth } from '../components/AuthContext';

export const useGoogleLoginButton = (onLogin: Function) => {
  const { loginWithService } = useAuth();

  const loginWithGoogle = async (code: string) => {
    return loginWithService('oauth', {
        provider: 'google',
        code,
      });
  }

  const handleGoogleLoginClick = React.useCallback(() => {
    const width = 600,
      height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    /* eslint-disable @typescript-eslint/camelcase */
    const params = {
      response_type: 'code',
      client_id: process.env.REACT_APP_OAUTH_GOOGLE_CLIENT_ID,
      redirect_uri: process.env.REACT_APP_OAUTH_GOOGLE_CALLBACK_URL,
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    };
    /* eslint-enable @typescript-eslint/camelcase */

    const googleLoginChannel = new BroadcastChannel('googleLoginChannel');
    googleLoginChannel.onmessage = async e => {
      const code = e.data;
      await loginWithGoogle(code);
      await new Promise((resolve) => { setTimeout(resolve, 100);})
      onLogin();
    };

    window.open(
      'https://accounts.google.com/o/oauth2/v2/auth?' + qs.stringify(params),
      '',
      `toolbar=no, location=no, directories=no, status=no, menubar=no,
      scrollbars=no, resizable=no, copyhistory=no, width=${width},
      height=${height}, top=${top}, left=${left}`,
    );
  }, [onLogin]);

  return () => (
    <Button
      variant="contained"
      color="primary"
      onClick={handleGoogleLoginClick}
    >
      Log in with Google
    </Button>
  );
};