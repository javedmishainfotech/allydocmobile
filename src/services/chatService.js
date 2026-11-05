import Constants from 'expo-constants';
import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

export const SIGNALR_URL = Constants.expoConfig?.extra?.signalRUrl || '';

/**
 * Mirrors the image upload in AllyDocReactApp's utils/ChatWindow.jsx:
 * `POST <signalr>/api/chatroom/UploadFiles` with the images as multipart `files`; the response
 * carries the uploaded `fileUrls`, which are then sent through the hub as one file message.
 * `images` are picker results ({ uri, fileName?, mimeType? }). `onProgress` gets 0-100.
 */
export async function uploadChatImages(images, onProgress) {
  const formData = new FormData();
  images.forEach((image, index) => {
    const uri = image.uri;
    const name = image.fileName || uri.split('/').pop() || `image-${index}.jpg`;
    formData.append('files', { uri, name, type: image.mimeType || 'image/jpeg' });
  });
  try {
    const response = await apiClient.post(`${SIGNALR_URL}/api/chatroom/UploadFiles`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // several photos on a slow connection
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/**
 * Mirrors CreateChatRoomAction (module/Doctor/Pages/DoctorAppointments/action.js): a staff member
 * opens (creates, if needed) the chat room of an appointment - `POST <signalr>/api/chatroom/create-chat-room`.
 * The body carries `senderChatRoomId` (the room id to open) on success. This is how a conversation
 * first appears in both people's Messages list.
 */
export async function createChatRoom({ appointmentId, senderId, recieverId }) {
  try {
    const response = await apiClient.post(`${SIGNALR_URL}/api/chatroom/create-chat-room`, { appointmentId, senderId, recieverId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
