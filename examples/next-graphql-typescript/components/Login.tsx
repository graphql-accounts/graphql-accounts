import React from 'react';
import {
  Button,
  FormControl,
  Input,
  InputLabel,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import Link from 'next/link';
import FormError from './FormError';
import { accountsPassword } from '../utils/accounts';
import Router from 'next/router';
const styles = () => ({
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
  },
});

interface State {
  email: string;
  password: string;
  code: string;
  error: string | null;
}

class Login extends React.Component<WithStyles<'formContainer'>, State> {
  public state = {
    code: '',
    email: '',
    error: null,
    password: '',
  };

  public onChangeEmail = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ email: target.value });
  };

  public onChangePassword = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ password: target.value });
  };

  public onChangeCode = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ code: target.value });
  };

  public onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.setState({ error: null });
    try {
      await accountsPassword.login({
        code: this.state.code,
        password: this.state.password,
        user: {
          email: this.state.email,
        },
      });
      Router.push({
        pathname: '/',
        // query: { name: "Zeit" }
      });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  public render() {
    const { classes } = this.props;
    const { email, password, code, error } = this.state;
    return (
      <form onSubmit={this.onSubmit} className={classes.formContainer}>
        <Typography variant="h3" gutterBottom={true}>
          Login
        </Typography>
        <FormControl margin="normal">
          <InputLabel htmlFor="email">Email</InputLabel>
          <Input id="email" value={email} autoComplete="email" onChange={this.onChangeEmail} />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel htmlFor="password">Password</InputLabel>
          <Input
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={this.onChangePassword}
          />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel htmlFor="password">2fa code if enabled</InputLabel>
          <Input id="code" value={code} onChange={this.onChangeCode} />
        </FormControl>
        <Button variant="outlined" color="primary" type="submit">
          Login
        </Button>
        {/*  eslint-disable-next-line */}
        {error && <FormError error={error!} />}
        <Button>
          <Link href="/signup" as={`/signup`}>
            <a>Sign Up</a>
          </Link>
        </Button>
        <Button>
          <Link href="/reset-password" as={`/reset-password`}>
            <a>Reset Password</a>
          </Link>
        </Button>
      </form>
    );
  }
}

export default withStyles(styles)(Login);
