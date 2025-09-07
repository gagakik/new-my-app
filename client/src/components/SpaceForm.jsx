
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close, Save, Cancel } from '@mui/icons-material';

const SpaceForm = ({ spaceToEdit, onFormClose, onSpaceUpdated, showNotification }) => {
  const [category, setCategory] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [description, setDescription] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!spaceToEdit;

  const categories = [
    { value: 'საოფისე', label: 'საოფისე' },
    { value: 'საგამოფენო', label: 'საგამოფენო' },
    { value: 'საპარკინგე', label: 'საპარკინგე' },
    { value: 'სასაწყობე', label: 'სასაწყობე' },
    { value: 'საწარმო', label: 'საწარმო' },
    { value: 'ივენთები', label: 'ივენთები' },
    { value: 'საკომფერენციო', label: 'საკომფერენციო' }
  ];

  useEffect(() => {
    if (spaceToEdit) {
      setCategory(spaceToEdit.category || '');
      setBuildingName(spaceToEdit.building_name || '');
      setDescription(spaceToEdit.description || '');
      setAreaSqm(spaceToEdit.area_sqm || '');
    } else {
      setCategory('');
      setBuildingName('');
      setDescription('');
      setAreaSqm('');
    }
  }, [spaceToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const spaceData = {
      category,
      building_name: buildingName,
      description,
      area_sqm: parseFloat(areaSqm) || 0
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const url = isEditing ? `/api/spaces/${spaceToEdit.id}` : '/api/spaces';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(spaceData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(data.message, 'success');
        onSpaceUpdated();
        if (onFormClose) onFormClose();
      } else {
        throw new Error(data.message || 'შეცდომა მოხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    if (onFormClose) {
      onFormClose();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: 0,
        maxHeight: '70vh',
        overflowY: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          select
          label="კატეგორია"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          fullWidth
          variant="outlined"
          margin='normal'
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#667eea'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#667eea'
              }
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#667eea'
            }
          }}
        >
          <MenuItem value="">კატეგორია</MenuItem>
          {categories.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="შენობის დასახელება"
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          required
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#667eea'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#667eea'
              }
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#667eea'
            }
          }}
        />

        <TextField
          label="აღწერა"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#667eea'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#667eea'
              }
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#667eea'
            }
          }}
        />

        <TextField
          label="ფართობი (კვ.მ.)"
          type="number"
          inputProps={{ step: "0.01" }}
          value={areaSqm}
          onChange={(e) => setAreaSqm(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#667eea'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#667eea'
              }
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#667eea'
            }
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          startIcon={<Cancel />}
          disabled={isSubmitting}
          sx={{
            borderColor: '#6c757d',
            color: '#6c757d',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontWeight: 600,
            '&:hover': {
              borderColor: '#5a6268',
              backgroundColor: 'rgba(108, 117, 125, 0.04)',
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              borderColor: '#dee2e6',
              color: '#6c757d'
            },
            transition: 'all 0.2s ease'
          }}
        >
          გაუქმება
        </Button>

        <Button
          type="submit"
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
          disabled={isSubmitting}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-2px)'
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#a0aec0',
              boxShadow: 'none'
            },
            transition: 'all 0.3s ease'
          }}
        >
          {isSubmitting ? 'მუშავდება...' : (isEditing ? 'განახლება' : 'დამატება')}
        </Button>
      </Box>
    </Box>
  );
};

export default SpaceForm;
