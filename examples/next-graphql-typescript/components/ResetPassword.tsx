import React, { useState } from 'react';
import { RouteComponentProps, Link } from 'react-router-dom';
import { FormControl, InputLabel, Input, Button, Typography, Snackbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import { accountsGraphQL } from '../utils/accounts';
import FormError from '../components/FormError';

// const useStyles = makeStyles({
//   formContainer: {
//     display: 'flex',
//     flexDirection: 'column',
//   },
// });

// const LogInLink = (props: any) => <Link to="/login" {...props} />;

interface Props {
  token: string;
}

const ResetPassword = Props => {
  // const classes = useStyles;
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const token = this.props.token;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSnackbarMessage(null);
    try {
      // If no tokens send email to user
      if (!token) {
        await accountsGraphQL.sendResetPasswordEmail(email);
        setSnackbarMessage('Email sent');
      } else {
        // If token try to change user password
        await accountsGraphQL.resetPassword(token, newPassword);
        setSnackbarMessage('Your password has been reset successfully');
      }
    } catch (err) {
      setError(err.message);
      setSnackbarMessage(null);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Typography variant="h4" gutterBottom>
        Reset Password
      </Typography>
      {!token && (
        <FormControl margin="normal">
          <InputLabel htmlFor="email">Email</InputLabel>
          <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
        </FormControl>
      )}
      {token && (
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
      <Button variant="contained" color="primary" type="submit">
        Reset Password
      </Button>
      {error && <FormError error={error!} />}
      <Button>Log In</Button>
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

export default ResetPassword;
