
import React from 'react';
import { Box, Typography, Container } from '@mui/material';


const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 2,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" align="center">
          © 2024 Expo Georgia Co. ყველა უფლება დაცულია.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
