import React from 'react';
import Layout from '../../components/Layout';
import ResetPassword from '../../components/ResetPassword';
import { useRouter } from 'next/router';

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;
  return (
    <Layout titleKey="resetPasswoed">
      <p>Token: {token}</p>;
      <ResetPassword token={token} />
    </Layout>
  );
};

export default ResetPasswordPage;
