
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Card,
  CardContent,
  Divider,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { servicesAPI, companiesAPI } from '../services/api';

const CompanyForm = ({ companyToEdit, onCompanyUpdated, showNotification, onCancel }) => {
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [companyProfile, setCompanyProfile] = useState('');
  const [identificationCode, setIdentificationCode] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('აქტიური');
  const [selectedExhibitions, setSelectedExhibitions] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [contactPersons, setContactPersons] = useState([
    { name: '', position: '', phone: '', email: '' }
  ]);
  
  const isEditing = !!companyToEdit;

  // გამოფენების ჩატვირთვა
  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const data = await servicesAPI.getExhibitions();
        setExhibitions(data);
      } catch (error) {
        console.error('გამოფენების ჩატვირთვის შეცდომა:', error);
      }
    };

    fetchExhibitions();
  }, []);

  // განახლდეს selected exhibitions როდესაც კომპანია იცვლება
  useEffect(() => {
    if (isEditing && companyToEdit && exhibitions.length > 0) {
      if (companyToEdit.selected_exhibitions && Array.isArray(companyToEdit.selected_exhibitions)) {
        const exhibitionIds = companyToEdit.selected_exhibitions.map(id => Number(id));
        setSelectedExhibitions(exhibitionIds);
      } else {
        setSelectedExhibitions([]);
      }
    }
  }, [companyToEdit, isEditing, exhibitions]);

  useEffect(() => {
    if (isEditing && companyToEdit) {
      setCompanyName(companyToEdit.company_name || '');
      setCountry(companyToEdit.country || '');
      setCompanyProfile(companyToEdit.company_profile || '');
      setIdentificationCode(companyToEdit.identification_code || '');
      setLegalAddress(companyToEdit.legal_address || '');
      setWebsite(companyToEdit.website || '');
      setComment(companyToEdit.comment || '');
      setStatus(companyToEdit.status || 'აქტიური');

      // საკონტაქტო პირების დატვირთვა
      if (companyToEdit.contact_persons && Array.isArray(companyToEdit.contact_persons) && companyToEdit.contact_persons.length > 0) {
        setContactPersons(companyToEdit.contact_persons);
      } else {
        setContactPersons([{ name: '', position: '', phone: '', email: '' }]);
      }
    } else if (!isEditing) {
      setCompanyName('');
      setCountry('');
      setCompanyProfile('');
      setIdentificationCode('');
      setLegalAddress('');
      setWebsite('');
      setComment('');
      setStatus('აქტიური');
      setSelectedExhibitions([]);
      setContactPersons([{ name: '', position: '', phone: '', email: '' }]);
    }
  }, [companyToEdit, isEditing]);

  const handleExhibitionToggle = useCallback((exhibitionId, isChecked) => {
    const numericId = Number(exhibitionId);

    setSelectedExhibitions(prev => {
      if (isChecked) {
        return prev.includes(numericId) ? prev : [...prev, numericId];
      } else {
        return prev.filter(id => id !== numericId);
      }
    });
  }, []);

  // საკონტაქტო პირების მართვის ფუნქციები
  const addContactPerson = () => {
    setContactPersons([...contactPersons, { name: '', position: '', phone: '', email: '' }]);
  };

  const removeContactPerson = (index) => {
    if (contactPersons.length > 1) {
      const updatedContacts = contactPersons.filter((_, i) => i !== index);
      setContactPersons(updatedContacts);
    }
  };

  const updateContactPerson = (index, field, value) => {
    const updatedContacts = [...contactPersons];
    updatedContacts[index][field] = value;
    setContactPersons(updatedContacts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const companyData = {
      company_name: companyName,
      country,
      company_profile: companyProfile,
      identification_code: identificationCode,
      legal_address: legalAddress,
      website,
      comment,
      status,
      selected_exhibitions: selectedExhibitions,
      contact_persons: contactPersons.filter(person => 
        person.name.trim() !== '' || person.position.trim() !== '' || 
        person.phone.trim() !== '' || person.email.trim() !== ''
      ),
    };

    try {
      let response;
      if (isEditing) {
        response = await companiesAPI.update(companyToEdit.id, companyData);
      } else {
        response = await companiesAPI.create(companyData);
      }

      showNotification(response.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
      UpanyUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const countries = [
    'საქართველო', 'აშშ', 'გერმანია', 'საფრანგეთი', 'დიდი ბრიტანეთი', 'იტალია', 
    'ესპანეთი', 'კანადა', 'ავსტრალია', 'იაპონია', 'ჩინეთი', 'ბრაზილია', 
    'მექსიკო', 'არგენტინა', 'ჩილე', 'ინდოეთი', 'თურქეთი', 'რუსეთი', 
    'უკრაინა', 'პოლონეთი'
  ];

  return (
    <Dialog 
      open={true} 
      onClose={onCancel}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon />
          <Typography variant="h6">
            {isEditing ? 'კომპანიის რედაქტირება' : 'ახალი კომპანიის დამატება'}
          </Typography>
        </Box>
        <IconButton onClick={onCompanyUpdated}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* ძირითადი ინფორმაცია */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                ძირითადი ინფორმაცია
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="კომპანიის დასახელება"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>ქვეყანა</InputLabel>
                <Select
                  value={country}
                  label="ქვეყანა"
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <MenuItem value="">აირჩიეთ ქვეყანა</MenuItem>
                  {countries.map(countryName => (
                    <MenuItem key={countryName} value={countryName}>
                      {countryName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="კომპანიის პროფილი"
                value={companyProfile}
                onChange={(e) => setCompanyProfile(e.target.value)}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="საიდენტიფიკაციო კოდი"
                value={identificationCode}
                onChange={(e) => setIdentificationCode(e.target.value)}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="იურიდიული მისამართი"
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ვებგვერდი"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="მაგალითად: expogeorgia.ge"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>სტატუსი</InputLabel>
                <Select
                  value={status}
                  label="სტატუსი"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="აქტიური">აქტიური</MenuItem>
                  <MenuItem value="არქივი">არქივი</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="კომენტარი"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                multiline
                rows={3}
                variant="outlined"
              />
            </Grid>

            {/* გამოფენები */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                მონაწილეობა გამოფენებში
              </Typography>
              <FormGroup>
                {exhibitions.map(exhibition => {
                  const exhibitionId = Number(exhibition.id);
                  const isChecked = selectedExhibitions.includes(exhibitionId);

                  return (
                    <FormControlLabel
                      key={exhibition.id}
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => handleExhibitionToggle(exhibitionId, e.target.checked)}
                        />
                      }
                      label={exhibition.exhibition_name}
                    />
                  );
                })}
              </FormGroup>
            </Grid>

            {/* საკონტაქტო პირები */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  საკონტაქტო პირები
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addContactPerson}
                  variant="outlined"
                  size="small"
                >
                  ახალი კონტაქტი
                </Button>
              </Box>

              {contactPersons.map((person, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        საკონტაქტო პირი {index + 1}
                      </Typography>
                      {contactPersons.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removeContactPerson(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="სახელი გვარი"
                          value={person.name}
                          onChange={(e) => updateContactPerson(index, 'name', e.target.value)}
                          placeholder="მაგ: ნინო გელაშვილი"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="პოზიცია"
                          value={person.position}
                          onChange={(e) => updateContactPerson(index, 'position', e.target.value)}
                          placeholder="მაგ: გაყიდვების მენეჯერი"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="ტელეფონის ნომერი"
                          type="tel"
                          value={person.phone}
                          onChange={(e) => updateContactPerson(index, 'phone', e.target.value)}
                          placeholder="მაგ: +995 555 123 456"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="ელ-ფოსტა"
                          type="email"
                          value={person.email}
                          onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                          placeholder="მაგ: nino@company.ge"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={onCompanyUpdated}
            variant="outlined"
          >
            გაუქმება
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            size="large"
          >
            {isEditing ? 'განახლება' : 'დამატება'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CompanyForm;
