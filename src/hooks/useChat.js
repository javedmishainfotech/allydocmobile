import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { uploadChatImages, createChatRoom } from '../store/slices/chatSlice';

/** Thin unwrap-based wrapper around the chat slice's thunks, with the exact same call signature
 * as before - see chatSlice.js for why these resolve with the full result envelope. */
export function useChat() {
  const dispatch = useDispatch();

  const uploadImages = useCallback(
    (images, onProgress) => dispatch(uploadChatImages({ images, onProgress })).unwrap(),
    [dispatch],
  );

  const openChatRoom = useCallback(
    (params) => dispatch(createChatRoom(params)).unwrap(),
    [dispatch],
  );

  return {
    uploadChatImages: uploadImages,
    createChatRoom: openChatRoom,
  };
}
