import React, { useState, useEffect } from 'react';
import './EventParticipants.css';
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
    invoice_number: ''
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
  const [selectedPackages, setSelectedPackages] = useState([]); // Changed to array for multiple packages
  const [registrationType, setRegistrationType] = useState('individual'); // 'individual' or 'package'
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

      // Try event details first as exhibition might be embedded there
      const eventResponse = await fetch(`/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        console.log('Event data received:', eventData);
        
        // If event has exhibition_id, try to fetch exhibition separately
        if (eventData.exhibition_id) {
          try {
            const exhibitionResponse = await fetch(`/api/exhibitions/${eventData.exhibition_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (exhibitionResponse.ok) {
              const exhibitionData = await exhibitionResponse.json();
              setExhibitionData(exhibitionData);
            } else {
              // If exhibition endpoint fails, use event data as fallback
              setExhibitionData(eventData);
            }
          } catch (exhibitionError) {
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
  }, [eventDetails]);

  // Handle equipment loading when packages change
  useEffect(() => {
    if (registrationType === 'package' && selectedPackages.length > 0) {
      console.log('Updating equipment from packages:', selectedPackages);
      updateEquipmentFromPackages(selectedPackages);
    }
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
      // Calculate total area and price from all selected packages
      const totalArea = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_area_sqm) return sum;
        return sum + (parseFloat(pkg.package.fixed_area_sqm) * parseInt(pkg.quantity || 1));
      }, 0);

      const totalPackagePrice = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
        const packagePrice = parseFloat(pkg.package.fixed_price);
        return sum + (packagePrice * parseInt(pkg.quantity || 1));
      }, 0);

      // Calculate additional equipment cost
      const additionalEquipmentCost = selectedEquipment.reduce((sum, item) => {
        const quantity = parseInt(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;

        // Check if this equipment is included in any selected package
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

      const totalAmount = totalPackagePrice + additionalEquipmentCost;

      setFormData(prev => ({
        ...prev,
        booth_size: totalArea.toString(),
        payment_amount: totalAmount.toFixed(2)
      }));
      return;
    }

    // Individual registration calculation
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

    // ყველა ფასი უკვე შეიცავს 18% დღგ-ს
    const finalAmount = calculatedAmount;

    console.log(`ჯამური თანხა: სტენდი ${boothTotal} + აღჭურვილობა ${equipmentTotal} = ${calculatedAmount} (უკვე შეიცავს 18% დღგ-ს)`);

    setFormData(prev => ({
      ...prev,
      payment_amount: finalAmount.toFixed(2)
    }));
  }, [formData.booth_size, manualPricePerSqm, equipmentTotal, registrationType, selectedPackages]);

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

  const fetchParticipantEquipment = async (participantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/participants/${participantId}/equipment-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const equipment = data.map(booking => ({
          equipment_id: booking.equipment_id,
          code_name: booking.code_name,
          quantity: booking.quantity,
          unit_price: booking.unit_price,
          total_price: booking.total_price
        }));
        setSelectedEquipment(equipment);
      }
    } catch (error) {
      console.error('მონაწილის აღჭურვილობის მიღების შეცდომა:', error);
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
        } catch (parseError) {
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
      // Ensure all required data is loaded first
      if (!exhibitionData) {
        await fetchExhibitionData();
      }
      if (eventDetails?.exhibition_id && availablePackages.length === 0) {
        await fetchAvailablePackages();
      }
      
      // Wait for equipment data to be available
      if (availableEquipment.length === 0) {
        await fetchAvailableEquipment();
      }

      // Wait a bit more to ensure all data is loaded
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch participant equipment separately to ensure we get the latest data
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

      // Calculate equipment total for price calculation
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

      // Set form data
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
        invoice_number: participant.invoice_number || ''
      });

      console.log('Setting form data with booth info:', {
        booth_category: participant.booth_category,
        booth_type: participant.booth_type
      });

      if (isPackage) {
        // Load participant's packages if any
        const participantPackages = participant.selected_packages || [];
        console.log('Loading packages for edit:', participantPackages);
        setSelectedPackages(participantPackages);
        
        // Equipment will be loaded automatically via useEffect when packages change
        
      } else {
        // Clear packages for individual registration
        setSelectedPackages([]);
        
        // For individual registrations, load existing equipment bookings FIRST
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

        // Wait for equipment to be set in state
        await new Promise(resolve => setTimeout(resolve, 100));

        // NOW calculate manual price per sqm for individual registrations AFTER setting equipment
        if (participant.booth_size && participant.payment_amount) {
          const boothSize = parseFloat(participant.booth_size);
          const totalAmount = parseFloat(participant.payment_amount);
          
          // Recalculate equipment total from the actual loaded equipment
          const actualEquipmentTotal = equipment.reduce((sum, eq) => {
            const qty = parseInt(eq.quantity) || 0;
            const price = parseFloat(eq.unit_price) || 0;
            return sum + (qty * price);
          }, 0);
          
          const boothCost = Math.max(0, totalAmount - actualEquipmentTotal);
          
          if (boothSize > 0) {
            const pricePerSqm = (boothCost / boothSize).toFixed(2);
            console.log('Calculated price per sqm:', pricePerSqm, 'from booth cost:', boothCost, 'booth size:', boothSize, 'total amount:', totalAmount, 'equipment total:', actualEquipmentTotal);
            setManualPricePerSqm(pricePerSqm);
          } else {
            setManualPricePerSqm('');
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

    setTimeout(() => {
      const formElement = document.querySelector('.participant-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
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
      invoice_number: ''
    });
    setFiles({
      invoice_file: null,
      contract_file: null,
      handover_file: null
    });
    // Clear equipment and packages completely
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

  // New function to handle multiple package selection
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

    // Ensure the package object exists at the index
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
      // If no packages, keep existing additional equipment only
      const additionalEquipment = selectedEquipment.filter(eq => {
        // Check if this equipment is NOT from any package
        return !packages.some(pkg => 
          pkg?.package?.equipment_list?.some(pkgEq => 
            pkgEq?.equipment_id === parseInt(eq.equipment_id)
          )
        );
      });
      setSelectedEquipment(additionalEquipment);
      return;
    }

    // Store current additional equipment (not from packages)
    const currentAdditionalEquipment = selectedEquipment.filter(eq => {
      // Check if this equipment is additional (quantity > package quantity)
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

    // Aggregate equipment from all selected packages
    const packageEquipmentMap = new Map();

    packages.forEach(pkg => {
      if (pkg && pkg.package && Array.isArray(pkg.package.equipment_list)) {
        pkg.package.equipment_list.forEach(eq => {
          if (eq && eq.equipment_id) {
            const key = eq.equipment_id;
            const packageQuantity = parseInt(pkg.quantity) || 1;
            const equipmentQuantity = parseInt(eq.quantity) || 0;
            const totalQuantity = equipmentQuantity * packageQuantity;

            // Find the equipment in available equipment to get current prices
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

    // Convert package equipment to array
    const packageEquipment = Array.from(packageEquipmentMap.values()).map(eq => ({
      ...eq,
      total_price: (eq.quantity || 0) * (eq.unit_price || 0)
    }));

    // Merge package equipment with existing additional equipment
    const mergedEquipment = [...packageEquipment];
    
    // Add back additional equipment that's not covered by packages
    currentAdditionalEquipment.forEach(addEq => {
      const existingIndex = mergedEquipment.findIndex(eq => 
        parseInt(eq.equipment_id) === parseInt(addEq.equipment_id)
      );
      
      if (existingIndex >= 0) {
        // Update quantity to include additional
        const packageQty = mergedEquipment[existingIndex].quantity || 0;
        const additionalQty = parseInt(addEq.quantity) || 0;
        mergedEquipment[existingIndex].quantity = Math.max(packageQty, additionalQty);
        mergedEquipment[existingIndex].total_price = 
          mergedEquipment[existingIndex].quantity * mergedEquipment[existingIndex].unit_price;
      } else {
        // Add completely additional equipment
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

      if (companyData.contact_persons) {
        if (Array.isArray(companyData.contact_persons)) {
          companyData.contact_persons = companyData.contact_persons;
        } else if (typeof companyData.contact_persons === 'string') {
          try {
            if (companyData.contact_persons === '[object Object]') {
              companyData.contact_persons = [];
            } else {
              companyData.contact_persons = JSON.parse(companyData.contact_persons);
            }
          } catch (parseError) {
            console.error('Contact persons parsing error:', parseError);
            companyData.contact_persons = [];
          }
        } else {
          companyData.contact_persons = [];
        }
      } else {
        companyData.contact_persons = [];
      }

      if (!Array.isArray(companyData.contact_persons)) {
        companyData.contact_persons = [];
      }

      setSelectedCompanyForDetails(companyData);
      setShowCompanyDetails(true);
    } catch (error) {
      console.error('კომპანიის დეტალების მიღება ვერ მოხერხდა', error);
      showNotification('კომპანიის დეტალების მიღება ვერ მოხერხდა', 'error');
    } finally {
      setLoadingCompanyDetails(false);
    }
  };

  const showCompanyDetailsModal = async (participant) => {
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
      'მონაწილეობის მოთხოვნა': 'requested',
      'მომლოდინე': 'pending',
      'რეგისტრირებული': 'registered',
      'დადასტურებული': 'confirmed',
      'გაუქმებული': 'cancelled'
    };
    return statusMap[status] || 'pending';
  };

  const getPaymentBadge = (status) => {
    const statusMap = {
      'მომლოდინე': 'pending',
      'გადახდილი': 'paid',
      'არ არის საჭიროო': 'not-required'
    };
    return statusMap[status] || 'pending';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Date formatting error:", e);
      return dateString;
    }
  };

  if (loading) return <div>იტვირთება...</div>;

  return (
    <div className="event-participants-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{eventName} - მონაწილეები ({filteredParticipants.length} / {participants.length})</h3>
          <button
            type="button"
            className="modal-close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="participants-filters">
            <div className="search-row">
              <div className="search-group">
                <input
                  type="text"
                  placeholder="ძიება კომპანიის სახელით, კოდით ან კონტაქტით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <button
                className="reset-filters-btn"
                onClick={resetFilters}
                title="ფილტრების გასუფთავება"
              >
                ↻
              </button>
            </div>

            <div className="filters-row">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა სტატუსი</option>
                <option value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</option>
                <option value="მომლოდინე">მომლოდინე</option>
                <option value="რეგისტრირებული">რეგისტრირებული</option>
                <option value="დადასტურებული">დადასტურებული</option>
                <option value="გაუქმებული">გაუქმებული</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა გადახდა</option>
                <option value="მომლოდინე">მომლოდინე</option>
                <option value="გადახდილი">გადახდილი</option>
                <option value="არ არის საჭიროო">არ არის საჭიროო</option>
              </select>

              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა ქვეყანა</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="filters-row">
              <select
                value={boothCategoryFilter}
                onChange={(e) => setBoothCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა კატეგორია</option>
                {boothCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={boothTypeFilter}
                onChange={(e) => setBoothTypeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა ტიპი</option>
                {boothTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {isAuthorizedForManagement && (
            <div className="participants-actions">
              <button
                className="add-participant-btn"
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
              >
                ახალი მონაწილის დამატება
              </button>

              {filteredParticipants.length > 0 && (
                <button
                  className="invitation-generator-btn"
                  onClick={() => setShowInvitationGenerator(true)}
                >
                  QR მოსაწვევების გენერაცია
                </button>
              )}
            </div>
          )}

          {showAddForm && isAuthorizedForManagement && (
            <div className="participant-form">
              <h4>{editingParticipant ? 'მონაწილის რედაქტირება' : 'ახალი მონაწილის დამატება'}</h4>
              <form onSubmit={handleSubmit} className="participant-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>კომპანია *</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      required
                    >
                      <option value="">აირჩიეთ კომპანია</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.company_name} ({company.country})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* სტენდის ინფორმაცია */}
                <div className="booth-information-section">
                  <h4 className="section-title">სტენდის ინფორმაცია</h4>
                  
                  <div className="form-group">
                    <label>რეგისტრაციის ტიპი</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          value="individual"
                          checked={registrationType === 'individual'}
                          onChange={(e) => handleRegistrationTypeChange(e.target.value)}
                        />
                        ინდივიდუალური კონფიგურაცია
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          value="package"
                          checked={registrationType === 'package'}
                          onChange={(e) => handleRegistrationTypeChange(e.target.value)}
                        />
                        პაკეტების არჩევა
                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>სტენდების კატეგორია</label>
                      <select
                        value={formData.booth_category}
                        onChange={(e) => setFormData(prev => ({ ...prev, booth_category: e.target.value }))}
                        required
                      >
                        {boothCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>სტენდის ტიპი</label>
                      <select
                        value={formData.booth_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, booth_type: e.target.value }))}
                        required
                      >
                        {boothTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>სტენდის ნომერი</label>
                      <input
                        type="text"
                        value={formData.booth_number}
                        onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>სტენდის ზომა (კვმ)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.booth_size}
                        onChange={(e) => setFormData(prev => ({ ...prev, booth_size: e.target.value }))}
                        disabled={registrationType === 'package'}
                        required
                      />
                      {registrationType === 'package' && (
                        <small className="field-note">პაკეტების ფართობი ავტომატურად განისაზღვრება</small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>ფასი კვმ-ზე (EUR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualPricePerSqm}
                        onChange={(e) => setManualPricePerSqm(e.target.value)}
                        disabled={registrationType === 'package'}
                        placeholder="შეიყვანეთ ფასი კვმ-ზე"
                      />
                      {registrationType === 'package' && (
                        <small className="field-note">პაკეტებისთვის ფასი ფიქსირებულია</small>
                      )}
                    </div>
                  </div>

                  {/* აღჭურვილობის არჩევა */}
                  <div className="equipment-selection">
                    <div className="equipment-header">
                      <h4>
                        {registrationType === 'package' 
                          ? 'პაკეტების აღჭურვილობა + დამატებითი' 
                          : 'აღჭურვილობის არჩევა'
                        }
                      </h4>
                      <button
                        type="button"
                        onClick={addEquipmentRow}
                        className="add-equipment-btn"
                      >
                        + აღჭურვილობის დამატება
                      </button>
                      <small style={{color: '#666', marginLeft: '10px'}}>
                        ხელმისაწვდომი: {availableEquipment.length} ცალი
                      </small>
                    </div>

                    {registrationType === 'package' && selectedPackages.length > 0 && (
                      <div className="package-equipment-info">
                        <h5>პაკეტებში შემავალი აღჭურვილობა (უფასო):</h5>
                        {selectedPackages.map((pkg, pkgIndex) => (
                          pkg.package && pkg.package.equipment_list && pkg.package.equipment_list.length > 0 && (
                            <div key={pkgIndex} className="package-equipment-group">
                              <h6>{pkg.package.package_name} (× {pkg.quantity}):</h6>
                              <ul className="base-equipment-list">
                                {pkg.package.equipment_list.map((eq, idx) => (
                                  <li key={idx}>
                                    {eq.code_name} - {eq.quantity} × {pkg.quantity} = {eq.quantity * pkg.quantity} ცალი
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {selectedEquipment.map((item, index) => (
                      <div key={index} className="equipment-item">
                        <div className="form-row">
                          <div className="form-group">
                            <label>აღჭურვილობა</label>
                            <select
                              value={item.equipment_id || ''}
                              onChange={(e) => handleEquipmentChange(index, 'equipment_id', e.target.value)}
                            >
                              <option value="">აირჩიეთ აღჭურვილობა</option>
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
                                      displayText = `${equipment.code_name} (პაკეტებში: ${totalPackageQuantity} უფასო, სულ ხელმისაწვდომი: ${availableQty}, ფასი: €${equipment.price || 0})`;
                                    } else {
                                      displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: EUR${equipment.price || 0})`;
                                    }
                                  } else {
                                    displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: EUR${equipment.price || 0})`;
                                  }

                                  return (
                                    <option key={equipment.id} value={equipment.id}>
                                      {displayText}
                                    </option>
                                  );
                                })
                              ) : (
                                <option value="" disabled>აღჭურვილობა იტვირთება...</option>
                              )}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>რაოდენობა</label>
                            <input
                              type="number"
                              min="0"
                              max={item.available_quantity || 999}
                              value={item.quantity}
                              onChange={(e) => handleEquipmentChange(index, 'quantity', e.target.value)}
                              style={{
                                borderColor: item.available_quantity === 0 ? '#ff4444' : 
                                           parseInt(item.quantity) > item.available_quantity ? '#ff4444' : 
                                           '#ddd'
                              }}
                              required
                            />
                            {(() => {
                              if (registrationType === 'package' && selectedPackages.length > 0) {
                                let totalPackageQuantity = 0;
                                selectedPackages.forEach(pkg => {
                                  if (pkg && pkg.package && Array.isArray(pkg.package.equipment_list)) {
                                    const packageItem = pkg.package.equipment_list.find(
                                      pkgEq => pkgEq && pkgEq.equipment_id === parseInt(item.equipment_id)
                                    );
                                    if (packageItem) {
                                      const pkgQty = parseInt(pkg.quantity || 1);
                                      const equipQty = parseInt(packageItem.quantity || 0);
                                      totalPackageQuantity += equipQty * pkgQty;
                                    }
                                  }
                                });

                                if (totalPackageQuantity > 0) {
                                  const currentQuantity = parseInt(item.quantity) || 0;
                                  const paidQuantity = Math.max(0, currentQuantity - totalPackageQuantity);
                                  return (
                                    <small style={{color: '#059669'}}>
                                      უფასო: {Math.min(currentQuantity, totalPackageQuantity)}, გადასახდელი: {paidQuantity}
                                    </small>
                                  );
                                }
                              }

                              if (item.available_quantity === 0) {
                                return <small style={{color: '#ff4444'}}>ამოწურულია</small>;
                              } else if (parseInt(item.quantity) > item.available_quantity) {
                                return <small style={{color: '#ff4444'}}>მაქს: {item.available_quantity}</small>;
                              } else {
                                return <small>ხელმისაწვდომი: {item.available_quantity}</small>;
                              }
                            })()}
                          </div>
                          <div className="form-group">
                            <label>ერთეულის ფასი EUR</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleEquipmentChange(index, 'unit_price', e.target.value)}
                              readOnly={registrationType === 'package' && selectedPackages.some(pkg => 
                                pkg.package?.equipment_list?.some(pkgEq => pkgEq.equipment_id === parseInt(item.equipment_id))
                              )}
                            />
                          </div>
                          <div className="form-group">
                            <label>ჯამი EUR</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.total_price ? (typeof item.total_price === 'number' ? item.total_price.toFixed(2) : parseFloat(item.total_price || 0).toFixed(2)) : (0).toFixed(2)}
                              readOnly
                            />
                          </div>
                          <div className="form-group">
                            <button
                              type="button"
                              className="remove-equipment-btn"
                              onClick={() => removeEquipmentItem(index)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedEquipment.length > 0 && (
                      <div className="equipment-total">
                        <strong>აღჭურვილობის ჯამური ღირებულება: €{equipmentTotal.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Multiple Package Selection */}
                {registrationType === 'package' && (
                  <div className="packages-selection">
                    <div className="packages-header">
                      <h4>პაკეტების არჩევა</h4>
                      <button
                        type="button"
                        onClick={addPackageSelection}
                        className="add-package-btn"
                      >
                        + პაკეტის დამატება
                      </button>
                    </div>

                    {selectedPackages.map((packageSelection, index) => (
                      <div key={index} className="package-selection-row">
                        <div className="form-row">
                          <div className="form-group">
                            <label>პაკეტი</label>
                            <select
                              value={packageSelection.package_id || ''}
                              onChange={(e) => handlePackageChange(index, 'package_id', e.target.value)}
                              required
                            >
                              <option value="">აირჩიეთ პაკეტი</option>
                              {availablePackages.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.package_name} - {pkg.fixed_area_sqm}კვმ - EUR{pkg.fixed_price}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>რაოდენობა</label>
                            <input
                              type="number"
                              min="1"
                              value={packageSelection.quantity}
                              onChange={(e) => handlePackageChange(index, 'quantity', e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <button
                              type="button"
                              className="remove-package-btn"
                              onClick={() => removePackageSelection(index)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {packageSelection.package && (
                          <div className="package-preview">
                            <h5>პაკეტის დეტალები:</h5>
                            <p><strong>სახელი:</strong> {packageSelection.package.package_name}</p>
                            <p><strong>ფართობი:</strong> {packageSelection.package.fixed_area_sqm} კვმ × {packageSelection.quantity} = {packageSelection.package.fixed_area_sqm * packageSelection.quantity} კვმ</p>
                            <p><strong>ღირებულება:</strong> EUR{packageSelection.package.fixed_price} × {packageSelection.quantity} = EUR{packageSelection.package.fixed_price * packageSelection.quantity}</p>
                            {packageSelection.package.description && (
                              <p><strong>აღწერა:</strong> {packageSelection.package.description}</p>
                            )}

                            {packageSelection.package.equipment_list && packageSelection.package.equipment_list.length > 0 && (
                              <div className="package-equipment-preview">
                                <h6>შემავალი აღჭურვილობა (× {packageSelection.quantity}):</h6>
                                <ul>
                                  {packageSelection.package.equipment_list.map((eq, idx) => (
                                    <li key={idx}>
                                      {eq.code_name} - {eq.quantity} × {packageSelection.quantity} = {eq.quantity * packageSelection.quantity} ცალი
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedPackages.length > 0 && (
                      <div className="packages-summary">
                        <h5>პაკეტების ჯამი:</h5>
                        <p><strong>ჯამური ფართობი:</strong> {selectedPackages.reduce((sum, pkg) => {
                          if (!pkg || !pkg.package || !pkg.package.fixed_area_sqm) return sum;
                          return sum + (parseFloat(pkg.package.fixed_area_sqm) * parseInt(pkg.quantity || 1));
                        }, 0)} კვმ</p>
                        <p><strong>ჯამური ღირებულება:</strong> EUR{selectedPackages.reduce((sum, pkg) => {
                          if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
                          return sum + (parseFloat(pkg.package.fixed_price) * parseInt(pkg.quantity || 1));
                        }, 0)}</p>
                      </div>
                    )}
                  </div>
                )}

                

                {editingParticipant && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>რეგისტრაციის სტატუსი</label>
                      <select
                        value={formData.registration_status}
                        onChange={(e) => setFormData({...formData, registration_status: e.target.value})}
                      >
                        <option value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</option>
                        <option value="რეგისტრირებული">რეგისტრირებული</option>
                        <option value="დადასტურებული">დადასტურებული</option>
                        <option value="გაუქმებული">გაუქმებული</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>გადახდის სტატუსი</label>
                      <select
                        value={formData.payment_status}
                        onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                      >
                        <option value="მომლოდინე">მომლოდინე</option>
                        <option value="გადახდილი">გადახდილი</option>
                        <option value="არ არის საჭიროო">არ არის საჭიროო</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>გადასახდელი თანხა EUR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                      readOnly
                    />
                    <div className="payment-breakdown">
                      {registrationType === 'package' && selectedPackages.length > 0 ? (
                        <>
                          <small>პაკეტები: EUR{selectedPackages.reduce((sum, pkg) => {
                            if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
                            return sum + (parseFloat(pkg.package.fixed_price) * parseInt(pkg.quantity || 1));
                          }, 0)}</small>
                          <small>დამატებითი აღჭურვილობა: EUR{selectedEquipment.reduce((sum, item) => {
                            // Calculate additional equipment cost
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
                          }, 0).toFixed(2)}</small>
                        </>
                      ) : (
                        <>
                          {formData.booth_size && manualPricePerSqm && (
                            <small>სტენდი: EUR{(parseFloat(formData.booth_size || 0) * parseFloat(manualPricePerSqm || 0)).toFixed(2)}</small>
                          )}
                          <small>აღჭურვილობა: EUR{equipmentTotal.toFixed(2)}</small>
                        </>
                      )}
                      <small><strong><br/>სულ: EUR{formData.payment_amount}</strong></small>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>გადახდის ვადა</label>
                    <input
                      type="date"
                      value={formData.payment_due_date}
                      onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>გადახდის მეთოდი</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    >
                      <option value="">აირჩიეთ მეთოდი</option>
                      <option value="ბანკის გადარიცხვა">ბანკის გადარიცხვა</option>
                      <option value="ნაღდი">ნაღდი</option>
                      <option value="საბანკო ბარათი">საბანკო ბარათი</option>
                      <option value="ონლაინ გადახდა">ონლაინ გადახდა</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ინვოისის ნომერი</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                    />
                  </div>
                </div>

                

                <div className="files-section">
                  <h4>დოკუმენტების მიმაგრება</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="invoice-file">ინვოისი (PDF ან Excel)</label>
                      <input
                        id="invoice-file"
                        type="file"
                        accept=".pdf,.xlsx,.xls,.doc,.docx"
                        onChange={(e) => setFiles({...files, invoice_file: e.target.files[0]})}
                        className="file-input"
                        style={{display: 'block', width: '100%'}}
                      />
                      {files.invoice_file && (
                        <div className="file-info">
                          ✓ არჩეული: {files.invoice_file.name}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="contract-file">ხელშეკრულება (PDF ან Excel)</label>
                      <input
                        id="contract-file"
                        type="file"
                        accept=".pdf,.xlsx,.xls,.doc,.docx"
                        onChange={(e) => setFiles({...files, contract_file: e.target.files[0]})}
                        className="file-input"
                        style={{display: 'block', width: '100%'}}
                      />
                      {files.contract_file && (
                        <div className="file-info">
                          ✓ არჩეული: {files.contract_file.name}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="handover-file">მიღება-ჩაბარება (PDF ან Excel)</label>
                      <input
                        id="handover-file"
                        type="file"
                        accept=".pdf,.xlsx,.xls,.doc,.docx"
                        onChange={(e) => setFiles({...files, handover_file: e.target.files[0]})}
                        className="file-input"
                        style={{display: 'block', width: '100%'}}
                      />
                      {files.handover_file && (
                        <div className="file-info">
                          ✓ არჩეული: {files.handover_file.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>შენიშვნები</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {editingParticipant ? 'განახლება' : 'დამატება'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAddForm(false);
                      setEditingParticipant(null);
                      resetForm();
                    }}
                  >
                    გაუქმება
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="participants-list">
            {filteredParticipants.length === 0 ? (
              participants.length === 0 ? (
                <div className="no-participants">
                  <p>ამ ივენთზე მონაწილეები ჯერ არ არის რეგისტრირებული.</p>
                  {isAuthorizedForManagement && (
                    <p className="hint">მონაწილის დამატებისთვის გამოიყენეთ ზემოთ მოცემული ღილაკი.</p>
                  )}
                </div>
              ) : (
                <div className="no-participants">
                  <p>ფილტრის შედეგად მონაწილეები ვერ მოიძებნა.</p>
                  <p className="hint">შეცვალეთ ძიების პარამეტრები ან გაასუფთავეთ ფილტრები.</p>
                </div>
              )
            ) : (
              <div className="participants-table compact">
                <div className="table-header extended">
                  <div>კომპანია</div>
                  <div>სტენდი</div>
                  <div>კატეგორია</div>
                  <div>ტიპი</div>
                  <div>სტატუსი</div>
                  <div>გადახდა</div>
                  <div>ქმედება</div>
                </div>
                {filteredParticipants.map(participant => (
                  <div key={participant.id} className="table-row compact extended">
                    <div className="company-info" data-label="კომპანია:">
                      <div className="company-main">
                        <strong>{participant.company_name}</strong>
                        <span className="country-tag">{participant.country}</span>
                      </div>
                      <small className="company-code">{participant.identification_code}</small>
                    </div>
                    <div data-label="სტენდი:" className="booth-info">
                      <div className="booth-main">
                        {participant.booth_number && <span className="booth-number">#{participant.booth_number}</span>}
                        {participant.booth_size && <span className="booth-size">{participant.booth_size}მ²</span>}
                      </div>
                      <small className="reg-date">{new Date(participant.registration_date).toLocaleDateString('ka-GE')}</small>
                    </div>
                    <div data-label="კატეგორია:" className="booth-category">
                      <span className="category-badge">
                        {participant.booth_category === 'ოქტანორმის სტენდები' ? 'ოქტანორმი' :
                         participant.booth_category === 'ინდივიდუალური სტენდები' ? 'ინდივიდ.' :
                         participant.booth_category === 'ტენტი' ? 'ტენტი' :
                         participant.booth_category === 'მარკიზიანი დახლი' ? 'მარკიზია' :
                         participant.booth_category || 'არ არის'}
                      </span>
                    </div>
                    <div data-label="ტიპი:" className="booth-type">
                      <span className="type-badge">
                        {participant.booth_type === 'რიგითი' ? 'რიგითი' :
                         participant.booth_type === 'კუთხის' ? 'კუთხის' :
                         participant.booth_type === 'ნახევარ კუნძული' ? 'ნახ.კუნძ.' :
                         participant.booth_type === 'კუნძული' ? 'კუნძული' :
                         participant.booth_type || 'არ არის'}
                      </span>
                    </div>
                    <div data-label="სტატუსი:">
                      <span className={`status-badge ${getStatusBadge(participant.registration_status)} compact`}>
                        {participant.registration_status === 'მონაწილეობის მოთხოვნა' ? 'მოთხოვნა' : 
                         participant.registration_status === 'მომლოდინე' ? 'მომლოდ.' :
                         participant.registration_status === 'რეგისტრირებული' ? 'რეგისტრ.' : 
                         participant.registration_status === 'დადასტურებული' ? 'დადასტ.' : 
                         participant.registration_status}
                      </span>
                    </div>
                    <div data-label="გადახდა:">
                      <span className={`payment-badge ${getPaymentBadge(participant.payment_status)} compact`}>
                        {participant.payment_status === 'მომლოდინე' ? 'მომლოდ.' : 
                         participant.payment_status === 'გადახდილი' ? 'გადახდ.' : 
                         participant.payment_status === 'არ არის საჭიროო' ? 'არ საჭირო' : 
                         participant.payment_status}
                      </span>
                    </div>
                    <div className="participant-actions-compact" data-label="ქმედება:">
                      <div className="action-row">
                        <button
                          className="action-btn details-btn"
                          onClick={() => showCompanyDetailsModal(participant)}
                          disabled={loadingCompanyDetails}
                          title="კომპანიის დეტალები"
                        >
                          📋
                        </button>
                        <button
                          className="action-btn invoice-btn"
                          onClick={() => handleGenerateInvoice(participant)}
                          title="ინვოისის გენერაცია"
                        >
                          🧾
                        </button>
                        <div className="file-links">
                          {participant.invoice_file && (
                            <a href={participant.invoice_file} target="_blank" rel="noopener noreferrer" className="file-link" title="ინვოისი">📄</a>
                          )}
                          {participant.contract_file && (
                            <a href={participant.contract_file} target="_blank" rel="noopener noreferrer" className="file-link" title="ხელშეკრულება">📋</a>
                          )}
                          {participant.handover_file && (
                            <a href={participant.handover_file} target="_blank" rel="noopener noreferrer" className="file-link" title="მიღება-ჩაბარება">📦</a>
                          )}
                        </div>
                      </div>
                      {isAuthorizedForManagement && (
                        <div className="edit-row">
                          <button
                            className="edit-btn compact"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Edit button clicked for participant:', participant);
                              handleEdit(participant);
                            }}
                            type="button"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-btn compact"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(participant.id);
                            }}
                            type="button"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCompanyForDetails && (
        <div className="company-details-modal" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedCompanyForDetails(null);
          }
        }}>
          <div className="company-modal-content">
            <div className="company-modal-header">
              <h3>{selectedCompanyForDetails.company_name} - დეტალური ინფორმაცია</h3>
              <button
                className="modal-close-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedCompanyForDetails(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="company-modal-body">
              <div className="company-info-section">
                <h4>ძირითადი ინფორმაცია</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>კომპანიის დასახელება: </strong>
                    <span>{selectedCompanyForDetails.company_name}</span>
                  </div>
                  <div className="info-item">
                    <strong>საიდენტიფიკაციო კოდი: </strong>
                    <span>{selectedCompanyForDetails.identification_code}</span>
                  </div>
                  <div className="info-item">
                    <strong>ქვეყანა: </strong>
                    <span>{selectedCompanyForDetails.country}</span>
                  </div>
                  <div className="info-item">
                    <strong>სტატუსი: </strong>
                    <span className={`status-indicator ${selectedCompanyForDetails.status === 'აქტიური' ? 'active' : 'archived'}`}>
                      {selectedCompanyForDetails.status || 'აქტიური'}
                    </span>
                  </div>
                  <div className="info-item full-width">
                    <strong>კომპანიის პროფილი: </strong>
                    <span>{selectedCompanyForDetails.company_profile || 'არ არის მითითებული'}</span>
                  </div>
                  <div className="info-item full-width">
                    <strong>იურიდიული მისამართი: </strong>
                    <span>{selectedCompanyForDetails.legal_address || 'არ არის მითითებული'}</span>
                  </div>
                  <div className="info-item">
                    <strong>ვებგვერდი: </strong>
                    {selectedCompanyForDetails.website ? (
                      <a href={`http://${selectedCompanyForDetails.website}`} target="_blank" rel="noopener noreferrer">
                        {selectedCompanyForDetails.website}
                      </a>
                    ) : (
                      <span>არ არის მითითებული</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="comment-section">
                <h4>კომენტარი</h4>
                {selectedCompanyForDetails.comment ? (
                  <div className="comment-text">
                    {selectedCompanyForDetails.comment}
                  </div>
                ) : (
                  <div className="no-comment">
                    კომენტარი არ არის დამატებული
                  </div>
                )}
              </div>

              <div className="contact-persons-section">
                <h4>საკონტაქტო პირები</h4>
                {selectedCompanyForDetails.contact_persons &&
                  Array.isArray(selectedCompanyForDetails.contact_persons) &&
                  selectedCompanyForDetails.contact_persons.length > 0 ? (
                    selectedCompanyForDetails.contact_persons
                      .filter(person => person && (person.name || person.position || person.phone || person.email))
                      .map((person, index) => (
                        <div key={index} className="contact-card">
                          <div className="contact-name">{person.name || 'უცნობი'}</div>
                          <div className="contact-details">
                            {person.position && <div className="contact-detail">👤 {person.position}</div>}
                            {person.phone && <div className="contact-detail">📞 <a href={`tel:${person.phone}`}>{person.phone}</a></div>}
                            {person.email && <div className="contact-detail">✉️ <a href={`mailto:${person.email}`}>{person.email}</a></div>}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="no-contacts">საკონტაქტო პირები არ არის დამატებული</div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoiceForm && selectedParticipantForInvoice && (
        <InvoiceForm
          participant={selectedParticipantForInvoice}
          eventData={exhibitionData}
          onClose={closeInvoiceForm}
          showNotification={showNotification}
        />
      )}

      {showInvitationGenerator && (
        <InvitationGenerator
          eventData={eventDetails || {}}
          participants={filteredParticipants}
          onClose={() => setShowInvitationGenerator(false)}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

export default EventParticipants;