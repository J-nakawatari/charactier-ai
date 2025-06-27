'use client';

import { useState, useEffect } from 'react';
import { adminGet } from '@/utils/admin-api';
import { API_BASE_URL } from '@/lib/api-config';

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [authTest, setAuthTest] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check cookie status
      const statusResponse = await adminGet('/api/v1/debug/auth-status');
      const statusData = await statusResponse.json();
      setAuthStatus(statusData);
      
      // Try authenticated endpoint
      try {
        const testResponse = await adminGet('/api/v1/debug/auth-test');
        const testData = await testResponse.json();
        setAuthTest(testData);
      } catch (err) {
        setAuthTest({ error: 'Authentication failed', details: err });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check auth status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        {/* API Configuration */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">API Configuration</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify({ API_BASE_URL }, null, 2)}
          </pre>
        </div>

        {/* Cookie Status */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Cookie Status</h2>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : (
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          )}
        </div>

        {/* Authentication Test */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Authentication Test</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify(authTest, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            onClick={checkAuthStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Refresh Status
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Login
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Check if cookies are present in the &quot;Cookie Status&quot; section</li>
            <li>Verify that adminAccessToken exists</li>
            <li>Check if the Authentication Test shows admin details</li>
            <li>If cookies are missing, try logging in again</li>
            <li>Check browser DevTools &gt; Application &gt; Cookies</li>
          </ol>
        </div>
      </div>
    </div>
  );
}