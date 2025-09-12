
import React, { useState, useEffect } from 'react';
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
  Typography,
  Grid,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { Close, Event, Business, LocationOn, Info } from '@mui/icons-material';

const EventForm = ({ eventToEdit, onEventUpdated, showNotification }) => {
  console.log('EventForm rendered with eventToEdit:', eventToEdit);
  console.log('EventForm isEditing:', !!eventToEdit);
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [serviceType, setServiceType] = useState('ივენთი');
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const [selectedExhibitions, setSelectedExhibitions] = useState([]);
  const [availableExhibitions, setAvailableExhibitions] = useState([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const isEditing = !!eventToEdit;

  // Fetch available spaces and exhibitions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {};

        // Fetch spaces
        const spacesResponse = await fetch('/api/spaces', { headers });
        if (spacesResponse.ok) {
          const spaces = await spacesResponse.json();
          setAvailableSpaces(spaces);
        } else {
          console.error('სივრცეების მიღება ვერ მოხერხდა:', spacesResponse.status);
        }

        // Fetch exhibitions
        const exhibitionsResponse = await fetch('/api/exhibitions', { headers });
        if (exhibitionsResponse.ok) {
          const exhibitions = await exhibitionsResponse.json();
          setAvailableExhibitions(exhibitions);
        } else {
          console.error('გამოფენების მიღება ვერ მოხერხდა:', exhibitionsResponse.status);
        }
      } catch (error) {
        console.error('შეცდომა მონაცემების მიღებისას:', error);
      }
    };
    fetchData();
  }, []);

  // Fetch companies when exhibition is selected
  const fetchCompaniesByExhibition = async (exhibitionId, preserveSelection = false, isEditMode = false) => {
    if (!exhibitionId) {
      setAvailableCompanies([]);
      if (!preserveSelection) {
        // selectedCompanies removed
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/companies`, { headers });
      if (response.ok) {
        const companies = await response.json();
        console.log('ყველა კომპანია:', companies.length);

        const filteredCompanies = companies.filter(company => {
          console.log(`კომპანია ${company.company_name}:`, company.selected_exhibitions);
          return company.selected_exhibitions && 
                 Array.isArray(company.selected_exhibitions) && 
                 company.selected_exhibitions.includes(parseInt(exhibitionId));
        });

        console.log(`გამოფენა ${exhibitionId}-ის კომპანიები:`, filteredCompanies.length);
        setAvailableCompanies(filteredCompanies);

        // ავტო-არჩევა მხოლოდ ახალი ივენთისთვის
        if (!preserveSelection && !isEditMode) {
          // Auto-selection logic removed with selectedCompanies state
        }
      }
    } catch (error) {
      console.error('შეცდომა კომპანიების მიღებისას:', error);
    }
  };

  // რედაქტირების მონაცემების დაყენება
  useEffect(() => {
    const loadEditingData = async () => {
      if (isEditing && eventToEdit) {
        console.log('რედაქტირების მონაცემები:', eventToEdit);
        console.log('Original start_date:', eventToEdit.start_date);
        console.log('Original end_date:', eventToEdit.end_date);
        
        // ვნახოთ რა თარიღები მივაღწიეთ ფორმატირების შემდეგ
        const testStartDate = eventToEdit.start_date ? eventToEdit.start_date.split('T')[0] : '';
        const testEndDate = eventToEdit.end_date ? eventToEdit.end_date.split('T')[0] : '';
        console.log('Formatted start_date:', testStartDate);
        console.log('Formatted end_date:', testEndDate);

        setServiceName(eventToEdit.service_name || '');
        setDescription(eventToEdit.description || '');
        setYearSelection(eventToEdit.year_selection || new Date().getFullYear());
        
        console.log('Raw dates from eventToEdit:', {
          start_date: eventToEdit.start_date,
          end_date: eventToEdit.end_date,
          dateType_start: typeof eventToEdit.start_date,
          dateType_end: typeof eventToEdit.end_date
        });
        
        // თარიღების სწორი ფორმატირება - timezone-ის პრობლემის სრული თავიდან აცილება
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          
          console.log('Formatting date for input:', dateString);
          
          // თუ უკვე YYYY-MM-DD ფორმატშია, მისი გამოყენება
          if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.log('Date already in YYYY-MM-DD format:', dateString);
            return dateString.trim();
          }
          
          // თუ ISO string-ია, T-მდე ნაწილის აღება
          if (typeof dateString === 'string' && dateString.includes('T')) {
            const datePart = dateString.split('T')[0].trim();
            console.log('Extracted date from ISO:', datePart);
            return datePart;
          }
          
          // სხვა შემთხვევაში - string-ის სახით დაბრუნება
          console.log('Using date string as-is:', dateString);
          return String(dateString).trim();
        };

        const formattedStartDate = formatDateForInput(eventToEdit.start_date);
        const formattedEndDate = formatDateForInput(eventToEdit.end_date);
        
        console.log('Setting start date to:', formattedStartDate);
        console.log('Setting end date to:', formattedEndDate);
        
        setStartDate(formattedStartDate);
        setEndDate(formattedEndDate);
        setStartTime(eventToEdit.start_time || '');
        setEndTime(eventToEdit.end_time || '');
        setServiceType(eventToEdit.service_type || 'ივენთი');

        // გამოფენის ID-ის სწორად დაყენება
        console.log('eventToEdit.exhibition_id:', eventToEdit.exhibition_id);
        console.log('eventToEdit.exhibition_name:', eventToEdit.exhibition_name);
        
        const exhibitionId = eventToEdit.exhibition_id ? eventToEdit.exhibition_id.toString() : '';
        setSelectedExhibitionId(exhibitionId);
        console.log('დაყენებული გამოფენის ID:', exhibitionId);
        
        // თუ exhibition_id არის null მაგრამ exhibition_name არსებობს, ვეძებთ ID-ს
        if (!exhibitionId && eventToEdit.exhibition_name && availableExhibitions.length > 0) {
          const foundExhibition = availableExhibitions.find(ex => 
            ex.exhibition_name === eventToEdit.exhibition_name
          );
          if (foundExhibition) {
            console.log('ნაპოვნი გამოფენა სახელით:', foundExhibition);
            setSelectedExhibitionId(foundExhibition.id.toString());
          }
        }

        // სივრცეების მოძებნა და დაყენება
        try {
          console.log('სივრცეების ჩატვირთვის მცდელობა ივენთისთვის:', eventToEdit.id);
          console.log('eventToEdit object keys:', Object.keys(eventToEdit));
          console.log('Full eventToEdit object:', eventToEdit);
          
          const token = localStorage.getItem('token');
          
          // ჯერ ვცდილობთ details endpoint-ს
          const spacesResponse = await fetch(`/api/annual-services/${eventToEdit.id}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          console.log('Spaces response status:', spacesResponse.status);

          if (spacesResponse.ok) {
            const serviceDetails = await spacesResponse.json();
            console.log('Service details received full object:', serviceDetails);
            console.log('serviceDetails.spaces:', serviceDetails.spaces);
            console.log('serviceDetails type:', typeof serviceDetails);
            
            if (serviceDetails.spaces && Array.isArray(serviceDetails.spaces) && serviceDetails.spaces.length > 0) {
              const spaceIds = serviceDetails.spaces.map(s => s.id);
              setSelectedSpaces(spaceIds);
              console.log('ჩატვირთული სივრცეები details-იდან:', spaceIds);
            } else {
              console.log('Details API-მ სივრცეები ვერ მოგვცა, ვცდილობთ ალტერნატიულ გზებს');
              await tryAlternativeSpaceLoading();
            }
          } else {
            console.log('Details API ვერ მუშაობს (status:', spacesResponse.status, '), ვცდილობთ ალტერნატიულ გზას');
            await tryAlternativeSpaceLoading();
          }
        } catch (error) {
          console.error('სივრცეების ჩატვირთვის შეცდომა:', error);
          await tryAlternativeSpaceLoading();
        }

        // ალტერნატიული მეთოდები სივრცეების ჩატვირთვისთვის
        async function tryAlternativeSpaceLoading() {
          console.log('ალტერნატიული მეთოდების ცდა...');
          console.log('ყველა ველი eventToEdit ობიექტში:');
          
          // ყველა შესაძლო ველის დეტალური შემოწმება
          Object.keys(eventToEdit).forEach(key => {
            if (key.toLowerCase().includes('space')) {
              console.log(`${key}:`, eventToEdit[key]);
            }
          });
          
          let spacesArray = [];
          
          // შევამოწმოთ ყველა შესაძლო ველი
          const possibleSpaceFields = [
            'selected_spaces', 
            'space_ids', 
            'spaces', 
            'space_id', 
            'spaceIds',
            'selectedSpaces'
          ];
          
          for (const field of possibleSpaceFields) {
            if (eventToEdit[field] && spacesArray.length === 0) {
              try {
                console.log(`ვამოწმებთ ველს: ${field}:`, eventToEdit[field]);
                
                if (Array.isArray(eventToEdit[field])) {
                  spacesArray = eventToEdit[field].map(s => typeof s === 'object' ? s.id : s);
                } else if (typeof eventToEdit[field] === 'string') {
                  spacesArray = JSON.parse(eventToEdit[field]);
                } else if (typeof eventToEdit[field] === 'number') {
                  spacesArray = [eventToEdit[field]];
                }
                
                if (spacesArray.length > 0) {
                  console.log(`სივრცეები მოიძებნა ველში ${field}:`, spacesArray);
                  break;
                }
              } catch (e) {
                console.log(`ველის ${field} parse შეცდომა:`, e);
              }
            }
          }
          
          // მეთოდი 2: service_spaces table-ის პირდაპირ შემოწმება
          if (spacesArray.length === 0) {
            try {
              console.log('ვეძებთ service_spaces table-ში...');
              const token = localStorage.getItem('token');
              
              // ვცდილობთ სხვადასხვა endpoint-ებს
              const possibleEndpoints = [
                `/api/annual-services/${eventToEdit.id}/spaces`,
                `/api/service-spaces/${eventToEdit.id}`,
                `/api/services/${eventToEdit.id}/spaces`
              ];
              
              for (const endpoint of possibleEndpoints) {
                try {
                  console.log(`ვცდილობთ endpoint: ${endpoint}`);
                  const spacesLinkResponse = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  if (spacesLinkResponse.ok) {
                    const spacesData = await spacesLinkResponse.json();
                    console.log(`${endpoint} response:`, spacesData);
                    
                    if (Array.isArray(spacesData) && spacesData.length > 0) {
                      spacesArray = spacesData.map(s => s.space_id || s.id);
                      console.log(`სივრცეები ${endpoint}-იდან:`, spacesArray);
                      break;
                    }
                  }
                } catch (e) {
                  console.log(`${endpoint} შეცდომა:`, e);
                }
              }
            } catch (e) {
              console.log('service_spaces endpoints შეცდომა:', e);
            }
          }
          
          // მეთოდი 3: spaces_count ველის გამოყენება
          if (spacesArray.length === 0 && eventToEdit.spaces_count && eventToEdit.spaces_count !== '0') {
            console.log('spaces_count ველი მიუთითებს სივრცეების არსებობაზე:', eventToEdit.spaces_count);
            
            // ვცდილობთ ყველა სივრცის ჩატვირთვას და ნახვას რომელია დაკავშირებული
            try {
              const token = localStorage.getItem('token');
              const allSpacesResponse = await fetch('/api/spaces', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (allSpacesResponse.ok) {
                const allSpaces = await allSpacesResponse.json();
                console.log('ყველა ხელმისაწვდომი სივრცე:', allSpaces);
                
                // გავაკეთოთ SQL query პირდაპირ service_spaces table-ზე
                const serviceSpacesQuery = await fetch(`/api/service-spaces/query`, {
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ service_id: eventToEdit.id })
                });
                
                if (serviceSpacesQuery.ok) {
                  const serviceSpaces = await serviceSpacesQuery.json();
                  console.log('service_spaces SQL query შედეგი:', serviceSpaces);
                  
                  if (Array.isArray(serviceSpaces) && serviceSpaces.length > 0) {
                    spacesArray = serviceSpaces.map(s => s.space_id);
                    console.log('სივრცეები SQL query-დან:', spacesArray);
                  }
                }
              }
            } catch (e) {
              console.log('spaces_count მეთოდის შეცდომა:', e);
            }
          }
          
          // მეთოდი 4: JSON ველების შემოწმება
          if (spacesArray.length === 0) {
            console.log('შევამოწმოთ JSON ფორმატის ველები...');
            
            // ყველა string ველი რომელშიც შეიძლება JSON იყოს
            Object.keys(eventToEdit).forEach(key => {
              if (typeof eventToEdit[key] === 'string' && eventToEdit[key].includes('[')) {
                try {
                  const parsed = JSON.parse(eventToEdit[key]);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`JSON ველი ${key} შეიცავს array:`, parsed);
                    if (spacesArray.length === 0) {
                      spacesArray = parsed;
                    }
                  }
                } catch (e) {
                  // არაა JSON
                }
              }
            });
          }
          
          setSelectedSpaces(spacesArray);
          console.log('საბოლოო სივრცეები:', spacesArray);
        }

        // გამოფენების დაყენება
        const exhibitionsArray = exhibitionId ? [parseInt(exhibitionId)] : [];
        setSelectedExhibitions(exhibitionsArray);

        // კომპანიების ჩატვირთვა თუ გამოფენა არჩეულია
        if (exhibitionId && availableExhibitions.length > 0) {
          console.log('კომპანიების ჩატვირთვა რედაქტირებისას, გამოფენის ID:', exhibitionId);
          await fetchCompaniesByExhibition(exhibitionId, true, true);
        }

        
      }
    };

    if (availableExhibitions.length > 0) {
      loadEditingData();
    }
  }, [eventToEdit, isEditing, availableExhibitions]);

  // ცალკე useEffect-ი ცარიელი ფორმისთვის
  useEffect(() => {
    if (!isEditing) {
      // ცარიელი ფორმისთვის
      setServiceName('');
      setDescription('');
      setYearSelection(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setServiceType('ივენთი');
      setSelectedSpaces([]);
      setSelectedExhibitions([]);
      setSelectedExhibitionId('');
      setAvailableCompanies([]);
    }
  }, [isEditing]);

  const handleSpaceToggle = (spaceId) => {
    setSelectedSpaces(prev => 
      prev.includes(spaceId) 
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleExhibitionSelect = (exhibitionId) => {
    console.log('გამოფენის არჩევა:', exhibitionId, 'რედაქტირების რეჟიმი:', isEditing);
    setSelectedExhibitionId(exhibitionId);
    setSelectedExhibitions(exhibitionId ? [parseInt(exhibitionId)] : []);

    // კომპანიების ჩატვირთვა
    if (exhibitionId) {
      // რედაქტირების დროს არ ვაფსებთ არჩეულ კომპანიებს
      fetchCompaniesByExhibition(exhibitionId, isEditing, isEditing);
    } else {
      setAvailableCompanies([]);
    }
  };

  

  const handleSubmit = async () => {

    // თარიღებისა და დროის ვალიდაცია
    if (!startDate || !endDate) {
      showNotification('გთხოვთ აირჩიოთ დაწყებისა და დასრულების თარიღები', 'error');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
    const endDateTime = new Date(`${endDate}T${endTime || '23:59'}`);

    if (endDateTime <= startDateTime) {
      showNotification('დასრულების თარიღი და დრო უნდა იყოს დაწყების შემდეგ', 'error');
      return;
    }

    // მომავალი თარიღის შემოწმება (ნებაყოფლობითი)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDateTime < today && !isEditing) {
      const confirm = window.confirm('იწყება წარსულ თარიღში. გსურთ გაგრძელება?');
      if (!confirm) return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/annual-services/${eventToEdit.id}`
      : '/api/annual-services';

    try {
      const token = localStorage.getItem('token');

      // Prepare data with proper formatting
      const requestData = {
        service_name: serviceName,
        description,
        year_selection: parseInt(yearSelection),
        start_date: startDate,
        end_date: endDate,
        start_time: startTime || null,
        end_time: endTime || null,
        service_type: serviceType,
        is_active: true,
        selected_spaces: selectedSpaces,
        space_ids: selectedSpaces, // Add this for backend compatibility
        selected_exhibitions: selectedExhibitions,
        exhibition_id: selectedExhibitionId ? parseInt(selectedExhibitionId) : null,
        selected_companies: availableCompanies.map(company => company.id) // ყველა ხელმისაწვდომი კომპანია
      };

      console.log('Sending event data:', requestData);
      console.log('Selected spaces:', selectedSpaces);
      console.log('Available companies to register:', availableCompanies.length);

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');

      // თუ კომპანიები ავტომატურად რეგისტრირდნენ
      if (!isEditing && data.registeredCompanies > 0) {
        showNotification(`${data.registeredCompanies} კომპანია ავტომატურად დარეგისტრირდა მომლოდინე სტატუსით`, 'info');
      }

      onEventUpdated(); // ფორმის გასუფთავება და სიის განახლება
    } catch (error) {
      console.error('Event submission error:', error);
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <Dialog 
      open={true} 
      onClose={() => onEventUpdated()}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: '1.25rem'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Event />
          {isEditing ? 'ივენთის რედაქტირება' : 'ახალი ივენთის დამატება'}
        </Box>
        <IconButton 
          onClick={() => onEventUpdated()}
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

      <DialogContent sx={{ p: 3, maxHeight: '70vh', overflowY: 'auto' }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <Grid container spacing={3} display={'flex'} alignItems="center" justifyContent="center" flexDirection={'column'}>
            <Grid container item spacing={1} xs={12} md={12} alignItems="center" justifyContent="center" flexDirection={'row'} margin={2}>
             <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ივენთის სახელი"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                variant="outlined"
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>წელი</InputLabel>
                <Select
                  value={yearSelection}
                  onChange={(e) => setYearSelection(parseInt(e.target.value))}
                  label="წელი"
                  sx={{ borderRadius: 2 }}
                >
                  {generateYearOptions().map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
             <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="დაწყების თარიღი"
                  type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="დასრულების თარიღი"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Grid>
            </Grid>

          <Grid container item spacing={1} xs={12} md={12} alignItems="center" justifyContent="center" flexDirection={'row'} margin={1}>
<Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="დაწყების საათი"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="დასრულების საათი"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Grid>
             <Grid item xs={12} md={6} minWidth={200} margin={1}>
              <FormControl fullWidth required>
                <InputLabel>ივენთის ტიპი</InputLabel>
                <Select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  label="ივენთის ტიპი"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="ივენთი">ივენთი</MenuItem>
                  <MenuItem value="გამოფენა">გამოფენა</MenuItem>
                  <MenuItem value="კონფერენცია">კონფერენცია</MenuItem>
                  <MenuItem value="გაქირავება">გაქირავება</MenuItem>
                  <MenuItem value="ფესტივალი">ფესტივალი</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6} minWidth={200} margin={1}>
              <FormControl fullWidth>
                <InputLabel>გამოფენის არჩევა</InputLabel>
                <Select
                  value={selectedExhibitionId}
                  onChange={(e) => handleExhibitionSelect(e.target.value)}
                  label="გამოფენის არჩევა"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">აირჩიეთ გამოფენა</MenuItem>
                  {availableExhibitions.map(exhibition => (
                    <MenuItem key={exhibition.id} value={exhibition.id}>
                      {exhibition.exhibition_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

            <Grid item xs={12} width={'100%'} margin={1}>
              <TextField
                fullWidth
                label="აღწერა"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={3}
                variant="outlined"
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              />
            </Grid>

            {selectedExhibitionId && (
              <Grid item xs={12}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    borderRadius: 2,
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #90caf9'
                  }}
                  icon={<Business />}
                >
                  <Typography sx={{ fontWeight: 500 }}>
                    ამ გამოფენას რეგისტრირებული აქვს <strong>{availableCompanies.length} კომპანია</strong>, 
                    რომლებიც ავტომატურად დაემატება მონაწილეობის მოთხოვნის სტატუსით.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    მონაწილეების სია და სტატუსების მართვა შესაძლებელია ივენთის შექმნის შემდეგ.
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#fafafa'
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ color: '#667eea' }} />
                  სივრცეების არჩევა
                </Typography>
                <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {availableSpaces.map(space => (
                    <FormControlLabel
                      key={space.id}
                      control={
                        <Checkbox
                          checked={selectedSpaces.includes(space.id)}
                          onChange={() => handleSpaceToggle(space.id)}
                          sx={{
                            color: '#667eea',
                            '&.Mui-checked': {
                              color: '#667eea'
                            }
                          }}
                        />
                      }
                      label={`${space.building_name} - ${space.category}`}
                    />
                  ))}
                </FormGroup>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button 
          size='medium'
          onClick={() => onEventUpdated()}
          variant="outlined"
          type="button"
          sx={{
            border:  'none',
            color: '#ffffffff',
            borderRadius: 2,
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
          size='medium'
          onClick={handleSubmit}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 2,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }
          }}
        >
          {isEditing ? 'განახლება' : 'დამატება'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventForm;
