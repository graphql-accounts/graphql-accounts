import * as React from 'react';
import { useLocation, RouteComponentProps } from 'react-router-dom';
import qs from 'qs';

type IEmailVerificationPageProps = RouteComponentProps<{
  token: string;
}>;

export const GoogleOAuthCallback: React.FC<IEmailVerificationPageProps> = () => {
  const location = useLocation();

  const queryParams = qs.parse(location.search, { ignoreQueryPrefix: true });

  React.useEffect(() => {
    const googleLoginChannel = new BroadcastChannel('googleLoginChannel');
    googleLoginChannel.postMessage(queryParams.code);
    googleLoginChannel.close();
    window.close();
  }, [queryParams.code]);

  return <React.Fragment></React.Fragment>;
};