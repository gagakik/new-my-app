
import React from 'react';
import {
  Box,
  Typography,
  Container
} from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        borderRadius: '8px 8px 0 0', 
        backgroundColor: '#ffffffff',
        color: '#fff',
        textAlign: 'center',
        py: 2,
        mt: 'auto',
        width: '100%',
        boxShadow: '0 -2px 5px rgba(0,0,0,0.1)',
        position: 'relative',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        fontSize: '0.875rem',
        fontFamily: 'Arial, sans-serif',
        userSelect: 'none',
        transition: 'background-color 0.3s ease',
        '&:hover': {
          backgroundColor: '#76a6eeff',
        },
      }}
    >
      <Container>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          &copy; 2025 All rights reserved.
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#333', textTransform: 'none', userSelect: 'none', transition: 'color 0.3s ease' }} >
          Concept and execution by Gaga Kikvilashvili
          <br />
          Email: <a href="mailto:gaga.kikvilashvili@gmail.com" >gaga.kikvilashvili@gmail.com</a>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
