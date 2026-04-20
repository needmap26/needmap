import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // fallback to original
  }
};

export const uploadProfileImage = async (file: File, uid: string): Promise<string> => {
  const compressedFile = await compressImage(file);
  const storageRef = ref(storage, `profiles/${uid}/avatar`);
  await uploadBytes(storageRef, compressedFile);
  return await getDownloadURL(storageRef);
};

export const uploadCoverImage = async (file: File, uid: string): Promise<string> => {
  const compressedFile = await compressImage(file);
  const storageRef = ref(storage, `profiles/${uid}/cover`);
  await uploadBytes(storageRef, compressedFile);
  return await getDownloadURL(storageRef);
};
