
// შეცდომების მუშაობის utility ფუნქციები

export const handleApiError = (error, showNotification, defaultMessage = 'შეცდომა მოხდა') => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error.response) {
    // Server responded with error status
    errorMessage = error.response.data?.message || error.response.data?.error || defaultMessage;
  } else if (error.request) {
    // Request made but no response received
    errorMessage = 'სერვერთან კავშირის შეცდომა';
  } else {
    // Something else happened
    errorMessage = error.message || defaultMessage;
  }
  
  if (showNotification) {
    showNotification(errorMessage, 'error');
  }
  
  return errorMessage;
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isServerError = (error) => {
  return error.response && error.response.status >= 500;
};

export const isClientError = (error) => {
  return error.response && error.response.status >= 400 && error.response.status < 500;
};

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'უცნობი შეცდომა';
};
