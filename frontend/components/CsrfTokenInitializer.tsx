'use client';

import { useEffect } from 'react';
import axios from 'axios';

export default function CsrfTokenInitializer() {
  useEffect(() => {
    // ページロード時にCSRFトークンを取得
    const initCsrfToken = async () => {
      try {
        // GETリクエストでCSRFトークンがcookieに設定される
        await axios.get('/api/v1/csrf-token', {
          withCredentials: true
        });
      } catch (error) {
        console.error('Failed to initialize CSRF token:', error);
      }
    };

    initCsrfToken();
  }, []);

  return null;
}