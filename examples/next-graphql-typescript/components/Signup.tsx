import React from 'react';
import Router from 'next/router';
// import { WithRouterProps } from "next/dist/client/with-router";

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

const styles = () => ({
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
  },
});

interface State {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  error: string | null;
}

class Signup extends React.Component<WithStyles<'formContainer'>, State> {
  public state = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    error: null,
  };

  public onChangeFirstName = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ firstName: target.value });
  };

  public onChangeLastName = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ lastName: target.value });
  };

  public onChangeEmail = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ email: target.value });
  };

  public onChangePassword = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ password: target.value });
  };

  public onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.setState({ error: null });
    try {
      await accountsPassword.createUser({
        email: this.state.email,
        password: this.state.password,
        profile: {
          firstName: this.state.firstName,
          lastName: this.state.lastName,
        },
      });
      Router.push({ pathname: '/login' });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  public render() {
    const { classes } = this.props;
    const { firstName, lastName, email, password, error } = this.state;
    return (
      <form onSubmit={this.onSubmit}>
        <Typography variant="h3" gutterBottom={true}>
          Sign up
        </Typography>
        <FormControl margin="normal">
          <InputLabel htmlFor="firstName">First name</InputLabel>
          <Input id="firstName" value={firstName} onChange={this.onChangeFirstName} />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel htmlFor="lastName">Last name</InputLabel>
          <Input id="lastName" value={lastName} onChange={this.onChangeLastName} />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel htmlFor="email">Email</InputLabel>
          <Input id="email" value={email} onChange={this.onChangeEmail} />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel htmlFor="password">Password</InputLabel>
          <Input
            autoComplete="new-password"
            id="password"
            type="password"
            value={password}
            onChange={this.onChangePassword}
          />
        </FormControl>
        <Button variant="outlined" color="primary" type="submit">
          Sign Up
        </Button>
        {/*  eslint-disable-next-line */}
        {error && <FormError error={error!} />}
        <Button>
          <Link href="/login" as={`/login`}>
            <a>Log In</a>
          </Link>
        </Button>
      </form>
    );
  }
}

export default withStyles(styles)(Signup);
