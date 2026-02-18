import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ValidasiResi.css';

export default function ValidasiResi() {
  const [pendingResi, setPendingResi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingResi();
  }, []);

  const fetchPendingResi = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/resi/pending`);
      if (!res.ok) throw new Error('Failed to fetch pending resi');
      const data = await res.json();
      setPendingResi(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat resi pending');
    } finally {
      setLoading(false);
    }
  };

  const handleValidasiClick = (resiId) => {
    navigate(`/validasi-detail/${resiId}`);
  };

  if (loading) {
    return (
      <div className="validasi-container">
        <nav className="validasi-nav">
          <div className="nav-inner">
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              ← Kembali
            </button>
            <h1>Validasi Resi</h1>
          </div>
        </nav>
        <div className="content">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="validasi-container">
      <nav className="validasi-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <h1>Validasi Resi</h1>
          <div className="counter">Total: {pendingResi.length} resi pending</div>
        </div>
      </nav>

      <div className="validasi-content">
        {error && (
          <div className="error-message">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
            </svg>
            {error}
          </div>
        )}

        {pendingResi.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✓</div>
            <h2>Semua resi sudah tervalidasi!</h2>
            <p>Tidak ada resi yang menunggu validasi saat ini.</p>
          </div>
        ) : (
          <div className="resi-list">
            {pendingResi.map((resi) => (
              <div key={resi.resi_id} className="resi-card">
                <div className="resi-header">
                  <div className="resi-info">
                    <h3>{resi.resi_number}</h3>
                    <p className="date">
                      {new Date(resi.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="item-count">
                    <span className="badge">{resi.items.length} item</span>
                  </div>
                </div>

                <div className="items-preview">
                  <p className="label">Items:</p>
                  <ul>
                    {resi.items.map((item) => (
                      <li key={item.resi_item_id}>
                        <span className="code">{item.item_code}</span>
                        <span className="name">{item.item_name}</span>
                        <span className="qty">×{item.quantity_item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleValidasiClick(resi.resi_id)}
                  className="validate-btn"
                >
                  Mulai Validasi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
