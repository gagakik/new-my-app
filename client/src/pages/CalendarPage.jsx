import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import {
  Box,
  Typography,
  Modal,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { toast } from 'react-toastify';


const localizer = momentLocalizer(moment);

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

const CalendarPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
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
  });
  const [exhibitions, setExhibitions] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [years, setYears] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchExhibitions();
    fetchSpaces();
    generateYears();
  }, []);}
  const fetchEvents = async () => {
    try {
      const response = await axios.get('/events');
      const formattedEvents = response.data.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedEvents);
    } catch (error) {
      toast.error('Failed to fetch events');
    }
  };


