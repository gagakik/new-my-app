import React, { useState, useEffect } from 'react';
import {
  Box,
  Autocomplete,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Container,
  Divider,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Stack,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Radio,
  RadioGroup,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close,
  Search,
  Clear,
  Group,
  Business,
  LocationOn,
  CalendarToday,
  Assessment,
  FilterList,
  ExpandMore,
  Save,
  Cancel,
  AttachFile,
  Email,
  Phone,
  Person,
  Receipt,
  QrCode,
  Build,
  Inventory2,
  Euro
} from '@mui/icons-material';
import InvoiceForm from './InvoiceForm';
import InvitationGenerator from './InvitationGenerator';

const EventParticipants = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [boothCategoryFilter, setBoothCategoryFilter] = useState('');
  const [boothTypeFilter, setBoothTypeFilter] = useState('');
  const [formData, setFormData] = useState({
    company_id: '',
    registration_status: 'მონაწილეობის მოთხოვნა',
    payment_status: 'მომლოდინე',
    booth_number: '',
    booth_size: '',
    booth_category: 'ოქტანორმის სტენდები',
    booth_type: 'რიგითი',
    notes: '',
    payment_amount: '',
    payment_due_date: '',
    payment_method: '',
    invoice_number: '',
    price_registr_fee: '',
    price_Participation_fee: '',
    Frieze_inscription_geo: '',
    Frieze_inscription_eng: ''
  });
  const [files, setFiles] = useState({
    invoice_file: null,
    contract_file: null,
    handover_file: null
  });
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [equipmentTotal, setEquipmentTotal] = useState(0);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState(null);
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  const [exhibitionData, setExhibitionData] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedParticipantForInvoice, setSelectedParticipantForInvoice] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [showInvitationGenerator, setShowInvitationGenerator] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [registrationType, setRegistrationType] = useState('individual');
  const [manualPricePerSqm, setManualPricePerSqm] = useState('');

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'sales' ||
    userRole === 'manager';

  const boothCategories = [
    'ოქტანორმის სტენდები',
    'ინდივიდუალური სტენდები',
    'ტენტი',
    'მარკიზიანი დახლი'
  ];

  const boothTypes = [
    'რიგითი',
    'კუთხის',
    'ნახევარ კუნძული',
    'კუნძული'
  ];

  useEffect(() => {
    fetchParticipants();
    fetchCompanies();
    fetchAvailableEquipment();
    fetchEventDetails();
    fetchExhibitionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventDetails(data);
      }
    } catch (error) {
      console.error('ივენთის დეტალების მიღების შეცდომა:', error);
    }
  };

  const fetchExhibitionData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching exhibition data for event:', eventId);

      const eventResponse = await fetch(`/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        console.log('Event data received:', eventData);

        if (eventData.exhibition_id) {
          try {
            const exhibitionResponse = await fetch(`/api/exhibitions/${eventData.exhibition_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (exhibitionResponse.ok) {
              const exhibitionData = await exhibitionResponse.json();
              setExhibitionData(exhibitionData);
            } else {
              setExhibitionData(eventData);
            }
          } catch {
            console.log('Exhibition fetch failed, using event data as fallback');
            setExhibitionData(eventData);
          }
        } else {
          setExhibitionData(eventData);
        }
      }
    } catch (error) {
      console.error('გამოფენის მონაცემების მიღების შეცდომა:', error);
    }
  };

  const fetchAvailablePackages = async () => {
    try {
      if (!eventDetails?.exhibition_id) return;

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${eventDetails.exhibition_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const packages = await response.json();
        setAvailablePackages(packages);
      }
    } catch (error) {
      console.error('პაკეტების მიღების შეცდომა:', error);
    }
  };

  useEffect(() => {
    if (eventDetails?.exhibition_id) {
      fetchAvailablePackages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDetails]);

  useEffect(() => {
    if (registrationType === 'package' && selectedPackages.length > 0) {
      console.log('Updating equipment from packages:', selectedPackages);
      updateEquipmentFromPackages(selectedPackages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackages, registrationType]);

  useEffect(() => {
    const total = selectedEquipment.reduce((sum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    setEquipmentTotal(total);
  }, [selectedEquipment]);

  useEffect(() => {
    if (registrationType === 'package' && selectedPackages.length > 0) {
      const totalArea = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_area_sqm) return sum;
        return sum + (parseFloat(pkg.package.fixed_area_sqm) * parseInt(pkg.quantity || 1));
      }, 0);

      const totalPackagePrice = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
        const packagePrice = parseFloat(pkg.package.fixed_price);
        return sum + (packagePrice * parseInt(pkg.quantity || 1));
      }, 0);

      const additionalEquipmentCost = selectedEquipment.reduce((sum, item) => {
        const quantity = parseInt(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;

        let totalPackageQuantity = 0;
        selectedPackages.forEach(pkg => {
          if (!pkg || !pkg.package || !Array.isArray(pkg.package.equipment_list)) return;
          const packageEquipment = pkg.package.equipment_list.find(
            pkgEq => pkgEq && pkgEq.equipment_id === parseInt(item.equipment_id)
          );
          if (packageEquipment) {
            const pkgQty = parseInt(pkg.quantity || 1);
            const equipQty = parseInt(packageEquipment.quantity || 0);
            totalPackageQuantity += equipQty * pkgQty;
          }
        });

        const additionalQuantity = Math.max(0, quantity - totalPackageQuantity);
        return sum + (additionalQuantity * unitPrice);
      }, 0);

      // დავამატოთ რეგისტრაციის და მონაწილეობის საფასურები
      const registrFee = parseFloat(formData.price_registr_fee) || 0;
      const participationFee = parseFloat(formData.price_Participation_fee) || 0;

      const totalAmount = totalPackagePrice + additionalEquipmentCost + registrFee + participationFee;

      setFormData(prev => ({
        ...prev,
        booth_size: totalArea.toString(),
        payment_amount: totalAmount.toFixed(2)
      }));
      return;
    }

    let calculatedAmount = 0;
    let boothTotal = 0;

    if (formData.booth_size && manualPricePerSqm) {
      const boothSize = parseFloat(formData.booth_size);
      const pricePerSqm = parseFloat(manualPricePerSqm);

      if (!isNaN(boothSize) && !isNaN(pricePerSqm) && boothSize > 0 && pricePerSqm > 0) {
        boothTotal = boothSize * pricePerSqm;
        calculatedAmount = boothTotal;
      }
    }

    calculatedAmount += equipmentTotal;

    // დავამატოთ რეგისტრაციის და მონაწილეობის საფასურები
    const registrFee = parseFloat(formData.price_registr_fee) || 0;
    const participationFee = parseFloat(formData.price_Participation_fee) || 0;
    calculatedAmount += registrFee + participationFee;

    const finalAmount = calculatedAmount;

    console.log(`ჯამური თანხა: სტენდი ${boothTotal} + აღჭურვილობა ${equipmentTotal} = ${calculatedAmount} (უკვე შეიცავს 18% დღგ-ს)`);

    setFormData(prev => ({
      ...prev,
      payment_amount: finalAmount.toFixed(2)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.booth_size, manualPricePerSqm, equipmentTotal, registrationType, selectedPackages, formData.price_registr_fee, formData.price_Participation_fee]);

  useEffect(() => {
    let filtered = participants;

    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.identification_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(participant =>
        participant.registration_status === statusFilter
      );
    }

    if (paymentFilter) {
      filtered = filtered.filter(participant =>
        participant.payment_status === paymentFilter
      );
    }

    if (countryFilter) {
      filtered = filtered.filter(participant =>
        participant.country === countryFilter
      );
    }

    if (boothCategoryFilter) {
      filtered = filtered.filter(participant =>
        participant.booth_category === boothCategoryFilter
      );
    }

    if (boothTypeFilter) {
      filtered = filtered.filter(participant =>
        participant.booth_type === boothTypeFilter
      );
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, paymentFilter, countryFilter, boothCategoryFilter, boothTypeFilter]);

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log(`მონაწილეების მოთხოვნა ივენთისთვის: ${eventId}`);
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`ფეტჩი: მოვიღე ${data.length} მონაწილე ივენთისთვის ${eventId}`);
        if (data.length > 0) {
          console.log('პირველი მონაწილის ნიმუში:', data[0]);
        }
        setParticipants(data);
        setFilteredParticipants(data);
      } else {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        showNotification('მონაწილეების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('კომპანიების მიღების შეცდომა:', error);
    }
  };

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching equipment for event:', eventId);

      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Raw equipment data:', data);

        const equipmentWithAvailability = data.map(equipment => ({
          ...equipment,
          booked_quantity: 0,
          available_quantity: equipment.quantity || 100
        }));

        setAvailableEquipment(equipmentWithAvailability);
        console.log('Processed equipment data:', equipmentWithAvailability);
      } else {
        console.error('Equipment fetch failed:', response.status);
        showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('აღჭურვილობის ხელმისაწვდომობის მიღების შეცდომა:', error);
      showNotification('აღჭურვილობის ჩატვირთვის შეცდომა', 'error');
      setAvailableEquipment([]);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_id) {
      showNotification('გთხოვთ აირჩიოთ კომპანია', 'error');
      return;
    }

    console.log('Form submission data:', formData);

    try {
      const token = localStorage.getItem('token');
      const method = editingParticipant ? 'PUT' : 'POST';
      const url = editingParticipant
        ? `/api/events/${eventId}/participants/${editingParticipant.id}`
        : `/api/events/${eventId}/participants`;

      const submitData = new FormData();

      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      if (selectedEquipment.length > 0) {
        const validEquipment = selectedEquipment.filter(eq =>
          eq.equipment_id && eq.quantity > 0
        );
        submitData.append('equipment_bookings', JSON.stringify(validEquipment));
      }

      if (registrationType === 'package' && selectedPackages.length > 0) {
        submitData.append('selected_packages', JSON.stringify(selectedPackages));
      }

      console.log('Request details:', { method, url, formData, files, selectedEquipment });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Success response:', data);
        showNotification(data.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
        fetchParticipants();
        resetForm();
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);

        let errorMessage = 'შეცდომა მოთხოვნის დამუშავებისას';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (error) {
          errorMessage = `სერვერის შეცდომა: ${response.status}`;
        }
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleCompanyChange = (companyId) => {
    setFormData(prev => ({
      ...prev,
      company_id: companyId
    }));
  };

  const handleEdit = async (participant) => {
    console.log('Editing participant:', participant);
    setEditingParticipant(participant);

    const isPackage = participant.package_id !== null && participant.package_id !== undefined;
    setRegistrationType(isPackage ? 'package' : 'individual');

    try {
      if (!exhibitionData) {
        await fetchExhibitionData();
      }
      if (eventDetails?.exhibition_id && availablePackages.length === 0) {
        await fetchAvailablePackages();
      }

      if (availableEquipment.length === 0) {
        await fetchAvailableEquipment();
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      const token = localStorage.getItem('token');
      let participantEquipment = [];

      try {
        const equipmentResponse = await fetch(`/api/participants/${participant.id}/equipment-bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (equipmentResponse.ok) {
          participantEquipment = await equipmentResponse.json();
          console.log('Fetched participant equipment from API:', participantEquipment);
        } else {
          console.log('Failed to fetch equipment, using participant object data');
          participantEquipment = participant.equipment_bookings || [];
        }
      } catch (equipmentError) {
        console.log('Equipment fetch error, using participant object data:', equipmentError);
        participantEquipment = participant.equipment_bookings || [];
      }

      console.log('Participant equipment bookings:', participantEquipment);

      let currentEquipmentTotal = 0;
      if (participantEquipment && participantEquipment.length > 0) {
        currentEquipmentTotal = participantEquipment.reduce((sum, booking) => {
          const unitPrice = parseFloat(booking.unit_price) || 0;
          const quantity = parseInt(booking.quantity) || 0;
          console.log(`Equipment item: ${booking.code_name}, quantity: ${quantity}, unit_price: ${unitPrice}, subtotal: ${unitPrice * quantity}`);
          return sum + (unitPrice * quantity);
        }, 0);
      }

      console.log('Current equipment total for price calculation:', currentEquipmentTotal, 'from bookings:', participantEquipment);

      setFormData({
        company_id: participant.company_id || '',
        registration_status: participant.registration_status || 'მონაწილეობის მოთხოვნა',
        payment_status: participant.payment_status || 'მომლოდინე',
        booth_number: participant.booth_number || '',
        booth_size: participant.booth_size || '',
        booth_category: participant.booth_category || 'ოქტანორმის სტენდები',
        booth_type: participant.booth_type || 'რიგითი',
        notes: participant.notes || '',
        contact_person: participant.contact_person || '',
        contact_position: participant.contact_position || '',
        contact_email: participant.contact_email || '',
        contact_phone: participant.contact_phone || '',
        payment_amount: participant.payment_amount || '',
        payment_due_date: participant.payment_due_date ? participant.payment_due_date.split('T')[0] : '',
        payment_method: participant.payment_method || '',
        invoice_number: participant.invoice_number || '',
        price_registr_fee: participant.price_registr_fee || '',
        price_Participation_fee: participant.price_Participation_fee || participant.price_participation_fee || '',
        Frieze_inscription_geo: participant.Frieze_inscription_geo || participant.frieze_inscription_geo || '',
        Frieze_inscription_eng: participant.Frieze_inscription_eng || participant.frieze_inscription_eng || ''
      });

      console.log('Setting form data with booth info:', {
        booth_category: participant.booth_category,
        booth_type: participant.booth_type
      });

      if (isPackage) {
        const participantPackages = participant.selected_packages || [];
        console.log('Loading packages for edit:', participantPackages);
        setSelectedPackages(participantPackages);

      } else {
        setSelectedPackages([]);

        const equipment = participantEquipment.map(booking => {
          const availableItem = availableEquipment.find(eq => eq.id === booking.equipment_id);
          return {
            equipment_id: booking.equipment_id,
            code_name: booking.code_name || (availableItem?.code_name) || '',
            quantity: booking.quantity,
            unit_price: booking.unit_price,
            total_price: booking.total_price || (booking.quantity * booking.unit_price),
            available_quantity: availableItem?.quantity || availableItem?.available_quantity || 100
          };
        });

        console.log('Loading equipment for individual edit:', equipment);
        setSelectedEquipment(equipment);

        await new Promise(resolve => setTimeout(resolve, 100));

        if (participant.booth_size && participant.payment_amount) {
          const boothSize = parseFloat(participant.booth_size);
          const totalAmount = parseFloat(participant.payment_amount);

          // Check if price_per_sqm is already set in participant data
          if (participant.price_per_sqm && parseFloat(participant.price_per_sqm) > 0) {
            setManualPricePerSqm(participant.price_per_sqm);
            console.log('Using existing price per sqm:', participant.price_per_sqm);
          } else {
            const actualEquipmentTotal = equipment.reduce((sum, eq) => {
              const qty = parseInt(eq.quantity) || 0;
              const price = parseFloat(eq.unit_price) || 0;
              return sum + (qty * price);
            }, 0);

            // Subtract registration and participation fees from calculation
            const registrFee = parseFloat(participant.price_registr_fee) || 0;
            const participationFee = parseFloat(participant.price_Participation_fee || participant.price_participation_fee) || 0;
            
            const boothCost = Math.max(0, totalAmount - actualEquipmentTotal - registrFee - participationFee);

            if (boothSize > 0) {
              const pricePerSqm = (boothCost / boothSize).toFixed(2);
              console.log('Calculated price per sqm:', pricePerSqm, 'from booth cost:', boothCost, 'booth size:', boothSize, 'total amount:', totalAmount, 'equipment total:', actualEquipmentTotal, 'fees:', registrFee + participationFee);
              setManualPricePerSqm(pricePerSqm);
            } else {
              setManualPricePerSqm('');
            }
          }
        } else {
          setManualPricePerSqm('');
        }
      }

    } catch (error) {
      console.error('Error loading data for edit:', error);
      showNotification('მონაცემების ჩატვირთვის შეცდომა', 'error');
    }

    setShowAddForm(true);
  };

  const addEquipmentRow = () => {
    const newEquipmentItem = {
      equipment_id: '',
      code_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      available_quantity: 0
    };
    setSelectedEquipment([...selectedEquipment, newEquipmentItem]);
  };

  const removeEquipmentItem = (indexToRemove) => {
    const newEquipment = selectedEquipment.filter((_, index) => index !== indexToRemove);
    setSelectedEquipment(newEquipment);
  };

  const handleEquipmentChange = (index, field, value) => {
    const updatedEquipment = [...selectedEquipment];

    if (!updatedEquipment[index]) {
      console.error(`Equipment item at index ${index} does not exist.`);
      return;
    }

    const newItem = { ...updatedEquipment[index] };
    newItem[field] = value;

    if (field === 'equipment_id') {
      const selectedEquip = availableEquipment.find(eq => eq.id === parseInt(value));
      if (selectedEquip) {
        newItem.code_name = selectedEquip.code_name;
        newItem.unit_price = parseFloat(selectedEquip.price) || 0;

        let availableQty = selectedEquip.available_quantity || selectedEquip.quantity || 100;
        let displayText = '';

        if (registrationType === 'package' && selectedPackages.length > 0) {
          let totalPackageQuantity = 0;
          selectedPackages.forEach(pkg => {
            if (pkg && pkg.package && Array.isArray(pkg.package.equipment_list)) {
              const packageEquipment = pkg.package.equipment_list.find(
                pkgEq => pkgEq && pkgEq.equipment_id === selectedEquip.id
              );
              if (packageEquipment) {
                const pkgQty = parseInt(pkg.quantity || 1);
                const equipQty = parseInt(packageEquipment.quantity || 0);
                totalPackageQuantity += equipQty * pkgQty;
              }
            }
          });

          if (totalPackageQuantity > 0) {
            displayText = `${selectedEquip.code_name} (პაკეტებში: ${totalPackageQuantity} უფასო, სულ ხელმისაწვდომი: ${availableQty}, ფასი: €${selectedEquip.price || 0})`;
          } else {
            displayText = `${selectedEquip.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: EUR${selectedEquip.price || 0})`;
          }
        } else {
          displayText = `${selectedEquip.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: EUR${selectedEquip.price || 0})`;
        }
        newItem.displayText = displayText;
        newItem.available_quantity = availableQty;
        const quantity = parseInt(newItem.quantity) || 1;
        newItem.total_price = quantity * newItem.unit_price;
      } else {
        newItem.code_name = '';
        newItem.unit_price = 0;
        newItem.available_quantity = 0;
        newItem.total_price = 0;
      }
    } else if (field === 'quantity') {
      const quantity = parseInt(value) || 0;
      const unitPrice = parseFloat(newItem.unit_price) || 0;
      newItem.quantity = quantity;
      newItem.total_price = quantity * unitPrice;
    } else if (field === 'unit_price') {
      const unitPrice = parseFloat(value) || 0;
      const quantity = parseInt(newItem.quantity) || 1;
      newItem.unit_price = unitPrice;
      newItem.total_price = quantity * unitPrice;
    }

    updatedEquipment[index] = newItem;
    setSelectedEquipment(updatedEquipment);
  };

  const handleDelete = async (participantId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ მონაწილის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('მონაწილე წარმატებით წაიშალა', 'success');
        fetchParticipants();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'მონაწილის წაშლა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('შეცდომა წაშლისას', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: '',
      registration_status: 'მონაწილეობის მოთხოვნა',
      payment_status: 'მომლოდინე',
      booth_number: '',
      booth_size: '',
      booth_category: 'ოქტანორმის სტენდები',
      booth_type: 'რიგითი',
      notes: '',
      payment_amount: '',
      payment_due_date: '',
      payment_method: '',
      invoice_number: '',
      price_registr_fee: '',
      price_Participation_fee: '',
      Frieze_inscription_geo: '',
      Frieze_inscription_eng: ''
    });
    setFiles({
      invoice_file: null,
      contract_file: null,
      handover_file: null
    });
    setSelectedEquipment([]);
    setSelectedPackages([]);
    setEquipmentTotal(0);
    setRegistrationType('individual');
    setManualPricePerSqm('');
    setEditingParticipant(null);
    setShowAddForm(false);
  };

  const handleRegistrationTypeChange = (type) => {
    setRegistrationType(type);
    setSelectedPackages([]);
    setSelectedEquipment([]);
    setManualPricePerSqm('');

    setFormData(prev => ({
      ...prev,
      booth_size: '',
      payment_amount: ''
    }));
  };

  const addPackageSelection = () => {
    setSelectedPackages([...selectedPackages, { package_id: '', quantity: 1, package: null }]);
  };

  const removePackageSelection = (indexToRemove) => {
    const newPackages = selectedPackages.filter((_, index) => index !== indexToRemove);
    setSelectedPackages(newPackages);
    updateEquipmentFromPackages(newPackages);
  };

  const handlePackageChange = (index, field, value) => {
    const updatedPackages = [...selectedPackages];

    if (!updatedPackages[index]) {
      updatedPackages[index] = { package_id: '', quantity: 1, package: null };
    }

    if (field === 'package_id') {
      const selectedPkg = availablePackages.find(pkg => pkg.id === parseInt(value));
      updatedPackages[index] = {
        ...updatedPackages[index],
        package_id: value,
        package: selectedPkg || null
      };
    } else if (field === 'quantity') {
      updatedPackages[index] = {
        ...updatedPackages[index],
        quantity: parseInt(value) || 1
      };
    }

    setSelectedPackages(updatedPackages);
    updateEquipmentFromPackages(updatedPackages);
  };

  const updateEquipmentFromPackages = (packages) => {
    console.log('updateEquipmentFromPackages called with:', packages);

    if (!packages || packages.length === 0) {
      const additionalEquipment = selectedEquipment.filter(eq => {
        return !packages.some(pkg =>
          pkg?.package?.equipment_list?.some(pkgEq =>
            pkgEq?.equipment_id === parseInt(eq.equipment_id)
          )
        );
      });
      setSelectedEquipment(additionalEquipment);
      return;
    }

    const currentAdditionalEquipment = selectedEquipment.filter(eq => {
      let totalPackageQuantity = 0;
      packages.forEach(pkg => {
        if (pkg?.package?.equipment_list) {
          const packageItem = pkg.package.equipment_list.find(
            pkgEq => pkgEq?.equipment_id === parseInt(eq.equipment_id)
          );
          if (packageItem) {
            totalPackageQuantity += (packageItem.quantity || 0) * (pkg.quantity || 1);
          }
        }
      });

      return totalPackageQuantity === 0 || (parseInt(eq.quantity) || 0) > totalPackageQuantity;
    });

    const packageEquipmentMap = new Map();

    packages.forEach(pkg => {
      if (pkg && pkg.package && Array.isArray(pkg.package.equipment_list)) {
        pkg.package.equipment_list.forEach(eq => {
          if (eq && eq.equipment_id) {
            const key = eq.equipment_id;
            const packageQuantity = parseInt(pkg.quantity) || 1;
            const equipmentQuantity = parseInt(eq.quantity) || 0;
            const totalQuantity = equipmentQuantity * packageQuantity;

            const availableItem = availableEquipment.find(avEq => avEq.id === eq.equipment_id);

            if (packageEquipmentMap.has(key)) {
              const existing = packageEquipmentMap.get(key);
              existing.quantity += totalQuantity;
            } else {
              packageEquipmentMap.set(key, {
                equipment_id: eq.equipment_id,
                quantity: totalQuantity,
                unit_price: parseFloat(availableItem?.price || eq.price) || 0,
                code_name: eq.code_name || availableItem?.code_name || 'უცნობი აღჭურვილობა',
                available_quantity: availableItem?.quantity || availableItem?.available_quantity || 100
              });
            }
          }
        });
      }
    });

    const packageEquipment = Array.from(packageEquipmentMap.values()).map(eq => ({
      ...eq,
      total_price: (eq.quantity || 0) * (eq.unit_price || 0)
    }));

    const mergedEquipment = [...packageEquipment];

    currentAdditionalEquipment.forEach(addEq => {
      const existingIndex = mergedEquipment.findIndex(eq =>
        parseInt(eq.equipment_id) === parseInt(addEq.equipment_id)
      );

      if (existingIndex >= 0) {
        const packageQty = mergedEquipment[existingIndex].quantity || 0;
        const additionalQty = parseInt(addEq.quantity) || 0;
        mergedEquipment[existingIndex].quantity = Math.max(packageQty, additionalQty);
        mergedEquipment[existingIndex].total_price =
          mergedEquipment[existingIndex].quantity * mergedEquipment[existingIndex].unit_price;
      } else {
        mergedEquipment.push(addEq);
      }
    });

    console.log('Final merged equipment:', mergedEquipment);
    setSelectedEquipment(mergedEquipment);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentFilter('');
    setCountryFilter('');
    setBoothCategoryFilter('');
    setBoothTypeFilter('');
  };

  const fetchCompanyDetails = async (companyId) => {
    setLoadingCompanyDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('კომპანიის დეტალების მიღება ვერ მოხერხდა');
      }

      const companyData = await response.json();
      console.log('Raw company data from API:', companyData);

      // Handle contact_persons properly
      let contactPersons = [];
      if (companyData.contact_persons) {
        if (Array.isArray(companyData.contact_persons)) {
          contactPersons = companyData.contact_persons;
        } else if (typeof companyData.contact_persons === 'string') {
          try {
            if (companyData.contact_persons.trim() === '' ||
                companyData.contact_persons === '[]' ||
                companyData.contact_persons === '[object Object]') {
              contactPersons = [];
            } else {
              contactPersons = JSON.parse(companyData.contact_persons);
              if (!Array.isArray(contactPersons)) {
                contactPersons = [];
              }
            }
          } catch (parseError) {
            console.error('Contact persons parsing error:', parseError);
            contactPersons = [];
          }
        } else if (typeof companyData.contact_persons === 'object') {
          // If it's an object but not array, wrap it or reset to empty
          contactPersons = [];
        }
      }

      // Ensure we have a valid array
      if (!Array.isArray(contactPersons)) {
        contactPersons = [];
      }

      // Filter out invalid contact persons
      contactPersons = contactPersons.filter(person =>
        person && typeof person === 'object' &&
        (person.name || person.position || person.phone || person.email)
      );

      console.log('Processed contact persons:', contactPersons);

      const processedCompanyData = {
        ...companyData,
        contact_persons: contactPersons
      };

      setSelectedCompanyForDetails(processedCompanyData);
      setShowCompanyDetails(true);
    } catch (error) {
      console.error('კომპანიის დეტალების მიღება ვერ მოხერხდა:', error);
      showNotification('კომპანიის დეტალების მიღება ვერ მოხერხდა', 'error');
    } finally {
      setLoadingCompanyDetails(false);
    }
  };

  const showCompanyDetailsModal = async (participant) => {
    console.log('Opening company details for participant:', participant);
    console.log('Company ID:', participant.company_id);

    // If participant already has company details loaded, use them as fallback
    if (participant.contact_persons || participant.company_phone || participant.company_email) {
      console.log('Participant has company contact info:', {
        contact_persons: participant.contact_persons,
        company_phone: participant.company_phone,
        company_email: participant.company_email
      });
    }

    await fetchCompanyDetails(participant.company_id);
  };

  const handleGenerateInvoice = (participant) => {
    setSelectedParticipantForInvoice({
      ...participant,
      event_id: eventId
    });
    setShowInvoiceForm(true);
  };

  const closeInvoiceForm = () => {
    setShowInvoiceForm(false);
    setSelectedParticipantForInvoice(null);
    fetchParticipants();
  };

  const uniqueCountries = [...new Set(participants.map(p => p.country))].filter(Boolean).sort();

  const getStatusBadge = (status) => {
    const statusMap = {
      'მონაწილეობის მოთხოვნა': { color: 'error', text: 'მოთხოვნა' },
      'მომლოდინე': { color: 'error', text: 'მომლოდ.' },
      'რეგისტრირებული': { color: 'success', text: 'რეგისტრ.' },
      'დადასტურებული': { color: 'success', text: 'დადასტ.' },
      'გაუქმებული': { color: 'error', text: 'გაუქმებული' }
    };
    return statusMap[status] || { color: 'default', text: status };
  };

  const getPaymentBadge = (status) => {
    const statusMap = {
      'მომლოდინე': { color: 'error', text: 'მომლოდ.' },
      'გადახდილი': { color: 'success', text: 'გადახდ.' },
      'არ არის საჭიროო': { color: 'default', text: 'არ საჭირო' }
    };
    return statusMap[status] || { color: 'default', text: status };
  };



  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '95vh',
          maxHeight: '95vh',
          borderRadius: 3
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
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            {eventName} - მონაწილეები ({filteredParticipants.length} / {participants.length})
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
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

      <DialogContent sx={{ p: 0 }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* ფილტრები */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList />
              ფილტრები
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="ძიება კომპანიის სახელით, კოდით ან კონტაქტით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={resetFilters}
                  startIcon={<Clear />}
                  size="small"
                  sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 1,
                            py: 1,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}

                >
                  ფილტრების გასუფთავება
                </Button>
              </Grid>
            </Grid>

            <Grid container spacing={2} display={'flex'} justifyContent={'center'}>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small" style={{minWidth: 120}} >
                  <InputLabel>სტატუსი</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="სტატუსი"
                  >
                    <MenuItem value="" >ყველა</MenuItem>
                    <MenuItem value="მონაწილეობის მოთხოვნა">მოთხოვნა</MenuItem>
                    <MenuItem value="მომლოდინე">მომლოდინე</MenuItem>
                    <MenuItem value="რეგისტრირებული">რეგისტრირებული</MenuItem>
                    <MenuItem value="დადასტურებული">დადასტურებული</MenuItem>
                    <MenuItem value="გაუქმებული">გაუქმებული</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small" style={{minWidth: 120}}>
                  <InputLabel>გადახდა</InputLabel>
                  <Select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    label="გადახდა"
                  >
                    <MenuItem value="">ყველა</MenuItem>
                    <MenuItem value="მომლოდინე">მომლოდინე</MenuItem>
                    <MenuItem value="გადახდილი">გადახდილი</MenuItem>
                    <MenuItem value="არ არის საჭიროო">არ საჭირო</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small" style={{minWidth: 120}}>
                  <InputLabel>ქვეყანა</InputLabel>
                  <Select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    label="ქვეყანა"
                  >
                    <MenuItem value="">ყველა</MenuItem>
                    {uniqueCountries.map(country => (
                      <MenuItem key={country} value={country}>{country}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small" style={{minWidth: 120}}>
                  <InputLabel>კატეგორია</InputLabel>
                  <Select
                    value={boothCategoryFilter}
                    onChange={(e) => setBoothCategoryFilter(e.target.value)}
                    label="კატეგორია"
                  >
                    <MenuItem value="">ყველა</MenuItem>
                    {boothCategories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small" style={{minWidth: 120}}>
                  <InputLabel>ტიპი</InputLabel>
                  <Select
                    value={boothTypeFilter}
                    onChange={(e) => setBoothTypeFilter(e.target.value)}
                    label="ტიპი"
                  >
                    <MenuItem value="">ყველა</MenuItem>
                    {boothTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* მოქმედებები */}
          {isAuthorizedForManagement && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                  if (!exhibitionData) {
                    fetchExhibitionData();
                  }
                  if (eventDetails?.exhibition_id && availablePackages.length === 0) {
                    fetchAvailablePackages();
                  }
                }}
                sx={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(79, 172, 254, 0.4)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                ახალი მონაწილის დამატება
              </Button>

              {filteredParticipants.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<QrCode />}
                  onClick={() => setShowInvitationGenerator(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  QR მოსაწვევების გენერაცია
                </Button>
              )}
            </Box>
          )}

          {/* ფორმა */}
          {showAddForm && isAuthorizedForManagement && (
            <Paper
              elevation={4}
              sx={{
                p: 3,
                mb: 3,
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                border: '2px solid #e2e8f0',
                borderRadius: 3
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person />
                {editingParticipant ? 'მონაწილის რედაქტირება' : 'ახალი მონაწილის დამატება'}
              </Typography>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3} >
                  <Grid item xs={12}>
                    <FormControl fullWidth required sx={{ mb: 1, minWidth: '400px' }}>
                      <InputLabel >კომპანია</InputLabel>
                      <Select
                        value={formData.company_id}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        label="კომპანია"
                      >
                        {companies.map(company => (
                          <MenuItem key={company.id} value={company.id} >
                            {company.company_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* სტენდის ინფორმაცია */}
                  <Grid item xs={12} sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center'}} >
                    <Accordion defaultExpanded >
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 1, marginBottom: 0}}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1}}>
                          <LocationOn />
                          სტენდის ინფორმაცია
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ mb: 1, p: 1}}>
                        <Grid container spacing={2} sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Grid item xs={12} sx={{ mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 2 , flexDirection: 'row'}}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>რეგისტრაციის ტიპი</Typography>
                            
                            <RadioGroup
                              row
                              value={registrationType}
                              onChange={(e) => handleRegistrationTypeChange(e.target.value)}
                            >
                              <FormControlLabel
                                value="individual"
                                control={<Radio />}
                                label="ინდივიდუალური კონფიგურაცია"
                              />
                              <FormControlLabel
                                value="package"
                                control={<Radio />}
                                label="პაკეტების არჩევა"
                              />
                            </RadioGroup>
                          </Grid>
                        <Grid sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1, gap: 1, flexDirection: 'row', width: '100%'}}>
                          <Grid item xs={6}>
                            <FormControl fullWidth sx={{ width: '200px' }}>
                              <InputLabel>კატეგორია</InputLabel>
                              <Select
                                value={formData.booth_category}
                                onChange={(e) => setFormData(prev => ({ ...prev, booth_category: e.target.value }))}
                                label="კატეგორია"
                              >
                                {boothCategories.map(category => (
                                  <MenuItem key={category} value={category}>{category}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth sx={{ width: '200px' }}>
                              <InputLabel >ტიპი</InputLabel>
                              <Select
                                value={formData.booth_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, booth_type: e.target.value }))}
                                label="ტიპი"
                              >
                                {boothTypes.map(type => (
                                  <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="სტენდის ნომერი"
                              value={formData.booth_number}
                              onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="სტენდის ზომა (კვმ)"
                              type="number"
                              inputProps={{ step: 0.01 }}
                              value={formData.booth_size}
                              onChange={(e) => setFormData(prev => ({ ...prev, booth_size: e.target.value }))}
                              disabled={registrationType === 'package'}
                              required
                              helperText={registrationType === 'package' ? 'პაკეტების ფართობი ავტომატურად განისაზღვრება' : ''}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="ფასი კვმ-ზე (EUR)"
                              type="number"
                              inputProps={{ step: 0.01 }}
                              value={manualPricePerSqm}
                              onChange={(e) => setManualPricePerSqm(e.target.value)}
                              disabled={registrationType === 'package'}
                              placeholder="შეიყვანეთ ფასი კვმ-ზე"
                              helperText={registrationType === 'package' ? 'პაკეტებისთვის ფასი ფიქსირებულია' : ''}
                            />
                          </Grid>
                          </Grid>
                                            {editingParticipant && (
                    <>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>სტატუსი</InputLabel>
                          <Select
                            value={formData.registration_status}
                            onChange={(e) => setFormData({...formData, registration_status: e.target.value})}
                            label="რეგისტრაციის სტატუსი"
                          >
                            <MenuItem value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</MenuItem>
                            <MenuItem value="რეგისტრირებული">რეგისტრირებული</MenuItem>
                            <MenuItem value="დადასტურებული">დადასტურებული</MenuItem>
                            <MenuItem value="გაუქმებული">გაუქმებული</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                    </>
                  )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>

                  {/* პაკეტების არჩევა */}
                  {registrationType === 'package' && (
                    <Grid item xs={12} sx={{width:'100%'}}>
                      <Accordion sx={{ mb: 2, border: '1px solid #e2e8f0', borderRadius: 1, width: '100%' }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 1, marginBottom: 0 }}>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory2 />
                            პაკეტების არჩევა
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Button
                              variant="contained"
                              startIcon={<Add />}
                              onClick={addPackageSelection}
                              size="small"
                              color="success"
                            >
                              პაკეტის დამატება
                            </Button>
                          </Box>

                          {selectedPackages.map((packageSelection, index) => (
                            <Card key={index} sx={{ mb: 2, border: '1px solid #e2e8f0' }}>
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={8}>
                                    <FormControl fullWidth required>
                                      <InputLabel >პაკეტი</InputLabel>
                                      <Select
                                        sx={{ width: '200px'}}
                                        value={packageSelection.package_id || ''}
                                        onChange={(e) => handlePackageChange(index, 'package_id', e.target.value)}
                                        label="პაკეტი"
                                      >
                                        {availablePackages.map(pkg => (
                                          <MenuItem key={pkg.id} value={pkg.id}>
                                            {pkg.package_name} - {pkg.fixed_area_sqm}კვმ - EUR{pkg.fixed_price}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                  <Grid item xs={3}>
                                    <TextField
                                      fullWidth
                                      label="რაოდენობა"
                                      type="number"
                                      inputProps={{ min: 1 }}
                                      value={packageSelection.quantity}
                                      onChange={(e) => handlePackageChange(index, 'quantity', e.target.value)}
                                      required
                                    />
                                  </Grid>
                                  <Grid item xs={1}>
                                    <IconButton
                                      color="error"
                                      onClick={() => removePackageSelection(index)}
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Grid>
                                </Grid>

                                {packageSelection.package && (
                                  <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2">პაკეტის დეტალები:</Typography>
                                    <Typography variant="body2">
                                      <strong>სახელი:</strong> {packageSelection.package.package_name}<br />
                                      <strong>ფართობი:</strong> {packageSelection.package.fixed_area_sqm} კვმ × {packageSelection.quantity} = {packageSelection.package.fixed_area_sqm * packageSelection.quantity} კვმ<br />
                                      <strong>ღირებულება:</strong> EUR{packageSelection.package.fixed_price} × {packageSelection.quantity} = EUR{packageSelection.package.fixed_price * packageSelection.quantity}
                                    </Typography>
                                    {packageSelection.package.description && (
                                      <Typography variant="body2">
                                        <strong>აღწერა:</strong> {packageSelection.package.description}
                                      </Typography>
                                    )}
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          ))}

                          {selectedPackages.length > 0 && (
                            <Alert severity="success">
                              <Typography variant="h6">პაკეტების ჯამი:</Typography>
                              <Typography>
                                <strong>ჯამური ფართობი:</strong> {selectedPackages.reduce((sum, pkg) => {
                                  if (!pkg || !pkg.package || !pkg.package.fixed_area_sqm) return sum;
                                  return sum + (parseFloat(pkg.package.fixed_area_sqm) * parseInt(pkg.quantity || 1));
                                }, 0)} კვმ
                              </Typography>
                              <Typography>
                                <strong>ჯამური ღირებულება:</strong> EUR{selectedPackages.reduce((sum, pkg) => {
                                  if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
                                  return sum + (parseFloat(pkg.package.fixed_price) * parseInt(pkg.quantity || 1));
                                }, 0)}
                              </Typography>
                            </Alert>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </Grid>
                  )}

                  {/* აღჭურვილობა */}
                  <Grid item xs={12} sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%'}}>
                    <Accordion fullWidth sx={{ mb: 2, border: '1px solid #e2e8f0', borderRadius: 1, width: '100%'}}>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', 
                        borderRadius: 1, marginBottom: 0, width: '100%'
                        , display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Build />
                          {registrationType === 'package'
                            ? 'პაკეტების აღჭურვილობა + დამატებითი'
                            : 'აღჭურვილობის არჩევა'
                          }
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={addEquipmentRow}
                            size="small"
                            color="primary"
                          >
                            აღჭურვილობის დამატება
                          </Button>
                        </Box>

                        {selectedEquipment.map((item, index) => (
                          <Card key={index} sx={{ mb: 2, border: '1px solid #e2e8f0' }}>
                            <CardContent>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                  <FormControl fullWidth sx={{ width: '300px' }}>
                                    <InputLabel>აღჭურვილობა</InputLabel>
                                    <Select
                                      value={item.equipment_id || ''}
                                      onChange={(e) => handleEquipmentChange(index, 'equipment_id', e.target.value)}
                                      label="აღჭურვილობა"
                                    >
                                      {availableEquipment && availableEquipment.length > 0 ? (
                                        availableEquipment.map(equipment => {
                                          const availableQty = equipment.available_quantity || equipment.quantity || 100;
                                          let displayText = '';

                                          if (registrationType === 'package' && selectedPackages.length > 0) {
                                            let totalPackageQuantity = 0;
                                            selectedPackages.forEach(pkg => {
                                              if (pkg && pkg.package && Array.isArray(pkg.package.equipment_list)) {
                                                const packageEquipment = pkg.package.equipment_list.find(
                                                  pkgEq => pkgEq && pkgEq.equipment_id === equipment.id
                                                );
                                                if (packageEquipment) {
                                                  const pkgQty = parseInt(pkg.quantity || 1);
                                                  const equipQty = parseInt(packageEquipment.quantity || 0);
                                                  totalPackageQuantity += equipQty * pkgQty;
                                                }
                                              }
                                            });

                                            if (totalPackageQuantity > 0) {
                                              displayText = `${equipment.code_name} (პაკეტებში: ${totalPackageQuantity} უფასო, სულ: ${availableQty}, €${equipment.price || 0})`;
                                            } else {
                                              displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, EUR${equipment.price || 0})`;
                                            }
                                          } else {
                                            displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, EUR${equipment.price || 0})`;
                                          }

                                          return (
                                            <MenuItem key={equipment.id} value={equipment.id}>
                                              {displayText}
                                            </MenuItem>
                                          );
                                        })
                                      ) : (
                                        <MenuItem value="" disabled>აღჭურვილობა იტვირთება...</MenuItem>
                                      )}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                  <TextField
                                    fullWidth
                                    label="რაოდენობა"
                                    type="number"
                                    inputProps={{ min: 0, max: item.available_quantity || 999 }}
                                    value={item.quantity}
                                    onChange={(e) => handleEquipmentChange(index, 'quantity', e.target.value)}
                                    required
                                    error={item.available_quantity === 0 || parseInt(item.quantity) > item.available_quantity}
                                    helperText={
                                      item.available_quantity === 0 ? 'ამოწურულია' :
                                      parseInt(item.quantity) > item.available_quantity ? `მაქს: ${item.available_quantity}` :
                                      `ხელმისაწვდომი: ${item.available_quantity}`
                                    }
                                  />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                  <TextField
                                  sx={{width: '160px'}}
                                    fullWidth
                                    label="ერთეულის ფასი EUR"
                                    type="number"
                                    inputProps={{ step: 0.01 }}
                                    value={item.unit_price}
                                    onChange={(e) => handleEquipmentChange(index, 'unit_price', e.target.value)}
                                    InputProps={{ readOnly: registrationType === 'package' }}
                                  />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                  <TextField
                                  sx={{width: '160px'}}
                                    fullWidth
                                    label="ჯამი EUR"
                                    type="number"
                                    value={item.total_price ? parseFloat(item.total_price).toFixed(2) : '0.00'}
                                    InputProps={{ readOnly: true }}
                                  />
                                </Grid>
                                <Grid item xs={6} md={2}>
                                  <IconButton
                                    color="error"
                                    onClick={() => removeEquipmentItem(index)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}

                        {selectedEquipment.length > 0 && (
                          <Alert severity="info">
                            <Typography variant="h6">
                              აღჭურვილობის ჯამური ღირებულება: €{equipmentTotal.toFixed(2)}
                            </Typography>
                          </Alert>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Grid>



                  {/* გადახდის ინფორმაცია */}
                  <Grid item xs={12}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 3, marginBottom: 2 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Euro />
                          გადახდის ინფორმაცია
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="რეგისტრაციის საფასური EUR"
                              type="number"
                              inputProps={{ step: 0.01 }}
                              value={formData.price_registr_fee}
                              onChange={(e) => setFormData({...formData, price_registr_fee: e.target.value})}
                              placeholder="შეიყვანეთ რეგისტრაციის საფასური"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="მონაწილეობის საფასური EUR"
                              type="number"
                              inputProps={{ step: 0.01 }}
                              value={formData.price_Participation_fee}
                              onChange={(e) => setFormData({...formData, price_Participation_fee: e.target.value})}
                              placeholder="შეიყვანეთ მონაწილეობის საფასური"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="გადასახდელი თანხა EUR"
                              type="number"
                              inputProps={{ step: 0.01 }}
                              value={formData.payment_amount}
                              onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                              InputProps={{ readOnly: true }}
                              helperText={
                                registrationType === 'package' && selectedPackages.length > 0 ? (
                                  `პაკეტები: EUR${selectedPackages.reduce((sum, pkg) => {
                                    if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
                                    return sum + (parseFloat(pkg.package.fixed_price) * parseInt(pkg.quantity || 1));
                                  }, 0)} | დამატებითი აღჭურვილობა: EUR${selectedEquipment.reduce((sum, item) => {
                                    const quantity = parseInt(item.quantity) || 0;
                                    let totalPackageQuantity = 0;
                                    selectedPackages.forEach(pkg => {
                                      if (!pkg || !pkg.package || !Array.isArray(pkg.package.equipment_list)) return;
                                      const packageEquipment = pkg.package.equipment_list.find(
                                        pkgEq => pkgEq && pkgEq.equipment_id === parseInt(item.equipment_id)
                                      );
                                      if (packageEquipment) {
                                        const pkgQty = parseInt(pkg.quantity || 1);
                                        const equipQty = parseInt(packageEquipment.quantity || 0);
                                        totalPackageQuantity += equipQty * pkgQty;
                                      }
                                    });
                                    const additionalQuantity = Math.max(0, quantity - totalPackageQuantity);
                                    return sum + (additionalQuantity * (parseFloat(item.unit_price) || 0));
                                  }, 0).toFixed(2)} | საფასურები: EUR${(parseFloat(formData.price_registr_fee) || 0) + (parseFloat(formData.price_Participation_fee) || 0)} | სულ: EUR${formData.payment_amount}`
                                ) : (
                                  `${formData.booth_size && manualPricePerSqm ? `სტენდი: EUR${(parseFloat(formData.booth_size || 0) * parseFloat(manualPricePerSqm || 0)).toFixed(2)} | ` : ''}აღჭურვილობა: EUR${equipmentTotal.toFixed(2)} | საფასურები: EUR${(parseFloat(formData.price_registr_fee) || 0) + (parseFloat(formData.price_Participation_fee) || 0)} | სულ: EUR${formData.payment_amount}`
                                )
                              }
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="გადახდის ვადა"
                              type="date"
                              value={formData.payment_due_date}
                              onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth>
                              <InputLabel>გადახდის მეთოდი</InputLabel>
                              <Select
                                value={formData.payment_method}
                                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                                label="გადახდის მეთოდი"
                              >
                                <MenuItem value="">აირჩიეთ მეთოდი</MenuItem>
                                <MenuItem value="ბანკის გადარიცხვა">ბანკის გადარიცხვა</MenuItem>
                                <MenuItem value="ნაღდი">ნაღდი</MenuItem>
                                <MenuItem value="საბანკო ბარათი">საბანკო ბარათი</MenuItem>
                                <MenuItem value="ონლაინ გადახდა">ონლაინ გადახდა</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="ინვოისის ნომერი"
                              value={formData.invoice_number}
                              onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                            />
                          </Grid>
                          <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel >გადახდის სტატუსი</InputLabel>
                          <Select sx={{ width: '200px' }}
                            value={formData.payment_status}
                            onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                            label="გადახდის სტატუსი"
                          >
                            <MenuItem value="მომლოდინე">მომლოდინე</MenuItem>
                            <MenuItem value="გადახდილი">გადახდილი</MenuItem>
                            <MenuItem value="არ არის საჭიროო">არ არის საჭიროო</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>

                  {/* დოკუმენტები */}
                  <Grid item xs={12} sx={{ mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'column', width: '100%' }}>
                  <Grid item xs={12} sx={{ width: '100%' }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 3, marginBottom: 0 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachFile />
                          დოკუმენტების მიმაგრება
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>ინვოისი</Typography>
                              <input
                                type="file"
                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                                onChange={(e) => setFiles({...files, invoice_file: e.target.files[0]})}
                                style={{ width: '100%' }}
                              />
                              {files.invoice_file && (
                                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                                  ✓ არჩეული: {files.invoice_file.name}
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>ხელშეკრულება</Typography>
                              <input
                                type="file"
                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                                onChange={(e) => setFiles({...files, contract_file: e.target.files[0]})}
                                style={{ width: '100%' }}
                              />
                              {files.contract_file && (
                                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                                  ✓ არჩეული: {files.contract_file.name}
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>მიღება-ჩაბარება</Typography>
                              <input
                                type="file"
                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                                onChange={(e) => setFiles({...files, handover_file: e.target.files[0]})}
                                style={{ width: '100%' }}
                              />
                              {files.handover_file && (
                                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                                  ✓ არჩეული: {files.handover_file.name}
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 1, mb: 1, width: '100%' }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 3, marginBottom: 0 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Receipt />
                          ფრიზზე წარწერა
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2} sx={{display: 'flex', gap: 2, flexDirection: 'column'}}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="ფრიზზე წარწერა ქართულად"
                              multiline
                              rows={2}
                              value={formData.Frieze_inscription_geo}
                              onChange={(e) => setFormData({...formData, Frieze_inscription_geo: e.target.value})}
                              placeholder="შეიყვანეთ ქართული წარწერა ფრიზისთვის"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="ფრიზზე წარწერა ინგლისურად"
                              multiline
                              rows={2}
                              value={formData.Frieze_inscription_eng}
                              onChange={(e) => setFormData({...formData, Frieze_inscription_eng: e.target.value})}
                              placeholder="Enter text for frieze inscription in English"
                            />
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 1, mb: 1, width: '100%' }}>
                    <TextField
                      fullWidth
                      label="შენიშვნები"
                      multiline
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </Grid>
                </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    {editingParticipant ? 'განახლება' : 'დამატება'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingParticipant(null);
                      resetForm();
                    }}
                    color="error"
                  >
                    გაუქმება
                  </Button>
                </Box>
              </form>
            </Paper>
          )}

          {/* მონაწილეების სია */}
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {filteredParticipants.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                {participants.length === 0 ? (
                  <Box>
                    <Group sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      ამ ივენთზე მონაწილეები ჯერ არ არის რეგისტრირებული
                    </Typography>
                    {isAuthorizedForManagement && (
                      <Typography variant="body2" color="text.secondary">
                        მონაწილის დამატებისთვის გამოიყენეთ ზემოთ მოცემული ღილაკი
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Search sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      ფილტრის შედეგად მონაწილეები ვერ მოიძებნა
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      შეცვალეთ ძიების პარამეტრები ან გაასუფთავეთ ფილტრები
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { background: '#e6e6e6ff', color: '#000000ff', fontWeight: 600 } }}>
                      <TableCell>კომპანია</TableCell>
                      <TableCell align="center">სტენდი</TableCell>
                      <TableCell align="center">კატეგორია</TableCell>
                      <TableCell align="center">ტიპი</TableCell>
                      <TableCell align="center">სტატუსი</TableCell>
                      <TableCell align="center">გადახდა</TableCell>
                      <TableCell align="center">ქმედება</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredParticipants.map(participant => {
                      const statusBadge = getStatusBadge(participant.registration_status);
                      const paymentBadge = getPaymentBadge(participant.payment_status);

                      return (
                        <TableRow
                          key={participant.id}
                          sx={{
                            '&:hover': {
                              backgroundColor: '#f8fafc',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <TableCell component="th" scope="row">
                            <Box display={'flex'} alignItems="center" gap={2}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                                {participant.company_name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={participant.country}
                                  size="small"
                                  sx={{ bgcolor: '#f3f4f6', color: '#374151', fontSize: '0.7rem', height: '20px', width: '100px',
                                    '& .MuiChip-label': { mr: 0.5, textTransform: 'uppercase', fontWeight: 500 }}}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 0.5 }}>
                                {participant.booth_number && (
                                  <Chip
                                    label={`#${participant.booth_number}`}
                                    size="small"
                                    sx={{
                                      bgcolor: '#dbeafe',
                                      color: '#1e40af',
                                      fontSize: '0.7rem',
                                      height: '20px'
                                    }}
                                  />
                                )}
                                {participant.booth_size && (
                                  <Typography variant="caption" color="text.primary">
                                    {participant.booth_size}მ²
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                participant.booth_category === 'ოქტანორმის სტენდები' ? 'ოქტანორმი' :
                                participant.booth_category === 'ინდივიდუალური სტენდები' ? 'ინდივიდ.' :
                                participant.booth_category === 'ტენტი' ? 'ტენტი' :
                                participant.booth_category === 'მარკიზიანი დახლი' ? 'მარკიზია' :
                                participant.booth_category || 'არ არის'
                              }
                              size="small"
                              sx={{
                                bgcolor: '#fef3c7',
                                color: '#92400e',
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                participant.booth_type === 'რიგითი' ? 'რიგითი' :
                                participant.booth_type === 'კუთხის' ? 'კუთხის' :
                                participant.booth_type === 'ნახევარ კუნძული' ? 'ნახ.კუნძ.' :
                                participant.booth_type === 'კუნძული' ? 'კუნძული' :
                                participant.booth_type || 'არ არის'
                              }
                              size="small"
                              sx={{
                                bgcolor: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={statusBadge.text}
                              size="small"
                              color={statusBadge.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={paymentBadge.text}
                              size="small"
                              color={paymentBadge.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="კომპანიის დეტალები">
                                <IconButton
                                  size="small"
                                  onClick={() => showCompanyDetailsModal(participant)}
                                  disabled={loadingCompanyDetails}
                                  sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}
                                >
                                  <Business fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="ინვოისის გენერაცია">
                                <IconButton
                                  size="small"
                                  onClick={() => handleGenerateInvoice(participant)}
                                  sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}
                                >
                                  <Receipt fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              {/* ფაილების ლინკები */}
                              {participant.invoice_file && (
                                <Tooltip title="ინვოისი">
                                  <IconButton
                                    component="a"
                                    href={participant.invoice_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                    sx={{ color: '#059669' }}
                                  >
                                    <AttachFile fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {isAuthorizedForManagement && (
                                <>
                                  <Tooltip title="რედაქტირება">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEdit(participant)}
                                                  sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="წაშლა">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDelete(participant.id)}
                                                  sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}

                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Container>
      </DialogContent>

      {/* კომპანიის დეტალების მოდალი */}
      <Dialog
        open={showCompanyDetails}
        onClose={() => setShowCompanyDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business />
              {selectedCompanyForDetails?.company_name} - დეტალური ინფორმაცია
            </Box>
            <IconButton
              onClick={() => setShowCompanyDetails(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3}}>
          {selectedCompanyForDetails && (
            <Grid container spacing={3} display={'flex'} alignItems={'flex-start'}>
              <Grid item xs={12} display={'flex'} alignItems={'start-end'} justifyContent={'center'} flexDirection={'column'}>
                <Typography variant="h6" gutterBottom>ძირითადი ინფორმაცია</Typography>
                <Grid container spacing={2} display={'flex'} alignItems={'start-end'  } justifyContent={'center'} flexDirection={'column'}>
                  <Grid item xs={6} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography><strong>კომპანიის დასახელება:</strong> {selectedCompanyForDetails.company_name}</Typography>
                  </Grid>
                  <Grid item xs={6} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography><strong>საიდენტიფიკაციო კოდი:</strong> {selectedCompanyForDetails.identification_code}</Typography>
                  </Grid>
                  <Grid item xs={6} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography><strong>ქვეყანა:</strong> {selectedCompanyForDetails.country}</Typography>
                  </Grid>
                  <Grid item xs={6} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography><strong>სტატუსი:</strong></Typography>
                      <Chip
                        label={selectedCompanyForDetails.status || 'აქტიური'}
                        size="small"
                        color={selectedCompanyForDetails.status === 'აქტიური' ? 'success' : 'default'}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography><strong>კომპანიის პროფილი:</strong> {selectedCompanyForDetails.company_profile || 'არ არის მითითებული'}</Typography>
                  </Grid>
                  <Grid item xs={12} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography><strong>იურიდიული მისამართი:</strong> {selectedCompanyForDetails.legal_address || 'არ არის მითითებული'}</Typography>
                  </Grid>
                  <Grid item xs={12} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                    <Typography>
                      <strong>ვებგვერდი:</strong>
                      {selectedCompanyForDetails.website ? (
                        <Button
                          component="a"
                          href={`http://${selectedCompanyForDetails.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          {selectedCompanyForDetails.website}
                        </Button>
                      ) : (
                        ' არ არის მითითებული'
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {selectedCompanyForDetails.comment && (
                <Grid item xs={12} borderBottom={1} borderColor={'#b8ceebff'} pb={1} mb={2}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>კომენტარი</Typography>
                  <Alert severity="info">
                    {selectedCompanyForDetails.comment}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>საკონტაქტო პირები</Typography>

                {/* Debug info - remove this in production */}
                {process.env.NODE_ENV === 'development' && (
                  <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="caption" component="pre">
                      Debug: contact_persons = {JSON.stringify(selectedCompanyForDetails.contact_persons, null, 2)}
                    </Typography>
                  </Box>
                )}

                {selectedCompanyForDetails.contact_persons &&
                  Array.isArray(selectedCompanyForDetails.contact_persons) &&
                  selectedCompanyForDetails.contact_persons.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedCompanyForDetails.contact_persons
                        .filter(person => person && (person.name || person.position || person.phone || person.email))
                        .map((person, index) => (
                          <Grid item xs={12} md={6} key={index}>
                            <Card variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {person.name || 'უცნობი'}
                              </Typography>
                              <Stack spacing={1} sx={{ mt: 1 }}>
                                {person.position && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Person fontSize="small" />
                                    <Typography variant="body2">{person.position}</Typography>
                                  </Box>
                                )}
                                {person.phone && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Phone fontSize="small" />
                                    <Typography variant="body2">
                                      <Button component="a" href={`tel:${person.phone}`} size="small">
                                        {person.phone}
                                      </Button>
                                    </Typography>
                                  </Box>
                                )}
                                {person.email && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Email fontSize="small" />
                                    <Typography variant="body2">
                                      <Button component="a" href={`mailto:${person.email}`} size="small">
                                        {person.email}
                                      </Button>
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  ) : (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        საკონტაქტო პირები არ არის დამატებული
                      </Alert>

                      {/* Show company general contact info if available */}
                      {(selectedCompanyForDetails.company_phone || selectedCompanyForDetails.company_email) && (
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            კომპანიის ზოგადი საკონტაქტო ინფორმაცია:
                          </Typography>
                          <Stack spacing={1}>
                            {selectedCompanyForDetails.company_phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone fontSize="small" />
                                <Typography variant="body2">
                                  <Button component="a" href={`tel:${selectedCompanyForDetails.company_phone}`} size="small">
                                    {selectedCompanyForDetails.company_phone}
                                  </Button>
                                </Typography>
                              </Box>
                            )}
                            {selectedCompanyForDetails.company_email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Email fontSize="small" />
                                <Typography variant="body2">
                                  <Button component="a" href={`mailto:${selectedCompanyForDetails.company_email}`} size="small">
                                    {selectedCompanyForDetails.company_email}
                                  </Button>
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Card>
                      )}
                    </Box>
                  )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* ინვოისის ფორმა */}
      {showInvoiceForm && selectedParticipantForInvoice && (
        <InvoiceForm
          participant={selectedParticipantForInvoice}
          eventData={exhibitionData}
          onClose={closeInvoiceForm}
          showNotification={showNotification}
        />
      )}

      {/* მოსაწვევების გენერაცია */}
      {showInvitationGenerator && (
        <InvitationGenerator
          eventData={eventDetails || {}}
          participants={filteredParticipants}
          onClose={() => setShowInvitationGenerator(false)}
          showNotification={showNotification}
        />
      )}
    </Dialog>
  );
};

export default EventParticipants;