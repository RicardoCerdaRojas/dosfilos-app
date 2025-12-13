import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Export library functions
export { extractPdfText } from './library/extractPdfText';
export { extractPdfWithGemini } from './library/extractPdfWithGemini';
export { createGeminiStore } from './library/createGeminiStore';
export { syncResourceToGemini } from './library/syncResourceToGemini';
