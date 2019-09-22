import React from 'react';
import Layout from '../components/Layout';
import Signup from '../components/Signup';

const SignupPage: React.FC = () => {
  return (
    <Layout titleKey="signup">
      <Signup />
    </Layout>
  );
};

export default SignupPage;
