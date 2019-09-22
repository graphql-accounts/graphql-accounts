import React from 'react';
import Layout from '../components/Layout';
import TwoFactor from '../components/TwoFactor';

const TwoFactorPage: React.FC = () => {
  return (
    <Layout titleKey="TwoFactor">
      <TwoFactor />
    </Layout>
  );
};

export default TwoFactorPage;
