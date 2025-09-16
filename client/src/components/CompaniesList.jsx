import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Grid,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Add,
  Upload,
  Edit,
  Delete,
  Visibility,
  FilterList,
  Save,
  Cancel
} from '@mui/icons-material';
import CompanyForm from './CompanyForm';
import CompanyImport from './CompanyImport';

const CompaniesList = ({ showNotification, userRole }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIdentificationCode, setFilterIdentificationCode] = useState('');
  const [filterExhibition, setFilterExhibition] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [exhibitions, setExhibitions] = useState([]);
  const [editingExhibitions, setEditingExhibitions] = useState(null);
  const [countries, setCountries] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isAuthorizedForManagement = userRole === 'admin' || userRole === 'sales';

  const fetchExhibitions = useCallback(async () => {
    try {
      const { exhibitionsAPI } = await import('../services/api');
      const data = await exhibitionsAPI.getAll();
      setExhibitions(data);
    } catch (error) {
      console.error('გამოფენების ჩატვირთვის შეცდომა:', error);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    const predefinedCountries = [
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

    setCountries(predefinedCountries);
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა კომპანიების ნახვისთვის');
      }

      const { companiesAPI } = await import('../services/api');
      const data = await companiesAPI.getAll();
      console.log('Companies data received:', data);
      setCompanies(data);
    } catch (error) {
      console.error('კომპანიების მიღების შეცდომა:', error);
      showNotification(`შეცდომა: ${error.message}`, 'error');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Separate function for filtering companies
  const getFilteredCompanies = useCallback(() => {
    return companies.filter(company => {
      // Search term filter
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        if (!company.company_name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Country filter
      if (filterCountry && filterCountry.trim() && filterCountry !== 'All Countries') {
        if (company.country?.toLowerCase() !== filterCountry.trim().toLowerCase()) {
          return false;
        }
      }

      // Profile filter
      if (filterProfile && filterProfile.trim()) {
        const profileLower = filterProfile.trim().toLowerCase();
        if (!company.company_profile?.toLowerCase().includes(profileLower)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus && filterStatus.trim() && filterStatus !== 'ყველა') {
        if (company.status !== filterStatus.trim()) {
          return false;
        }
      }

      // Identification code filter
      if (filterIdentificationCode && filterIdentificationCode.trim()) {
        const codeLower = filterIdentificationCode.trim().toLowerCase();
        if (!company.identification_code?.toString().toLowerCase().includes(codeLower)) {
          return false;
        }
      }

      // Exhibition filter
      if (filterExhibition && filterExhibition !== '' && filterExhibition !== 'ყველა') {
        const exhibitionId = parseInt(filterExhibition);
        if (!isNaN(exhibitionId)) {
          if (!company.selected_exhibitions || !Array.isArray(company.selected_exhibitions)) {
            return false;
          }
          if (!company.selected_exhibitions.includes(exhibitionId)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [companies, searchTerm, filterCountry, filterProfile, filterStatus, filterIdentificationCode, filterExhibition]);

  const filteredCompanies = getFilteredCompanies();

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchExhibitions();
    fetchCountries();
  }, [fetchExhibitions, fetchCountries]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ კომპანიის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const { companiesAPI } = await import('../services/api');
      await companiesAPI.delete(id);
      showNotification('კომპანია წარმატებით წაიშალა!', 'success');
      fetchCompanies();
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (company) => {
    setEditingId(company.id);
  };

  const handleCompanyUpdated = () => {
    setEditingId(null);
    setSelectedCompany(null);
    fetchCompanies();
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchCompanies();
  };

  const handleViewDetails = (company) => {
    setSelectedCompany(company);
  };

  const handleEditExhibitions = (company) => {
    setEditingExhibitions({
      companyId: company.id,
      companyName: company.company_name,
      selectedExhibitions: company.selected_exhibitions || []
    });
  };

  const handleExhibitionToggle = (exhibitionId, isChecked) => {
    const numericId = Number(exhibitionId);

    setEditingExhibitions(prev => {
      if (!prev) return prev;

      const currentSelected = prev.selectedExhibitions || [];
      const newSelectedExhibitions = isChecked
        ? [...currentSelected, numericId]
        : currentSelected.filter(id => id !== numericId);

      return {
        ...prev,
        selectedExhibitions: newSelectedExhibitions
      };
    });
  };

  const saveExhibitionChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      const { companiesAPI } = await import('../services/api');
      await companiesAPI.update(editingExhibitions.companyId, {
        selected_exhibitions: editingExhibitions.selectedExhibitions
      });
      showNotification('გამოფენები წარმატებით განახლდა!', 'success');
      setEditingExhibitions(null);
      fetchCompanies();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const cancelExhibitionEdit = () => {
    setEditingExhibitions(null);
  };

  if (loading) {
    return (
      <Container>
        <Typography>იტვირთება...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">შეცდომა: {error}</Typography>
      </Container>
    );
  }

  if (selectedCompany) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{
            textAlign: 'center',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {selectedCompany.company_name} - დეტალები
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography paragraph><strong>ქვეყანა:</strong> {selectedCompany.country}</Typography>
            <Typography paragraph><strong>კომპანიის პროფილი:</strong> {selectedCompany.company_profile}</Typography>
            <Typography paragraph><strong>საიდენტიფიკაციო კოდი:</strong> {selectedCompany.identification_code}</Typography>
            <Typography paragraph><strong>იურიდიული მისამართი:</strong> {selectedCompany.legal_address}</Typography>

            {selectedCompany.contact_persons && selectedCompany.contact_persons.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>საკონტაქტო პირები:</Typography>
                {selectedCompany.contact_persons.map((person, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Typography><strong>პოზიცია:</strong> {person.position || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>სახელი გვარი:</strong> {person.name || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>ტელეფონი:</strong> {person.phone || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>მეილი:</strong> {person.email || 'არ არის მითითებული'}</Typography>
                  </Card>
                ))}
              </Box>
            )}

            <Typography paragraph>
              <strong>ვებგვერდი:</strong> 
              <a href={`http://${selectedCompany.website}`} target="_blank" rel="noopener noreferrer">
                {selectedCompany.website}
              </a>
            </Typography>
            <Typography paragraph><strong>კომენტარი:</strong> {selectedCompany.comment}</Typography>
            <Typography paragraph><strong>სტატუსი:</strong> {selectedCompany.status}</Typography>

            <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderRadius: 2, border: 2, borderColor: '#667eea' }}>
              <Typography color="text.secondary" fontStyle="italic">
                <strong>შექმნის ინფორმაცია:</strong> {new Date(selectedCompany.created_at).toLocaleDateString()}
                {selectedCompany.created_by_username && ` - ${selectedCompany.created_by_username}`}
              </Typography>
              {selectedCompany.updated_at && (
                <Typography color="text.secondary" fontStyle="italic">
                  <strong>განახლების ინფორმაცია:</strong> {new Date(selectedCompany.updated_at).toLocaleDateString()}
                  {selectedCompany.updated_by_username && ` - ${selectedCompany.updated_by_username}`}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              variant="contained" 
              onClick={() => setSelectedCompany(null)}
              sx={{ minWidth: 150 }}
            >
              უკან დაბრუნება
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{
          textAlign: 'center',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          კომპანიების ბაზა
        </Typography>

        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip 
            label={`ჯამურ რაოდენობა: ${filteredCompanies.length}${companies.length !== filteredCompanies.length ? ` (${companies.length}-იდან)` : ''}`}
            color="primary"
            variant="outlined"
            sx={{ 
              fontSize: '1rem',
              fontWeight: 'bold',
              px: 2,
              py: 1,
              height: 'auto',
              borderRadius: '20px',
              backgroundColor: 'rgba(102, 126, 234, 0.08)',
              borderColor: '#667eea'
            }}
          />
        </Box>

        {/* ფილტრები */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <Grid container spacing={2} display={'flex'} alignItems="center" justifyContent="center">
            <Grid item xs={12} sm={6} md={2}  >
              <TextField
                fullWidth
                size="small"
                label="ძებნა დასახელებით"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2} width={140}>
              <Autocomplete
                fullWidth
                size="small"
                options={[{ code: '', label: 'All Countries' }, ...countries]}
                autoHighlight
                getOptionLabel={(option) => option.label}
                value={countries.find(c => c.label === filterCountry) || { code: '', label: 'All Countries' }}
                onChange={(event, newValue) => {
                  setFilterCountry(newValue ? newValue.label : '');
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
                      {option.code && (
                        <img
                          loading="lazy"
                          width="20"
                          srcSet={`https://flagcdn.com/w40/${option.code.toLowerCase()}.png 2x`}
                          src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                          alt=""
                        />
                      )}
                      {option.label}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ქვეყანა"
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
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="პროფილი"
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
                <InputLabel>სტატუსი</InputLabel>
                <Select value={filterStatus} label="სტატუსი" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="">ყველა</MenuItem>
                  <MenuItem value="აქტიური">აქტიური</MenuItem>
                  <MenuItem value="არქივი">არქივი</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="საიდენტიფიკაციო კოდი"
                value={filterIdentificationCode}
                onChange={(e) => setFilterIdentificationCode(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
                <InputLabel>გამოფენა</InputLabel>
                <Select value={filterExhibition} label="გამოფენა" onChange={(e) => setFilterExhibition(e.target.value)}>
                  <MenuItem value="">ყველა გამოფენა</MenuItem>
                  {exhibitions.map(exhibition => (
                    <MenuItem key={exhibition.id} value={exhibition.id.toString()}>
                      {exhibition.exhibition_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
          </Grid>
        </Paper>

        {/* მართვის ღილაკები */}
        {isAuthorizedForManagement && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size='small'
              startIcon={<Add />}
              onClick={() => setEditingId(0)}
              sx={{ px:1, py:0.4, fontSize:'0.7rem', textTransform: 'none',
              color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
            >
              ახალი კომპანიის დამატება
            </Button>
            <Button
              size='small'
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setShowImport(!showImport)}
              sx={{ 
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' }
              }}
            >
              Excel-ით იმპორტი
            </Button>
          </Box>
        )}

        {/* ფორმები და მოდალები */}
        {editingId !== null && isAuthorizedForManagement && (
          <CompanyForm
            companyToEdit={companies.find(c => c.id === editingId)}
            onCompanyUpdated={handleCompanyUpdated}
            showNotification={showNotification}
            userRole={userRole}
          />
        )}

        {showImport && (
          <CompanyImport
            onImportComplete={handleImportComplete}
            showNotification={showNotification}
          />
        )}

        {/* გამოფენების რედაქტირების მოდალი */}
        <Dialog 
          open={!!editingExhibitions} 
          onClose={cancelExhibitionEdit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            გამოფენების რედაქტირება: {editingExhibitions?.companyName}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ maxHeight: 400, overflowY: 'auto', mt: 1, mb: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
              {exhibitions.map(exhibition => {
                const isChecked = Boolean(editingExhibitions?.selectedExhibitions?.includes(Number(exhibition.id)));
                return (
                  <FormControlLabel
                    key={exhibition.id}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => handleExhibitionToggle(exhibition.id, e.target.checked)}
                      />
                    }
                    label={exhibition.exhibition_name}
                    sx={{ display: 'block', mb: 1, backgroundColor: isChecked ? 'rgba(25, 118, 210, 0.04)' : 'inherit', borderRadius: 1, p: 1, border: '1px solid #1976d2', paddingLeft: 2 }}
                  />
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelExhibitionEdit} startIcon={<Cancel />} sx={{ backgroundColor: 'grey.500', color: 'grey.300' }}>
              გაუქმება
            </Button>
            <Button onClick={saveExhibitionChanges} startIcon={<Save />} variant="contained">
              შენახვა
            </Button>
          </DialogActions>
        </Dialog>

        {/* კომპანიების სია */}
        {filteredCompanies.length === 0 ? (
          <Typography textAlign="center" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            {companies.length === 0 ? 'კომპანიები არ მოიძებნა.' : 'ფილტრის შესაბამისი კომპანიები არ მოიძებნა.'}
          </Typography>
        ) : (
          <>
            {/* Desktop Table View */}
            {!isMobile ? (
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.1)' }}>
                      <TableCell align="center"><strong>კომპანია</strong></TableCell>
                      <TableCell align="center"><strong>ქვეყანა</strong></TableCell>
                      <TableCell align="center"><strong>საიდ. კოდი</strong></TableCell>
                      <TableCell align="center"><strong>გამოფენები</strong></TableCell>
                      <TableCell align="center"><strong>შექმნა</strong></TableCell>
                      <TableCell align="center"><strong>განახლება</strong></TableCell>
                      <TableCell align="center"><strong>მოქმედებები</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCompanies.map(company => (
                      <TableRow 
                        key={company.id} 
                        hover
                        sx={{ 
                          '&:nth-of-type(even)': { 
                            backgroundColor: 
                              company.status === 'აქტიური' 
                                ? 'rgba(76, 175, 80, 0.08)' 
                                : company.status === 'არქივი'
                                ? 'rgba(255, 193, 7, 0.08)'
                                : 'rgba(102, 126, 234, 0.02)' 
                          },
                          '&:nth-of-type(odd)': { 
                            backgroundColor: 
                              company.status === 'აქტიური' 
                                ? 'rgba(76, 175, 80, 0.05)' 
                                : company.status === 'არქივი'
                                ? 'rgba(255, 193, 7, 0.05)'
                                : 'transparent' 
                          }
                        }}
                      >
                        <TableCell align="center" sx={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                          <Button align="center"
                          variant="body2"
                                    size="small"
                                    sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.2s ease'
                                      }}
                            onClick={() => handleViewDetails(company)}
                          >
                            {company.company_name}
                          </Button>
                        </TableCell>
                        <TableCell align="center">{company.country}</TableCell>
                        <TableCell align="center">{company.identification_code}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '6px',
                            maxWidth: '200px',
                            alignItems: 'flex-start'
                          }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px', width: '100%' }}>
                              {company.selected_exhibitions && company.selected_exhibitions.length > 0 
                                ? exhibitions
                                  .filter(ex => company.selected_exhibitions.includes(ex.id))
                                  .map((exhibition, index) => (
                                    <Chip 
                                      key={index} 
                                      label={exhibition.exhibition_name}
                                      size="small"
                                      variant="outlined"
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        height: '26px',
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                        color: '#1976d2',
                                        borderRadius: '6px',
                                        justifyContent: 'flex-start',
                                      }}
                                    />
                                  ))
                                : <Typography variant="caption" color="text.secondary">
                                    არ მონაწილეობს
                                  </Typography>
                              }
                            </Box>
                            {isAuthorizedForManagement && (
                              <Button
                                size="small"
                                
                                onClick={() => handleEditExhibitions(company)}
                                startIcon={<Edit />}
                                sx={{ px:1, py:0.4, fontSize:'0.7rem', textTransform: 'none',
                                color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
                              >
                            EDIT
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" align="center" display={'flex'} gap={1} sx={{ justifyContent: 'center', alignItems: 'center' }} flexDirection={'column'} fontSize={'0.7rem'}>
                            {new Date(company.created_at).toLocaleDateString()}
                            {company.created_by_username && (
                              <Typography variant="caption" color="text.secondary" align="center">
                                {company.created_by_username}
                              </Typography>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {company.updated_at ? (
                            <>
                              <Typography variant="body2" align="center" display={'flex'} gap={1} sx={{ justifyContent: 'center', alignItems: 'center' }} flexDirection={'column'} fontSize={'0.7rem'}>
                                {new Date(company.updated_at).toLocaleDateString()}
                                {company.updated_by_username && (
                                  <Typography variant="caption" color="text.secondary" align="center">
                                    {company.updated_by_username}
                                  </Typography>
                                )}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: "center", justifyContent: "center" }}>
                            <Tooltip title="რედაქტირება">
                              <IconButton
                                size="small"
                                variant="contained"
                                onClick={() => handleEditClick(company)}
                                                                 sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.2s ease'
                                      }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="წაშლა">
                              <IconButton
                                size="small"
                                variant="contained"
                                onClick={() => handleDelete(company.id)}
                                                                  sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#ff0000ff'   } ,
                                        transition: 'all 0.2s ease'
                                      }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Mobile Card View */
              <Grid container spacing={2}>
                {filteredCompanies.map(company => (
                  <Grid item xs={12} key={company.id}>
                    <Card 
                      elevation={2} 
                      sx={{ 
                        backgroundColor: 
                          company.status === 'აქტიური' 
                            ? 'rgba(76, 175, 80, 0.08)' 
                            : company.status === 'არქივი'
                            ? 'rgba(255, 193, 7, 0.08)'
                            : 'inherit',
                        border: 
                          company.status === 'აქტიური' 
                            ? '1px solid rgba(76, 175, 80, 0.3)' 
                            : company.status === 'არქივი'
                            ? '1px solid rgba(255, 193, 7, 0.3)'
                            : 'inherit'
                      }}
                    >
                      <CardContent>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{ cursor: 'pointer', color: 'primary.main' }}
                          onClick={() => handleViewDetails(company)}
                        >
                          {company.company_name}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          <strong>ქვეყანა:</strong> {company.country}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          <strong>საიდ. კოდი:</strong> {company.identification_code}
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, mb: 1 }}>
                            გამოფენები:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                            {company.selected_exhibitions && company.selected_exhibitions.length > 0 
                              ? exhibitions
                                .filter(ex => company.selected_exhibitions.includes(ex.id))
                                .map((exhibition, index) => (
                                  <Chip 
                                    key={index} 
                                    label={exhibition.exhibition_name}
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      height: '26px',
                                      border: '1px solid #1976d2',
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)', 
                                      color: '#1976d2',
                                    }}
                                  />
                                ))
                              : <Typography variant="caption" color="text.secondary">
                                  არ მონაწილეობს
                                </Typography>
                            }
                            {isAuthorizedForManagement && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditExhibitions(company)}
                                startIcon={<Edit />}
                                sx={{ 
                                  mt: 1,
                                  fontSize: '0.7rem',
                                  height: '28px',
                                  borderColor: '#3744b9ff',
                                  color: '#1976d2',
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                      borderColor: '#1565c0'
                                    }
                                }}
                              >
                                გამოფენების რედაქტირება
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditClick(company)}
                        >
                          EDIT
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          color="error"
                          onClick={() => handleDelete(company.id)}
                        >
                          წაშლა
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default CompaniesList;