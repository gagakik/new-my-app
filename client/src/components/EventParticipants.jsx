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
  const [formData, setFormData] = useState({
    company_id: '',
    registration_status: 'მონაწილეობის მოთხოვნა',
    payment_status: 'მომლოდინე',
    booth_number: '',
    booth_size: '',
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
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [registrationType, setRegistrationType] = useState('individual'); // 'individual' or 'package'


  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'sales' ||
    userRole === 'manager';

  useEffect(() => {
    fetchParticipants();
    fetchCompanies();
    fetchAvailableEquipment();
    fetchEventDetails();
    fetchExhibitionData(); // Fetch exhibition data for price calculation
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

  // Fetch exhibition data for price calculation
  const fetchExhibitionData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching exhibition data for event:', eventId);

      const response = await fetch(`/api/events/${eventId}/exhibition`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Exhibition data received:', data);
        setExhibitionData(data);
      } else {
        console.error('Exhibition data fetch failed:', response.status);

        // Fallback: try to get price from event details if available
        if (eventDetails?.price_per_sqm) {
          console.log('Using price from event details:', eventDetails.price_per_sqm);
          setExhibitionData({ price_per_sqm: eventDetails.price_per_sqm });
        }
      }
    } catch (error) {
      console.error('გამოფენის მონაცემების მიღების შეცდომა:', error);

      // Fallback: try to use event details price
      if (eventDetails?.price_per_sqm) {
        console.log('Using price from event details as fallback:', eventDetails.price_per_sqm);
        setExhibitionData({ price_per_sqm: eventDetails.price_per_sqm });
      }
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

  // Fetch packages when event details are loaded
  useEffect(() => {
    if (eventDetails?.exhibition_id) {
      fetchAvailablePackages();
    }

    // If exhibition data is not available but event has price_per_sqm, use it
    if (eventDetails?.price_per_sqm && !exhibitionData?.price_per_sqm) {
      console.log('Using event details price_per_sqm:', eventDetails.price_per_sqm);
      setExhibitionData(prev => ({
        ...prev,
        price_per_sqm: eventDetails.price_per_sqm
      }));
    }
  }, [eventDetails, exhibitionData]);


  // აღჭურვილობის ჯამური ღირებულების გათვლა
  useEffect(() => {
    const total = selectedEquipment.reduce((sum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    setEquipmentTotal(total);
  }, [selectedEquipment]);

  // ავტომატური გადახდის თანხის გათვლა (სტენდი + აღჭურვილობა)
  useEffect(() => {
    // პაკეტის შემთხვევაში
    if (registrationType === 'package' && selectedPackage) {
      const additionalEquipmentCost = selectedEquipment.reduce((sum, item) => {
        const isPackageEquipment = selectedPackage.equipment_list?.some(
          pkgEq => pkgEq.equipment_id === parseInt(item.equipment_id)
        );

        const quantity = parseInt(item.quantity) || 0;
        const unitPriceWithoutVAT = parseFloat(item.unit_price) || 0;
        const unitPrice = unitPriceWithoutVAT * 1.18; // 18% დღგ-ის დამატება

        // თუ პაკეტის აღჭურვილობაა
        if (isPackageEquipment) {
          const packageItem = selectedPackage.equipment_list.find(
            pkgEq => pkgEq.equipment_id === parseInt(item.equipment_id)
          );
          const packageQuantity = packageItem?.quantity || 0;
          const additionalQuantity = Math.max(0, quantity - packageQuantity);
          return sum + (additionalQuantity * unitPrice);
        } else {
          // სრულად იხდის თუ პაკეტში არ შედის
          return sum + (quantity * unitPrice);
        }
      }, 0);

      const packagePriceWithVAT = parseFloat(selectedPackage.fixed_price) * 1.18; // 18% დღგ-ის დამატება
      const totalAmount = packagePriceWithVAT + additionalEquipmentCost;
      setFormData(prev => ({
        ...prev,
        payment_amount: totalAmount.toFixed(2)
      }));
      return;
    }

    // ინდივიდუალური რეგისტრაციის შემთხვევაში
    let calculatedAmount = 0;
    let boothTotal = 0;

    // Debug logging for booth calculation
    console.log('Debug booth calculation:', {
      boothSize: formData.booth_size,
      boothSizeParsed: parseFloat(formData.booth_size),
      exhibitionData: exhibitionData,
      pricePerSqm: exhibitionData?.price_per_sqm,
      pricePerSqmParsed: parseFloat(exhibitionData?.price_per_sqm || 0),
      eventDetails: eventDetails
    });

    // სტენდის ღირებულების გათვლა (დღგ-ის ჩათვლით)
    if (formData.booth_size && exhibitionData && exhibitionData.price_per_sqm) {
      const boothSize = parseFloat(formData.booth_size);
      const pricePerSqmWithoutVAT = parseFloat(exhibitionData.price_per_sqm);
      const pricePerSqm = pricePerSqmWithoutVAT * 1.18; // 18% დღგ-ის დამატება

      if (!isNaN(boothSize) && !isNaN(pricePerSqm) && boothSize > 0 && pricePerSqm > 0) {
        boothTotal = boothSize * pricePerSqm;
        calculatedAmount = boothTotal;
      }
    }

    // აღჭურვილობის ღირებულების დამატება (დღგ-ის ჩათვლით)
    const equipmentTotalWithVAT = equipmentTotal * 1.18; // 18% დღგ-ის დამატება
    calculatedAmount += equipmentTotalWithVAT;

    console.log(`ჯამური თანხა: სტენდი ${boothTotal} + აღჭურვილობა ${equipmentTotal} = ${calculatedAmount}`);

    // თანხის განახლება
    setFormData(prev => ({
      ...prev,
      payment_amount: calculatedAmount.toFixed(2)
    }));
  }, [formData.booth_size, exhibitionData, equipmentTotal, registrationType, selectedPackage]);

  // ფილტრაცია და ძიება
  useEffect(() => {
    let filtered = participants;

    // ძიება კომპანიის სახელით
    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.identification_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ფილტრაცია სტატუსით
    if (statusFilter) {
      filtered = filtered.filter(participant =>
        participant.registration_status === statusFilter
      );
    }

    // ფილტრაცია გადახდის სტატუსით
    if (paymentFilter) {
      filtered = filtered.filter(participant =>
        participant.payment_status === paymentFilter
      );
    }

    // ფილტრაცია ქვეყნით
    if (countryFilter) {
      filtered = filtered.filter(participant =>
        participant.country === countryFilter
      );
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, paymentFilter, countryFilter]);

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

      // პირდაპირ ვიღებთ ზოგად აღჭურვილობის სიას
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Raw equipment data:', data);

        // ყველა აღჭურვილობა ხელმისაწვდომია
        const equipmentWithAvailability = data.map(equipment => ({
          ...equipment,
          booked_quantity: 0,
          available_quantity: equipment.quantity || 100 // default value
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

      // Create FormData for file uploads
      const submitData = new FormData();

      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') { // Append only if not null or empty
          submitData.append(key, formData[key]);
        }
      });

      // Add files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      // Add equipment bookings
      if (selectedEquipment.length > 0) {
        const validEquipment = selectedEquipment.filter(eq =>
          eq.equipment_id && eq.quantity > 0
        );
        submitData.append('equipment_bookings', JSON.stringify(validEquipment));
      }

      // Add package information if applicable
      if (registrationType === 'package' && selectedPackage) {
        submitData.append('package_id', selectedPackage.id);
        // Note: Booth size and base payment amount are already in formData
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

  const handleEdit = (participant) => {
    console.log('Editing participant:', participant);
    setEditingParticipant(participant);

    // Determine registration type based on participant data
    const isPackage = participant.package_id !== null && participant.package_id !== undefined;
    setRegistrationType(isPackage ? 'package' : 'individual');

    // Fetch selected package if it's a package registration
    if (isPackage) {
      const pkg = availablePackages.find(p => p.id === participant.package_id);
      if (pkg) {
        setSelectedPackage(pkg);
        // Load package equipment
        const participantEquipment = participant.equipment_bookings || [];
        const packageEquipment = pkg.equipment_list || [];

        const initialSelectedEquipment = packageEquipment.map(eq => {
          const bookedItem = participantEquipment.find(pe => pe.equipment_id === eq.equipment_id);
          return {
            equipment_id: eq.equipment_id,
            code_name: eq.code_name,
            quantity: bookedItem ? bookedItem.quantity : eq.quantity, // Use booked quantity if available
            unit_price: eq.price,
            total_price: (bookedItem ? bookedItem.quantity : eq.quantity) * eq.price,
            available_quantity: eq.available_quantity // Assuming available_quantity is also part of package equipment
          };
        });
        setSelectedEquipment(initialSelectedEquipment);
      } else {
        // Fallback if package details are not found, try to load participant's equipment
        fetchParticipantEquipment(participant.id);
      }
    } else {
      // For individual registrations, load participant's equipment
      fetchParticipantEquipment(participant.id);
    }


    const participantEquipment = participant.equipment_bookings || [];
    const currentEquipmentTotal = participantEquipment.reduce((sum, booking) => {
      const unitPrice = parseFloat(booking.unit_price) || 0;
      const quantity = parseInt(booking.quantity) || 0;
      return sum + (unitPrice * quantity);
    }, 0);

    const boothSize = parseFloat(participant.booth_size) || 0;
    const pricePerSqm = parseFloat(exhibitionData?.price_per_sqm) || 0;
    const boothTotal = boothSize * pricePerSqm;

    const calculatedTotal = boothTotal + currentEquipmentTotal;

    setFormData({
      company_id: participant.company_id || '',
      registration_status: participant.registration_status || 'მონაწილეობის მოთხოვნა',
      payment_status: participant.payment_status || 'მომლოდინე',
      booth_number: participant.booth_number || '',
      booth_size: participant.booth_size || '',
      notes: participant.notes || '',
      contact_person: participant.contact_person || '',
      contact_position: participant.contact_position || '',
      contact_email: participant.contact_email || '',
      contact_phone: participant.contact_phone || '',
      payment_amount: participant.payment_amount || calculatedTotal.toFixed(2),
      payment_due_date: participant.payment_due_date ? participant.payment_due_date.split('T')[0] : '',
      payment_method: participant.payment_method || '',
      invoice_number: participant.invoice_number || ''
    });

    // Ensure exhibition data is loaded for price calculation
    if (!exhibitionData) {
      fetchExhibitionData();
    }

    // Show the form
    setShowAddForm(true);

    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('.participant-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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

  const calculateEquipmentTotal = (equipmentList) => {
    return equipmentList.reduce((total, item) => {
      const unitPrice = parseFloat(item.unit_price) || 0;
      const quantity = parseInt(item.quantity) || 1; // Default quantity to 1 if not set
      return total + (unitPrice * quantity);
    }, 0);
  };

  const calculateTotalPaymentAmount = (boothSize, equipmentList, eventData) => {
    const equipmentTotal = calculateEquipmentTotal(equipmentList);
    let boothTotal = 0;

    const size = parseFloat(boothSize) || 0;
    const pricePerSqm = parseFloat(eventData?.price_per_sqm) || 0;

    if (size > 0 && pricePerSqm > 0) {
      boothTotal = size * pricePerSqm;
    }

    return boothTotal + equipmentTotal;
  };


  const handleEquipmentChange = (index, field, value) => {
    const updatedEquipment = [...selectedEquipment];

    if (!updatedEquipment[index]) {
      console.error(`Equipment item at index ${index} does not exist.`);
      return;
    }

    // Create a new item object
    const newItem = { ...updatedEquipment[index] };
    newItem[field] = value;

    // Update related fields when equipment is selected
    if (field === 'equipment_id') {
      const selectedEquip = availableEquipment.find(eq => eq.id === parseInt(value));
      if (selectedEquip) {
        newItem.code_name = selectedEquip.code_name;
        newItem.unit_price = parseFloat(selectedEquip.price) || 0;

        // Calculate available quantity considering package equipment usage
        let availableQty = selectedEquip.available_quantity || selectedEquip.quantity || 100;

        // If this is package equipment, adjust available quantity
        if (registrationType === 'package' && selectedPackage) {
          const packageEquipment = selectedPackage.equipment_list?.find(
            pkgEq => pkgEq.equipment_id === parseInt(value)
          );
          if (packageEquipment) {
            // პაკეტში შემავალი რაოდენობა უფასოდ მიუწვდება
            availableQty = availableQty; // მთლიანი რაოდენობა ხელმისაწვდომია
          }
        }

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
    setSelectedEquipment([]);
    setSelectedPackage(null);
    setRegistrationType('individual');
    setEditingParticipant(null);
    setShowAddForm(false); // Hide form after reset
  };

  const handleRegistrationTypeChange = (type) => {
    setRegistrationType(type);
    setSelectedPackage(null);
    setSelectedEquipment([]);

    // Reset form data related to booth and equipment
    setFormData(prev => ({
      ...prev,
      booth_size: '',
      payment_amount: ''
    }));
  };

  const handlePackageSelection = (packageId) => {
    const selectedPkg = availablePackages.find(pkg => pkg.id === parseInt(packageId));
    setSelectedPackage(selectedPkg);

    if (selectedPkg) {
      // Set package equipment as base equipment
      const packageEquipment = selectedPkg.equipment_list || [];
      setSelectedEquipment(packageEquipment.map(eq => ({
        equipment_id: eq.equipment_id,
        quantity: eq.quantity,
        unit_price: eq.price,
        code_name: eq.code_name,
        available_quantity: eq.available_quantity // Assuming this is provided
      })));

      // Set package area and base price
      setFormData(prev => ({
        ...prev,
        booth_size: selectedPkg.fixed_area_sqm.toString(),
        payment_amount: selectedPkg.fixed_price.toString()
      }));
    } else {
      // If no package selected or invalid ID, reset equipment and amounts
      setSelectedEquipment([]);
      setFormData(prev => ({
        ...prev,
        booth_size: '',
        payment_amount: ''
      }));
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentFilter('');
    setCountryFilter('');
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

      // contact_persons-ის სწორი დამუშავება
      if (companyData.contact_persons) {
        if (Array.isArray(companyData.contact_persons)) {
          // თუ უკვე array-ია, დავტოვოთ ისეთი როგორიცაა
          companyData.contact_persons = companyData.contact_persons;
        } else if (typeof companyData.contact_persons === 'string') {
          try {
            // თუ string-ია, ვცადოთ parsing
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

      // დარწმუნდეთ რომ contact_persons არის array
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
    fetchParticipants(); // რეფრეში მონაწილეების სიის
  };

  // უნიკალური ქვეყნების სია
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

  // Helper function to format date (used in participant display)
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
      return dateString; // Return original string if formatting fails
    }
  };

  const calculateTotalPayment = () => {
    const equipmentTotal = selectedEquipment.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0);

    const boothSize = parseFloat(formData.booth_size) || 0;
    const pricePerSqm = eventDetails?.price_per_sqm || 0;
    const exhibitionTotal = boothSize * pricePerSqm;

    return exhibitionTotal + equipmentTotal;
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
          {/* ძიება და ფილტრები */}
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
          </div>

          {isAuthorizedForManagement && (
            <div className="participants-actions">
              <button
                className="add-participant-btn"
                onClick={() => {
                  resetForm(); // Reset form before adding new
                  setShowAddForm(true);
                  // Ensure exhibition and package data are loaded for the form
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

                {/* Registration Type Selection */}
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
                      პაკეტის არჩევა
                    </label>
                  </div>
                </div>

                {/* Package Selection */}
                {registrationType === 'package' && (
                  <div className="form-group">
                    <label>აირჩიეთ პაკეტი</label>
                    <select
                      value={selectedPackage?.id || ''}
                      onChange={(e) => handlePackageSelection(e.target.value)}
                      required
                    >
                      <option value="">აირჩიეთ პაკეტი</option>
                      {availablePackages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.package_name} - {pkg.fixed_area_sqm}კვმ - €{pkg.fixed_price}
                        </option>
                      ))}
                    </select>

                    {selectedPackage && (
                      <div className="package-preview">
                        <h4>პაკეტის დეტალები:</h4>
                        <p><strong>სახელი:</strong> {selectedPackage.package_name}</p>
                        <p><strong>ფართობი:</strong> {selectedPackage.fixed_area_sqm} კვმ</p>
                        <p><strong>ბაზური ღირებულება:</strong> €{selectedPackage.fixed_price}</p>
                        {selectedPackage.description && (
                          <p><strong>აღწერა:</strong> {selectedPackage.description}</p>
                        )}

                        {selectedPackage.equipment_list && selectedPackage.equipment_list.length > 0 && (
                          <div className="package-equipment-preview">
                            <h5>შემავალი აღჭურვილობა:</h5>
                            <ul>
                              {selectedPackage.equipment_list.map((eq, idx) => (
                                <li key={idx}>
                                  {eq.code_name} - {eq.quantity} ცალი
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-row">
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
                      <small className="field-note">პაკეტის ფართობი ავტომატურად განისაზღვრება</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>სტენდის ნომერი</label>
                    <input
                      type="text"
                      value={formData.booth_number}
                      onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                    />
                  </div>
                </div>

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
                    <label>გადასახდელი თანხა (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                      readOnly // Make it read-only as it's calculated
                    />
                    <div className="payment-breakdown">
                      {registrationType === 'package' && selectedPackage ? (
                        <>
                          <small>პაკეტი: €{selectedPackage.fixed_price}</small>
                          <small>აღჭურვილობა: €{selectedEquipment.reduce((sum, item) => {
                            return sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
                          }, 0).toFixed(2)}</small>
                        </>
                      ) : (
                        <>
                          {formData.booth_size && exhibitionData?.price_per_sqm && (
                            <small>სტენდი: €{(parseFloat(formData.booth_size || 0) * parseFloat(exhibitionData.price_per_sqm || 0)).toFixed(2)}</small>
                          )}
                          <small>აღჭურვილობა: €{equipmentTotal.toFixed(2)}</small>
                        </>
                      )}
                      <small><strong>სულ: €{formData.payment_amount}</strong></small>
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

                {/* აღჭურვილობის არჩევა */}
              <div className="equipment-selection">
                <div className="equipment-header">
                  <h3>
                    {registrationType === 'package' 
                      ? 'პაკეტის აღჭურვილობა + დამატებითი' 
                      : 'აღჭურვილობის არჩევა'
                    }
                  </h3>
                  <button
                    type="button"
                    onClick={addEquipmentRow}
                    className="add-equipment-btn"
                  >
                    + აღჭურვილობის დამატება
                  </button>
                  {/* Debug info */}
                  <small style={{color: '#666', marginLeft: '10px'}}>
                    ხელმისაწვდომი: {availableEquipment.length} ცალი
                  </small>
                </div>

                {registrationType === 'package' && selectedPackage && (
                  <div className="package-equipment-info">
                    <h4>პაკეტში შემავალი აღჭურვილობა (უფასო):</h4>
                    {selectedPackage.equipment_list && selectedPackage.equipment_list.length > 0 ? (
                      <ul className="base-equipment-list">
                        {selectedPackage.equipment_list.map((eq, idx) => (
                          <li key={idx}>
                            {eq.code_name} - {eq.quantity} ცალი
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>პაკეტს არ აქვს ძირითადი აღჭურვილობა</p>
                    )}
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
                              let availableQty = equipment.available_quantity || equipment.quantity || 100;
                              let displayText = '';

                              // If this is package equipment, show package info
                              if (registrationType === 'package' && selectedPackage) {
                                const packageEquipment = selectedPackage.equipment_list?.find(
                                  pkgEq => pkgEq.equipment_id === equipment.id
                                );
                                if (packageEquipment) {
                                  displayText = `${equipment.code_name} (პაკეტში: ${packageEquipment.quantity} უფასო, სულ ხელმისაწვდომი: ${availableQty}, ფასი: €${equipment.price || 0})`;
                                } else {
                                  displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: €${equipment.price || 0})`;
                                }
                              } else {
                                displayText = `${equipment.code_name} (ხელმისაწვდომი: ${availableQty}, ფასი: €${equipment.price || 0})`;
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
                          if (registrationType === 'package' && selectedPackage) {
                            const packageItem = selectedPackage.equipment_list?.find(
                              pkgEq => pkgEq.equipment_id === parseInt(item.equipment_id)
                            );
                            if (packageItem) {
                              const freeQuantity = packageItem.quantity;
                              const currentQuantity = parseInt(item.quantity) || 0;
                              const paidQuantity = Math.max(0, currentQuantity - freeQuantity);
                              return (
                                <small style={{color: '#059669'}}>
                                  უფასო: {Math.min(currentQuantity, freeQuantity)}, გადასახდელი: {paidQuantity}
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
                        <label>ერთეულის ფასი (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleEquipmentChange(index, 'unit_price', e.target.value)}
                          readOnly={registrationType === 'package' && selectedPackage?.equipment_list?.some(pkgEq => pkgEq.equipment_id === parseInt(item.equipment_id))}
                        />
                      </div>
                      <div className="form-group">
                        <label>ჯამი (€)</label>
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

                {/* ფაილების მიმაგრების სექცია */}
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
                <div className="table-header">
                  <div>კომპანია</div>
                  <div>სტენდი</div>
                  <div>სტატუსი</div>
                  <div>გადახდა</div>
                  <div>ქმედება</div>
                </div>
                {filteredParticipants.map(participant => (
                  <div key={participant.id} className="table-row compact">
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

      {/* Company Details Modal */}
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
                onClick={(e) => { // Added event handlers
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
                    <strong>კომპანიის დასახელება</strong>
                    <span>{selectedCompanyForDetails.company_name}</span>
                  </div>
                  <div className="info-item">
                    <strong>საიდენტიფიკაციო კოდი</strong>
                    <span>{selectedCompanyForDetails.identification_code}</span>
                  </div>
                  <div className="info-item">
                    <strong>ქვეყანა</strong>
                    <span>{selectedCompanyForDetails.country}</span>
                  </div>
                  <div className="info-item">
                    <strong>სტატუსი</strong>
                    <span className={`status-indicator ${selectedCompanyForDetails.status === 'აქტიური' ? 'active' : 'archived'}`}>
                      {selectedCompanyForDetails.status || 'აქტიური'}
                    </span>
                  </div>
                  <div className="info-item full-width">
                    <strong>კომპანიის პროფილი</strong>
                    <span>{selectedCompanyForDetails.company_profile || 'არ არის მითითებული'}</span>
                  </div>
                  <div className="info-item full-width">
                    <strong>იურიდიული მისამართი</strong>
                    <span>{selectedCompanyForDetails.legal_address || 'არ არის მითითებული'}</span>
                  </div>
                  <div className="info-item">
                    <strong>ვებგვერდი</strong>
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

              {/* კომენტარის სექცია */}
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

              {/* საკონტაქტო პირების სექცია */}
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

      {/* Invoice Form Modal */}
      {showInvoiceForm && selectedParticipantForInvoice && (
        <InvoiceForm
          participant={selectedParticipantForInvoice}
          eventData={exhibitionData} // Pass exhibitionData for price per sqm
          onClose={closeInvoiceForm}
          showNotification={showNotification}
        />
      )}

      {/* Invitation Generator Modal */}
      {showInvitationGenerator && (
        <InvitationGenerator
          eventData={eventDetails || {}}
          participants={filteredParticipants}
          onClose={() => setShowInvitationGenerator(false)}
          showNotification={showNotification}
        />
      )}

      {/* Add Form Modal */}
    </div>
  );
};

export default EventParticipants;