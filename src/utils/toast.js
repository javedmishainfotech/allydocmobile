import Toast from 'react-native-toast-message';

// Thin wrapper matching the web app's react-toastify call shape
// (toast.success(message) / toast.error(message)) so page code reads the
// same either way.
export const toast = {
  success: (message) => Toast.show({ type: 'success', text1: message }),
  error: (message) => Toast.show({ type: 'error', text1: message }),
  info: (message) => Toast.show({ type: 'info', text1: message }),
};
