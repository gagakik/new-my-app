
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
  FormGroup,
  Autocomplete
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
    { code: 'AF', label: 'Afghanistan' },
    { code: 'AL', label: 'Albania' },
    { code: 'DZ', label: 'Algeria' },
    { code: 'AS', label: 'American Samoa' },
    { code: 'AD', label: 'Andorra' },
    { code: 'AO', label: 'Angola' },
    { code: 'AI', label: 'Anguilla' },
    { code: 'AQ', label: 'Antarctica' },
    { code: 'AG', label: 'Antigua and Barbuda' },
    { code: 'AR', label: 'Argentina' },
    { code: 'AM', label: 'Armenia' },
    { code: 'AW', label: 'Aruba' },
    { code: 'AU', label: 'Australia' },
    { code: 'AT', label: 'Austria' },
    { code: 'AZ', label: 'Azerbaijan' },
    { code: 'BS', label: 'Bahamas' },
    { code: 'BH', label: 'Bahrain' },
    { code: 'BD', label: 'Bangladesh' },
    { code: 'BB', label: 'Barbados' },
    { code: 'BY', label: 'Belarus' },
    { code: 'BE', label: 'Belgium' },
    { code: 'BZ', label: 'Belize' },
    { code: 'BJ', label: 'Benin' },
    { code: 'BM', label: 'Bermuda' },
    { code: 'BT', label: 'Bhutan' },
    { code: 'BO', label: 'Bolivia' },
    { code: 'BA', label: 'Bosnia and Herzegovina' },
    { code: 'BW', label: 'Botswana' },
    { code: 'BR', label: 'Brazil' },
    { code: 'BN', label: 'Brunei' },
    { code: 'BG', label: 'Bulgaria' },
    { code: 'BF', label: 'Burkina Faso' },
    { code: 'BI', label: 'Burundi' },
    { code: 'CV', label: 'Cabo Verde' },
    { code: 'KH', label: 'Cambodia' },
    { code: 'CM', label: 'Cameroon' },
    { code: 'CA', label: 'Canada' },
    { code: 'KY', label: 'Cayman Islands' },
    { code: 'CF', label: 'Central African Republic' },
    { code: 'TD', label: 'Chad' },
    { code: 'CL', label: 'Chile' },
    { code: 'CN', label: 'China' },
    { code: 'CO', label: 'Colombia' },
    { code: 'KM', label: 'Comoros' },
    { code: 'CG', label: 'Congo' },
    { code: 'CD', label: 'Congo (Democratic Republic)' },
    { code: 'CK', label: 'Cook Islands' },
    { code: 'CR', label: 'Costa Rica' },
    { code: 'CI', label: 'Côte d\'Ivoire' },
    { code: 'HR', label: 'Croatia' },
    { code: 'CU', label: 'Cuba' },
    { code: 'CW', label: 'Curaçao' },
    { code: 'CY', label: 'Cyprus' },
    { code: 'CZ', label: 'Czech Republic' },
    { code: 'DK', label: 'Denmark' },
    { code: 'DJ', label: 'Djibouti' },
    { code: 'DM', label: 'Dominica' },
    { code: 'DO', label: 'Dominican Republic' },
    { code: 'EC', label: 'Ecuador' },
    { code: 'EG', label: 'Egypt' },
    { code: 'SV', label: 'El Salvador' },
    { code: 'GQ', label: 'Equatorial Guinea' },
    { code: 'ER', label: 'Eritrea' },
    { code: 'EE', label: 'Estonia' },
    { code: 'SZ', label: 'Eswatini' },
    { code: 'ET', label: 'Ethiopia' },
    { code: 'FK', label: 'Falkland Islands' },
    { code: 'FO', label: 'Faroe Islands' },
    { code: 'FJ', label: 'Fiji' },
    { code: 'FI', label: 'Finland' },
    { code: 'FR', label: 'France' },
    { code: 'GF', label: 'French Guiana' },
    { code: 'PF', label: 'French Polynesia' },
    { code: 'GA', label: 'Gabon' },
    { code: 'GM', label: 'Gambia' },
    { code: 'GE', label: 'Georgia' },
    { code: 'DE', label: 'Germany' },
    { code: 'GH', label: 'Ghana' },
    { code: 'GI', label: 'Gibraltar' },
    { code: 'GR', label: 'Greece' },
    { code: 'GL', label: 'Greenland' },
    { code: 'GD', label: 'Grenada' },
    { code: 'GP', label: 'Guadeloupe' },
    { code: 'GU', label: 'Guam' },
    { code: 'GT', label: 'Guatemala' },
    { code: 'GG', label: 'Guernsey' },
    { code: 'GN', label: 'Guinea' },
    { code: 'GW', label: 'Guinea-Bissau' },
    { code: 'GY', label: 'Guyana' },
    { code: 'HT', label: 'Haiti' },
    { code: 'HN', label: 'Honduras' },
    { code: 'HK', label: 'Hong Kong' },
    { code: 'HU', label: 'Hungary' },
    { code: 'IS', label: 'Iceland' },
    { code: 'IN', label: 'India' },
    { code: 'ID', label: 'Indonesia' },
    { code: 'IR', label: 'Iran' },
    { code: 'IQ', label: 'Iraq' },
    { code: 'IE', label: 'Ireland' },
    { code: 'IM', label: 'Isle of Man' },
    { code: 'IL', label: 'Israel' },
    { code: 'IT', label: 'Italy' },
    { code: 'JM', label: 'Jamaica' },
    { code: 'JP', label: 'Japan' },
    { code: 'JE', label: 'Jersey' },
    { code: 'JO', label: 'Jordan' },
    { code: 'KZ', label: 'Kazakhstan' },
    { code: 'KE', label: 'Kenya' },
    { code: 'KI', label: 'Kiribati' },
    { code: 'KP', label: 'Korea (North)' },
    { code: 'KR', label: 'Korea (South)' },
    { code: 'KW', label: 'Kuwait' },
    { code: 'KG', label: 'Kyrgyzstan' },
    { code: 'LA', label: 'Laos' },
    { code: 'LV', label: 'Latvia' },
    { code: 'LB', label: 'Lebanon' },
    { code: 'LS', label: 'Lesotho' },
    { code: 'LR', label: 'Liberia' },
    { code: 'LY', label: 'Libya' },
    { code: 'LI', label: 'Liechtenstein' },
    { code: 'LT', label: 'Lithuania' },
    { code: 'LU', label: 'Luxembourg' },
    { code: 'MO', label: 'Macao' },
    { code: 'MK', label: 'Macedonia' },
    { code: 'MG', label: 'Madagascar' },
    { code: 'MW', label: 'Malawi' },
    { code: 'MY', label: 'Malaysia' },
    { code: 'MV', label: 'Maldives' },
    { code: 'ML', label: 'Mali' },
    { code: 'MT', label: 'Malta' },
    { code: 'MH', label: 'Marshall Islands' },
    { code: 'MQ', label: 'Martinique' },
    { code: 'MR', label: 'Mauritania' },
    { code: 'MU', label: 'Mauritius' },
    { code: 'YT', label: 'Mayotte' },
    { code: 'MX', label: 'Mexico' },
    { code: 'FM', label: 'Micronesia' },
    { code: 'MD', label: 'Moldova' },
    { code: 'MC', label: 'Monaco' },
    { code: 'MN', label: 'Mongolia' },
    { code: 'ME', label: 'Montenegro' },
    { code: 'MS', label: 'Montserrat' },
    { code: 'MA', label: 'Morocco' },
    { code: 'MZ', label: 'Mozambique' },
    { code: 'MM', label: 'Myanmar' },
    { code: 'NA', label: 'Namibia' },
    { code: 'NR', label: 'Nauru' },
    { code: 'NP', label: 'Nepal' },
    { code: 'NL', label: 'Netherlands' },
    { code: 'NC', label: 'New Caledonia' },
    { code: 'NZ', label: 'New Zealand' },
    { code: 'NI', label: 'Nicaragua' },
    { code: 'NE', label: 'Niger' },
    { code: 'NG', label: 'Nigeria' },
    { code: 'NU', label: 'Niue' },
    { code: 'NF', label: 'Norfolk Island' },
    { code: 'MP', label: 'Northern Mariana Islands' },
    { code: 'NO', label: 'Norway' },
    { code: 'OM', label: 'Oman' },
    { code: 'PK', label: 'Pakistan' },
    { code: 'PW', label: 'Palau' },
    { code: 'PS', label: 'Palestine' },
    { code: 'PA', label: 'Panama' },
    { code: 'PG', label: 'Papua New Guinea' },
    { code: 'PY', label: 'Paraguay' },
    { code: 'PE', label: 'Peru' },
    { code: 'PH', label: 'Philippines' },
    { code: 'PN', label: 'Pitcairn' },
    { code: 'PL', label: 'Poland' },
    { code: 'PT', label: 'Portugal' },
    { code: 'PR', label: 'Puerto Rico' },
    { code: 'QA', label: 'Qatar' },
    { code: 'RE', label: 'Réunion' },
    { code: 'RO', label: 'Romania' },
    { code: 'RU', label: 'Russia' },
    { code: 'RW', label: 'Rwanda' },
    { code: 'BL', label: 'Saint Barthélemy' },
    { code: 'SH', label: 'Saint Helena' },
    { code: 'KN', label: 'Saint Kitts and Nevis' },
    { code: 'LC', label: 'Saint Lucia' },
    { code: 'MF', label: 'Saint Martin' },
    { code: 'PM', label: 'Saint Pierre and Miquelon' },
    { code: 'VC', label: 'Saint Vincent and the Grenadines' },
    { code: 'WS', label: 'Samoa' },
    { code: 'SM', label: 'San Marino' },
    { code: 'ST', label: 'São Tomé and Príncipe' },
    { code: 'SA', label: 'Saudi Arabia' },
    { code: 'SN', label: 'Senegal' },
    { code: 'RS', label: 'Serbia' },
    { code: 'SC', label: 'Seychelles' },
    { code: 'SL', label: 'Sierra Leone' },
    { code: 'SG', label: 'Singapore' },
    { code: 'SX', label: 'Sint Maarten' },
    { code: 'SK', label: 'Slovakia' },
    { code: 'SI', label: 'Slovenia' },
    { code: 'SB', label: 'Solomon Islands' },
    { code: 'SO', label: 'Somalia' },
    { code: 'ZA', label: 'South Africa' },
    { code: 'GS', label: 'South Georgia' },
    { code: 'SS', label: 'South Sudan' },
    { code: 'ES', label: 'Spain' },
    { code: 'LK', label: 'Sri Lanka' },
    { code: 'SD', label: 'Sudan' },
    { code: 'SR', label: 'Suriname' },
    { code: 'SJ', label: 'Svalbard and Jan Mayen' },
    { code: 'SE', label: 'Sweden' },
    { code: 'CH', label: 'Switzerland' },
    { code: 'SY', label: 'Syria' },
    { code: 'TW', label: 'Taiwan' },
    { code: 'TJ', label: 'Tajikistan' },
    { code: 'TZ', label: 'Tanzania' },
    { code: 'TH', label: 'Thailand' },
    { code: 'TL', label: 'Timor-Leste' },
    { code: 'TG', label: 'Togo' },
    { code: 'TK', label: 'Tokelau' },
    { code: 'TO', label: 'Tonga' },
    { code: 'TT', label: 'Trinidad and Tobago' },
    { code: 'TN', label: 'Tunisia' },
    { code: 'TR', label: 'Turkey' },
    { code: 'TM', label: 'Turkmenistan' },
    { code: 'TC', label: 'Turks and Caicos Islands' },
    { code: 'TV', label: 'Tuvalu' },
    { code: 'UG', label: 'Uganda' },
    { code: 'UA', label: 'Ukraine' },
    { code: 'AE', label: 'United Arab Emirates' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'US', label: 'United States' },
    { code: 'UY', label: 'Uruguay' },
    { code: 'UZ', label: 'Uzbekistan' },
    { code: 'VU', label: 'Vanuatu' },
    { code: 'VA', label: 'Vatican City' },
    { code: 'VE', label: 'Venezuela' },
    { code: 'VN', label: 'Vietnam' },
    { code: 'VG', label: 'Virgin Islands (British)' },
    { code: 'VI', label: 'Virgin Islands (US)' },
    { code: 'WF', label: 'Wallis and Futuna' },
    { code: 'EH', label: 'Western Sahara' },
    { code: 'YE', label: 'Yemen' },
    { code: 'ZM', label: 'Zambia' },
    { code: 'ZW', label: 'Zimbabwe' }
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
              <Autocomplete
                fullWidth
                options={countries}
                autoHighlight
                getOptionLabel={(option) => option.label}
                value={countries.find(c => c.label === country) || null}
                onChange={(event, newValue) => {
                  setCountry(newValue ? newValue.label : '');
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      key={key}
                      component="li"
                      sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                      {...optionProps}
                    >
                      <img
                        loading="lazy"
                        width="20"
                        srcSet={`https://flagcdn.com/w40/${option.code.toLowerCase()}.png 2x`}
                        src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                        alt=""
                      />
                      {option.label}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ქვეყანა"
                    required
                    slotProps={{
                      htmlInput: {
                        ...params.inputProps,
                        autoComplete: 'new-password',
                      },
                    }}
                  />
                )}
              />
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
          sx={{ px:1, py:0.4, fontSize:'0.9rem', textTransform: 'none',
              color:'#ff0000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="inherit"
          size="medium"
          sx={{ px:1, py:0.4, fontSize:'0.9rem', textTransform: 'none',
              color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
        >
          {isEditing ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyForm;
