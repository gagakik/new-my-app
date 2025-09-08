
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Divider
} from '@mui/material';
import {
  Close,
  Save,
  Cancel
} from '@mui/icons-material';
import PackageManager from './PackageManager';

const ExhibitionForm = ({ exhibitionToEdit, onExhibitionUpdated, showNotification, onCancel }) => {
  const [exhibitionName, setExhibitionName] = useState('');
  const [manager, setManager] = useState('');
  const isEditing = exhibitionToEdit && exhibitionToEdit.id;

  useEffect(() => {
    if (isEditing) {
      setExhibitionName(exhibitionToEdit.exhibition_name || '');
      setManager(exhibitionToEdit.manager || '');
    } else {
      setExhibitionName('');
      setManager('');
    }
  }, [exhibitionToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const exhibitionData = {
      exhibition_name: exhibitionName,
      manager
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/exhibitions/${exhibitionToEdit.id}`
      : '/api/exhibitions';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exhibitionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onExhibitionUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const handleClose = () => {
    onExhibitionUpdated();
  };

  return (
    <Dialog 
      open={true} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '400px'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 2
      }}>
        <Typography variant="h6" component="div">
          {isEditing ? 'გამოფენის რედაქტირება' : 'ახალი გამოფენის დამატება'}
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{ 
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3} marginTop={5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="გამოფენის სახელი"
                value={exhibitionName}
                onChange={(e) => setExhibitionName(e.target.value)}
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="გამოფენის მენეჯერი"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                required
                variant="outlined"
              />
            </Grid>
          </Grid>

          <DialogActions sx={{ px: 0, pt: 3, pb: 0 }}>
            <Button
            size='small'
              variant="outlined"
              onClick={handleClose}
              startIcon={<Cancel />}
              sx={{ mr: 1, color: '#fff', background: '#ff0000ff', border: 'none'}}
            >
              CANCEL
            </Button>
            <Button
              size='small'
              color="primary"
              type="submit"
              variant="contained"
              startIcon={<Save />}
              sx={{ 
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', border: 'none',
                '&:hover': { background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)' }
              }}
            >
              {isEditing ? 'UPDATE' : 'ADD'}
            </Button>
          </DialogActions>
        </Box>

        {/* პაკეტების მენეჯმენტი - მხოლოდ რედაქტირების დროს */}
        {isEditing && exhibitionToEdit && exhibitionToEdit.id && (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              პაკეტების მართვა
            </Typography>
            <PackageManager 
              exhibitionId={exhibitionToEdit.id}
              showNotification={showNotification}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExhibitionForm;
