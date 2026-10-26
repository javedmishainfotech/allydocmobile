import { useEffect, useState } from 'react';
import { getItem } from '../utils/storage';

/** Mirrors the web header's idpStatus (localStorage, re-read every second).
 * Falls back to the profile's value because a restored session has nothing in
 * storage until the Identity Proofing screen loads it. Lower-cased; '' if unknown. */
export function useIdpStatus(profileIdpStatus) {
  const [stored, setStored] = useState('');

  useEffect(() => {
    let active = true;
    const read = async () => {
      const value = await getItem('idpStatus').catch(() => null);
      if (active) setStored(value ? String(value).toLowerCase() : '');
    };
    read();
    const interval = setInterval(read, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return stored || (profileIdpStatus ? String(profileIdpStatus).toLowerCase() : '');
}
