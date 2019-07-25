import React, { useState } from 'react';
import { RouteComponentProps, Link } from 'react-router-dom';
import {
  withStyles,
  WithStyles,
  FormControl,
  InputLabel,
  Input,
  Button,
  Typography,
  Snackbar,
} from '@material-ui/core';

import { accountsRest } from './accounts';
import FormError from './components/FormError';

const styles = () => ({
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
  },
});

const LogInLink = (props: any) => <Link to="/login" {...props} />;

interface RouteMatchProps {
  token: string;
}

const ResetPassword = ({
  classes,
  match,
}: WithStyles<'formContainer'> & RouteComponentProps<RouteMatchProps>) => {
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSnackbarMessage(null);
    const token = match.params.token;
    try {
      // If no tokens send email to user
      if (!token) {
        await accountsRest.sendResetPasswordEmail(email);
        setSnackbarMessage('Email sent');
      } else {
        // If token try to change user password
        await accountsRest.resetPassword(token, newPassword);
        setSnackbarMessage('Your password has been reset successfully');
      }
    } catch (err) {
      console.log(err);
      setError(err.message);
      setSnackbarMessage(null);
    }
  };

  return (
    <form onSubmit={onSubmit} className={classes.formContainer}>
      <Typography variant="display1" gutterBottom>
        Reset Password
      </Typography>
      {!match.params.token && (
        <FormControl margin="normal">
          <InputLabel htmlFor="email">Email</InputLabel>
          <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
        </FormControl>
      )}
      {match.params.token && (
        <FormControl margin="normal">
          <InputLabel htmlFor="new-password">New Password</InputLabel>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </FormControl>
      )}
      <Button variant="raised" color="primary" type="submit">
        Reset Password
      </Button>
      {error && <FormError error={error!} />}
      <Button component={LogInLink}>Log In</Button>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={<span>{snackbarMessage}</span>}
      />
    </form>
  );
};

export default withStyles(styles)(ResetPassword);
