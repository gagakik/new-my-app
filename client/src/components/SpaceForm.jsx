
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
          sx={{ px:1, py:0.4, fontSize:'0.9rem', fontWeight: '600', textTransform: 'none', margin: '5px',
          color:'#ff0000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
          disabled={isSubmitting}
          sx={{ px:1, py:0.4, fontSize:'0.9rem', fontWeight: '600', textTransform: 'none',
          color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px',
          margin: '5px', 
          '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
        >
          {isSubmitting ? 'მუშავდება...' : (isEditing ? 'განახლება' : 'დამატება')}
        </Button>
      </Box>
    </Box>
  );
};

export default SpaceForm;
