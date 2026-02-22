import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Store user info from server response
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
        name: data.name,
      }));
      
      // Redirect based on role
      if (data.role === 'admin' || data.role === 'owner') {
        navigate('/dashboard');
      } else if (data.role === 'checker') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Koneksi ke server gagal. Pastikan server berjalan.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Main content */}
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <div className="login-grid">
          {/* Left side - Branding */}
          <div className="login-branding">
            <h1>Resi Validator</h1>
            <p>Platform validasi dan manajemen resi internal</p>
            <ul className="login-features">
              <li className="feature-1">
                <div className="icon-box">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path d="M4 5a2 2 0 012-2 1 1 0 000 2H3v11a2 2 0 002 2h10a2 2 0 002-2V7h-3a1 1 0 000-2 2 2 0 01-2-2V3h-2V2H6a2 2 0 00-2 2v3z"></path>
                  </svg>
                </div>
                <div>
                  <h3>Dashboard Intuitif</h3>
                  <p>Kelola semua resi dengan mudah dan efisien</p>
                </div>
              </li>
              <li className="feature-2">
                <div className="icon-box">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path>
                  </svg>
                </div>
                <div>
                  <h3>Multi-Role Access</h3>
                  <p>Owner, Admin, dan Checker dengan akses spesifik</p>
                </div>
              </li>
              <li className="feature-3">
                <div className="icon-box">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
                <div>
                  <h3>Analytics & Reports</h3>
                  <p>Real-time insights dan tracking data resi</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Right side - Login Form */}
          <div className="login-form-card">
            <div className="login-form-header">
              <h2>Masuk</h2>
              <p>Gunakan akun Anda untuk melanjutkan</p>
            </div>

            {/* Role selection removed — roles managed by backend/admin */}

            {/* Form */}
            <form onSubmit={handleLogin} className="login-form">
              {/* Username Input */}
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Sedang memproses...
                  </>
                ) : (
                  <>
                    <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '18px', height: '18px' }}>
                      <path d="M5 9V7a1 1 0 011-1h8a1 1 0 011 1v2M5 9c0 1.657-.895 3-2 3s-2-1.343-2-3m0 0h14m0 0c0 1.657-.895 3-2 3s-2-1.343-2-3m0 0V7a1 1 0 00-1-1H6a1 1 0 00-1 1v2"></path>
                    </svg>
                    Masuk
                  </>
                )}
              </button>
            </form>

            {/* Quick-login removed — admins create checker accounts in DB */}

            {/* Footer */}
            <div className="login-footer">
              <p style={{ margin: '0' }}>
                Password default: <strong>123</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
