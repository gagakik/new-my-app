
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
  Grid,
  Card,
  CardContent,
  Divider,
  FormGroup
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';

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

  const countries = [
    'საქართველო', 'აშშ', 'გერმანია', 'საფრანგეთი', 'დიდი ბრიტანეთი',
    'იტალია', 'ესპანეთი', 'კანადა', 'ავსტრალია', 'იაპონია', 'ჩინეთი',
    'ბრაზილია', 'მექსიკო', 'არგენტინა', 'ჩილე', 'ინდოეთი', 'თურქეთი',
    'რუსეთი', 'უკრაინა', 'პოლონეთი'
  ];

  // გამოფენების ჩატვირთვა
  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/exhibitions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setExhibitions(data);
        }
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

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/companies/${companyToEdit.id}`
      : '/api/companies';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onCompanyUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <Dialog 
      open={true} 
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" backgroundColor={'#1976d2'} color={'white'} p={1} borderRadius={1}>
          <Typography variant="h6" >
            {isEditing ? 'კომპანიის რედაქტირება' : 'ახალი კომპანიის დამატება'}
          </Typography>
          <IconButton onClick={onCompanyUpdated}>
            <Close backgroundColor={'white'} size="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
          <Grid container spacing={1} display="flex" flexDirection="column" height="100%">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="კომპანიის დასახელება"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>ქვეყანა</InputLabel>
                <Select
                  value={country}
                  label="ქვეყანა"
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {countries.map((countryOption) => (
                    <MenuItem key={countryOption} value={countryOption}>
                      {countryOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="კომპანიის პროფილი"
                value={companyProfile}
                onChange={(e) => setCompanyProfile(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="საიდენტიფიკაციო კოდი"
                value={identificationCode}
                onChange={(e) => setIdentificationCode(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="იურიდიული მისამართი"
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ვებგვერდი"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="მაგალითად: expogeorgia.ge"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                მონაწილეობა გამოფენებში
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <FormGroup>
                    <Grid container spacing={1}>
                      {exhibitions.map(exhibition => {
                        const exhibitionId = Number(exhibition.id);
                        const isChecked = selectedExhibitions.includes(exhibitionId);

                        return (
                          <Grid item xs={12} sm={6} md={4} key={exhibition.id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isChecked}
                                  onChange={(e) => handleExhibitionToggle(exhibitionId, e.target.checked)}
                                />
                              }
                              label={exhibition.exhibition_name}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </FormGroup>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  საკონტაქტო პირები
                </Typography>
                <Button
                  borderRadius={2} sx={{ border: 'none' }}
                  color='inherit'
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={addContactPerson}
                  size="medium"
                >
                  ახალი კონტაქტი
                </Button>
              </Box>

              {contactPersons.map((person, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1">
                        საკონტაქტო პირი {index + 1}
                      </Typography>
                      {contactPersons.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removeContactPerson(index)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                    
                    <Grid container spacing={2} display="flex" alignItems="center" justifyContent="center" flexDirection="column" width={"100%"} height={"100%"}>
                      <Grid item xs={12} sm={6}>
                        <Divider orientation="vertical" flexItem />
                      </Grid>
                      <Grid item xs={12} sm={6} display="flex" width={"100%"} justifyContent="center" alignItems="center">
                        <TextField
                          fullWidth
                          label="სახელი გვარი"
                          value={person.name}
                          onChange={(e) => updateContactPerson(index, 'name', e.target.value)}
                          placeholder="მაგ: ნინო გელაშვილი"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} display="flex" width={"100%"} justifyContent="center" alignItems="center">
                        <TextField
                          fullWidth
                          label="პოზიცია"
                          value={person.position}
                          onChange={(e) => updateContactPerson(index, 'position', e.target.value)}
                          placeholder="მაგ: გაყიდვების მენეჯერი"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} display="flex" width={"100%"} justifyContent="center" alignItems="center" >
                        <TextField
                          fullWidth
                          label="ტელეფონის ნომერი"
                          value={person.phone}
                          onChange={(e) => updateContactPerson(index, 'phone', e.target.value)}
                          placeholder="მაგ: +995 555 123 456"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} display="flex" width={"100%"} justifyContent="center" alignItems="center">
                        <TextField
                          fullWidth
                          label="ელ-ფოსტა"
                          type="email"
                          value={person.email}
                          onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                          placeholder="მაგ: nino@company.ge"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onCompanyUpdated}
          color="inherit"
          size="medium"
        >
          გაუქმება
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="inherit"
          size="medium"
        >
          {isEditing ? 'განახლება' : 'დამატება'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyForm;
