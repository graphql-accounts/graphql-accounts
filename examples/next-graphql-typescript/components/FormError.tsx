import React from 'react';
import { Typography, withStyles, WithStyles } from '@material-ui/core';

const styles = () => ({
  formError: {
    color: 'red',
  },
});

interface Props {
  error: string;
}

const FormError = ({ classes, error }: WithStyles<'formError'> & Props) => {
  return <Typography className={classes.formError}>{error}</Typography>;
};

export default withStyles(styles)(FormError);
