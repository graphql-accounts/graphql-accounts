import React from 'react';
import Layout from '../components/Layout';
import Login from '../components/Login';

const LoginPage: React.FC = () => {
  return (
    <Layout titleKey="Login">
      <Login />
    </Layout>
  );
};

export default LoginPage;
