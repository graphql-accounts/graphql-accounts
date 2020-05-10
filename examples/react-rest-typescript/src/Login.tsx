import React, { useState } from 'react';
import { RouteComponentProps, Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Typography,
  makeStyles,
  Card,
  CardContent,
  Divider,
  Link,
  TextField,
  Grid,
  Snackbar,
} from '@material-ui/core';
import { useFormik, FormikErrors } from 'formik';
import { SnackBarContentError } from './components/SnackBarContentError';
import { useAuth } from './components/AuthContext';
import { UnauthenticatedContainer } from './components/UnauthenticatedContainer';
import { useGoogleLoginButton } from './oauth/useGoogleLoginButton';

const useStyles = makeStyles(theme => ({
  cardContent: {
    padding: theme.spacing(3),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  logo: {
    maxWidth: '100%',
    width: 250,
  },
}));

const SignUpLink = React.forwardRef<RouterLink, any>((props, ref) => (
  <RouterLink to="/signup" {...props} ref={ref} />
));
const ResetPasswordLink = React.forwardRef<RouterLink, any>((props, ref) => (
  <RouterLink to="/reset-password" {...props} ref={ref} />
));

interface LoginValues {
  email: string;
  password: string;
  code: string;
}

const Login: React.FC<RouteComponentProps<{}>> = ({ history }) => {
  const classes = useStyles();
  const { loginWithService } = useAuth();
  const [error, setError] = useState<string | undefined>();
  const formik = useFormik<LoginValues>({
    initialValues: {
      email: '',
      password: '',
      code: '',
    },
    validate: values => {
      const errors: FormikErrors<LoginValues> = {};
      if (!values.email) {
        errors.email = 'Required';
      }
      if (!values.password) {
        errors.password = 'Required';
      }
      return errors;
    },
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await loginWithService('password', {
          user: {
            email: values.email,
          },
          password: values.password,
          code: values.code,
        });
        history.push('/');
      } catch (error) {
        setError(error.message);
        setSubmitting(false);
      }
    },
  });

  const renderGoogleLoginButton = useGoogleLoginButton(() => { history.push('/')});

  return (
    <UnauthenticatedContainer>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={!!error}
        onClose={() => setError(undefined)}
      >
        <SnackBarContentError message={error} />
      </Snackbar>

      <Card>
        <CardContent className={classes.cardContent}>
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <img src="/logo.png" alt="Logo" className={classes.logo} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h5">Sign in</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  variant="outlined"
                  fullWidth={true}
                  id="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={Boolean(formik.errors.email && formik.touched.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Password"
                  variant="outlined"
                  fullWidth={true}
                  type="password"
                  id="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  error={Boolean(formik.errors.password && formik.touched.password)}
                  helperText={formik.touched.password && formik.errors.password}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="2fa code if enabled"
                  variant="outlined"
                  fullWidth={true}
                  id="code"
                  value={formik.values.code}
                  onChange={formik.handleChange}
                  error={Boolean(formik.errors.code && formik.touched.code)}
                  helperText={formik.touched.code && formik.errors.code}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={formik.isSubmitting}
                >
                  Sign in
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                { renderGoogleLoginButton() }
              </Grid>
              <Grid item xs={12} md={6}>
                <Grid container justify="flex-end" alignContent="center">
                  <Link component={ResetPasswordLink}>Lost your password?</Link>
                </Grid>
              </Grid>
            </Grid>
          </form>
          <Divider className={classes.divider} />
          <Link component={SignUpLink}>Don't have an account?</Link>
        </CardContent>
      </Card>
    </UnauthenticatedContainer>
  );
};

export default Login;
