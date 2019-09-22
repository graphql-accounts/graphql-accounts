import React from 'react';
import Layout from '../../components/Layout';
import VerifyEmail from '../../components/VerifyEmail';
import { useRouter } from 'next/router';

const VeifyEmailPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;
  return (
    <Layout titleKey="Cruceritis">
      <p>Token: {token}</p>;
      <VerifyEmail token={token} />
    </Layout>
  );
};

export default VeifyEmailPage;
