
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Grid,
  Typography,
  IconButton,
  FormControl,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Construction as ConstructionIcon,
  AttachMoney as AttachMoneyIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';

const EquipmentForm = ({ equipmentToEdit, onEquipmentUpdated, showNotification }) => {
  const [formData, setFormData] = useState({
    code_name: '',
    description: '',
    quantity: 0,
    price: 0,
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (equipmentToEdit && equipmentToEdit.id !== 0) {
      setFormData({
        code_name: equipmentToEdit.code_name || '',
        description: equipmentToEdit.description || '',
        quantity: equipmentToEdit.quantity || 0,
        price: equipmentToEdit.price || 0,
        image_url: equipmentToEdit.image_url || ''
      });
    }
  }, [equipmentToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const isEdit = equipmentToEdit && equipmentToEdit.id !== 0;
      const url = isEdit ? `/api/equipment/${equipmentToEdit.id}` : '/api/equipment';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification(
          isEdit ? 'აღჭურვილობა წარმატებით განახლდა!' : 'აღჭურვილობა წარმატებით დაემატა!',
          'success'
        );
        onEquipmentUpdated();
        handleClose();
      } else {
        const errorData = await response.json();
        showNotification(`შეცდომა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => onEquipmentUpdated(), 300);
  };

  const isEdit = equipmentToEdit && equipmentToEdit.id !== 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ConstructionIcon />
          <Typography variant="h6">
            {isEdit ? 'აღჭურვილობის რედაქტირება' : 'ახალი აღჭურვილობის დამატება'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="კოდური დასახელება"
                name="code_name"
                value={formData.code_name}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ConstructionIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ფასი (₾)"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="რაოდენობა"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InventoryIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="სურათის URL"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="http://example.com/image.jpg"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="აღწერა"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="აღჭურვილობის დეტალური აღწერა..."
              />
            </Grid>

            {formData.image_url && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    სურათის წინასწარი ხედვა:
                  </Typography>
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={handleClose}
            startIcon={<CancelIcon />}
            variant="outlined"
            disabled={loading}
          >
            გაუქმება
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'შენახვა...' : (isEdit ? 'განახლება' : 'დამატება')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EquipmentForm;
