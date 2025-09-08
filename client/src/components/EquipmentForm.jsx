
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
  Alert,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Image as ImageIcon
} from '@mui/icons-material';

const EquipmentForm = ({ equipmentToEdit, onEquipmentUpdated, showNotification, onCancel }) => {
  const [codeName, setCodeName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditing = !!equipmentToEdit;

  useEffect(() => {
    if (isEditing) {
      setCodeName(equipmentToEdit.code_name);
      setQuantity(equipmentToEdit.quantity);
      setPrice(equipmentToEdit.price);
      setDescription(equipmentToEdit.description);
      setExistingImageUrl(equipmentToEdit.image_url || '');
      setImageFile(null);
    } else {
      setCodeName('');
      setQuantity('');
      setPrice('');
      setDescription('');
      setImageFile(null);
      setExistingImageUrl('');
    }
  }, [equipmentToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('code_name', codeName);
    formData.append('quantity', quantity);
    formData.append('price', price);
    formData.append('description', description);

    if (imageFile) {
      console.log('Uploading new image file:', imageFile.name, imageFile.size);
      formData.append('image', imageFile);
    } else if (isEditing && existingImageUrl) {
      console.log('Keeping existing image:', existingImageUrl);
      formData.append('image_url_existing', existingImageUrl);
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/equipment/${equipmentToEdit.id}`
      : '/api/equipment';

    console.log('Submitting equipment form:', method, url);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      console.log('Upload success:', data);
      showNotification(data.message, 'success');
      onEquipmentUpdated();
    } catch (error) {
      console.error('Submit error:', error);
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={true} 
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          pb: 2
        }}
      >
        <Typography variant="h6" component="div">
          {isEditing ? 'აღჭურვილობის რედაქტირება' : 'ახალი აღჭურვილობის დამატება'}
        </Typography>
        <IconButton 
          onClick={() => onCancel()}
          sx={{ 
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          pt: 3,
          maxHeight: '60vh',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#667eea',
            borderRadius: '3px',
            '&:hover': {
              background: '#764ba2',
            }
          }
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} id="equipment-form" marginTop={2}>
          <TextField
            label="კოდური სახელი"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            required
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="რაოდენობა"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />

            <TextField
              label="ფასი"
              type="number"
              inputProps={{ step: "0.01" }}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: <InputAdornment position="end">EUR</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
          </Box>

          <TextField
            label="აღწერილობა"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
            }}
          />

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, color: '#555' }}>
              სურათი
            </Typography>
            
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{
                width: '100%',
                height: '60px',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#764ba2',
                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                }
              }}
            >
              {imageFile ? imageFile.name : 'სურათის არჩევა'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                hidden
              />
            </Button>

            {isEditing && existingImageUrl && !imageFile && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon sx={{ color: '#667eea' }} />
                <Typography variant="body2" color="text.secondary">
                  მიმდინარე სურათი: 
                </Typography>
                <Chip 
                  label="ნახვა" 
                  component="a" 
                  href={existingImageUrl} 
                  target="_blank" 
                  clickable 
                  size="small"
                  sx={{ 
                    backgroundColor: '#667eea', 
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#764ba2'
                    }
                  }}
                />
              </Box>
            )}

            {imageFile && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`არჩეული: ${imageFile.name}`}
                  onDelete={() => setImageFile(null)}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button 
          onClick={() => onCancel()}
          variant="outlined"
          type="button"
          sx={{
            borderColor: '#6c757d',
            color: '#ffffffff',
            '&:hover': {
              borderColor: '#5a6268',
              backgroundColor: 'rgba(108, 117, 125, 0.04)'
            }
          }}
        >
          გაუქმება
        </Button>
        <Button 
          type="submit"
          form="equipment-form"
          variant="contained"
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            }
          }}
        >
          {loading ? 'მუშაობს...' : (isEditing ? 'განახლება' : 'დამატება')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EquipmentForm;
