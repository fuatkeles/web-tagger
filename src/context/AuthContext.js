import { onAuthStateChanged } from '@firebase/auth';

const generateApiKey = (uid) => {
  // Generate a random string
  const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  // Combine with user ID for uniqueness
  return `wt_${uid.slice(0, 8)}_${randomString}`;
};

const AuthContext = createContext(); 