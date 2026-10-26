import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

// Exact port of AllyDocReactApp's src/utils/encryption.js - same hardcoded
// AES-CBC key/IV pair, since the backend's /loginV3.1 endpoint expects this
// exact scheme regardless of which client (web or mobile) is calling it.
const key1 = '12345678901234567890123456789012';
const key2 = '1234567890123456';

const getParsedKeys = () => ({
  secretKey: CryptoJS.enc.Utf8.parse(key1),
  iv: CryptoJS.enc.Utf8.parse(key2),
});

/** Encrypts values joined by '||', with an ISO timestamp appended at the end. */
export const encryptValuesWithTime = (...args) => {
  const { secretKey, iv } = getParsedKeys();
  const valuesWithTime = [...args, new Date().toISOString()];
  const combined = valuesWithTime.join('||');

  const encrypted = CryptoJS.AES.encrypt(combined, secretKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
};
