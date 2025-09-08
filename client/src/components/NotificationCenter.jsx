
import React, { useState, useEffect } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Divider,
  Button,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Notifications,
  Close,
  CheckCircle,
  Warning,
  Error,
  Payment,
  Event,
  Info,
  VisibilityOff
} from '@mui/icons-material';

const NotificationCenter = ({ showNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const open = Boolean(anchorEl);

  useEffect(() => {
    fetchNotifications();
    // პერიოდული განახლება ყოველ 30 წამში
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('ნოტიფიკაციების ჩატვირთვის შეცდომა:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('ნოტიფიკაციის განახლების შეცდომა:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { sx: { fontSize: 20 } };
    
    switch (type) {
      case 'success': 
        return <CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: 'success.main' }} />;
      case 'warning': 
        return <Warning {...iconProps} sx={{ ...iconProps.sx, color: 'warning.main' }} />;
      case 'error': 
        return <Error {...iconProps} sx={{ ...iconProps.sx, color: 'error.main' }} />;
      case 'payment': 
        return <Payment {...iconProps} sx={{ ...iconProps.sx, color: 'info.main' }} />;
      case 'event': 
        return <Event {...iconProps} sx={{ ...iconProps.sx, color: 'primary.main' }} />;
      default: 
        return <Info {...iconProps} sx={{ ...iconProps.sx, color: 'info.main' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'payment': return 'info';
      case 'event': return 'primary';
      default: return 'info';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახან';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    if (diffDays < 7) return `${diffDays} დღის წინ`;
    return date.toLocaleDateString('ka-GE');
  };

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'text.primary',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08)
          }
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            width: 380,
            maxWidth: '90vw',
            maxHeight: 500,
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        {/* Header */}
        <Paper 
          elevation={0}
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 2
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              შეტყობინებები
            </Typography>
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.1)
                }
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        {/* Content */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <VisibilityOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                შეტყობინებები არ არის
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    disablePadding
                    sx={{
                      backgroundColor: !notification.is_read 
                        ? alpha(theme.palette.primary.main, 0.04)
                        : 'transparent'
                    }}
                  >
                    <ListItemButton
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                      sx={{
                        py: 2,
                        px: 2,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: alpha(theme.palette[getNotificationColor(notification.type)].main, 0.1),
                            color: `${getNotificationColor(notification.type)}.main`
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: !notification.is_read ? 700 : 500,
                                flex: 1,
                                color: 'text.primary'
                              }}
                            >
                              {notification.title}
                            </Typography>
                            {!notification.is_read && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main'
                                }}
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ 
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                                wordBreak: 'break-word'
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Chip
                              label={formatDate(notification.created_at)}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.75rem',
                                height: 20,
                                alignSelf: 'flex-start',
                                color: 'text.secondary',
                                borderColor: alpha(theme.palette.text.secondary, 0.3)
                              }}
                            />
                          </Stack>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < notifications.slice(0, 10).length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 10 && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.grey[500], 0.05)
            }}
          >
            <Button
              fullWidth
              variant="text"
              color="primary"
              sx={{ fontWeight: 600 }}
            >
              ყველას ნახვა ({notifications.length})
            </Button>
          </Paper>
        )}
      </Popover>
    </Box>
  );
};

export default NotificationCenter;
