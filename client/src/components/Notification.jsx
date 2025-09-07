
import React, { useEffect } from 'react';
import { 
  Alert, 
  Snackbar, 
  IconButton,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // შეტყობინება გაქრება 3 წამში
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  // MUI Alert-ის type-ების მატჩინგი
  const getSeverity = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'success': return 'success';
      case 'info': return 'info';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Snackbar
      open={!!message}
      autoHideDuration={3000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        mt: 2,
        '& .MuiSnackbar-root': {
          position: 'fixed'
        }
      }}
    >
      <Alert 
        severity={getSeverity(type)}
        onClose={onClose}
        variant="filled"
        sx={{
          minWidth: 300,
          maxWidth: 400,
          '& .MuiAlert-message': {
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'white'
          },
          '& .MuiAlert-icon': {
            color: 'white'
          },
          '& .MuiAlert-action': {
            color: 'white'
          },
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        action={
          <IconButton
            size="small"
            aria-label="დახურვა"
            color="inherit"
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Notification;
