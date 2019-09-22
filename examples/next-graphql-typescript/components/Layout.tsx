import React from 'react';
import Head from 'next/head';
import { makeStyles } from '@material-ui/styles';
import Navigation from '../components/Navigation';
const useStyles = makeStyles({
  root: {
    margin: 'auto',
    maxWidth: 500,
    marginTop: 50,
  },
  container: {
    padding: 16,
  },
});

interface Props {
  titleKey: string;
}

const Layout: React.FC<Props> = ({ titleKey, children }) => {
  const classes = useStyles({});
  return (
    <div className={classes.root}>
      <Head>
        <title>Title</title>
      </Head>
      <Navigation />
      <div className={classes.container}>{children}</div>
    </div>
  );
};

export default Layout;
