import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Modal,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Container,
  Fade,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Close } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', md: '70%', lg: '60%' },
  maxHeight: '90vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const OperationPage = () => {
  const [annualServices, setAnnualServices] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    service_name: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    service_type: 'ივენთი',
    exhibition_id: '',
    year_selection: new Date().getFullYear(),
    is_active: true,
  });
  const [exhibitions, setExhibitions] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnnualServices();
    fetchExhibitions();
    fetchSpaces();
    generateYears();
  }, []);