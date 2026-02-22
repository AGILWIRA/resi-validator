import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CheckerHistory.css';

export default function CheckerHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedResi, setExpandedResi] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'checker') {
      navigate('/dashboard');
      return;
    }
    setUser(parsedUser);
    fetchHistory(parsedUser.username);
  }, [navigate]);

  const fetchHistory = async (username) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/checker/history`, {
        headers: {
          'x-checker-username': username,
        },
      });
      if (!res.ok) throw new Error('Gagal fetch history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat riwayat verifikasi');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (resiId) => {
    setExpandedResi(expandedResi === resiId ? null : resiId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredHistory = history.filter((resi) =>
    resi.resi_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div className="checker-history-container">
      {/* Navbar */}
      <nav className="history-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <div>
            <h1>Riwayat Verifikasi</h1>
            <p>Daftar resi yang Anda terverifikasi</p>
          </div>
        </div>
      </nav>

      <div className="history-content">
        {error && <div className="message error-message">{error}</div>}

        {loading ? (
          <div className="card">Memuat riwayat verifikasi...</div>
        ) : (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Total: {history.length} Resi Diverifikasi</h2>
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="Cari nomor resi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="empty-state">
                  <p>📋 {searchTerm ? 'Tidak ada resi yang cocok.' : 'Belum ada riwayat verifikasi.'}</p>
                </div>
              ) : (
                <div className="history-list">
                  {filteredHistory.map((resi) => (
                    <div key={resi.resi_id} className="history-item">
                      <div
                        className="history-header"
                        onClick={() => toggleExpand(resi.resi_id)}
                      >
                        <div className="item-info">
                          <h3>{resi.resi_number}</h3>
                          <small>{resi.items.length} item(s) - Verified: {formatDate(resi.verified_at)}</small>
                        </div>
                        <div className="expand-icon">
                          {expandedResi === resi.resi_id ? '▼' : '▶'}
                        </div>
                      </div>

                      {expandedResi === resi.resi_id && (
                        <div className="history-details">
                          <table className="details-table">
                            <thead>
                              <tr>
                                <th>Item Code</th>
                                <th>Nama Item</th>
                                <th>Qty</th>
                                <th>Verified At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resi.items.map((item) => (
                                <tr key={item.resi_item_id}>
                                  <td>{item.item_code}</td>
                                  <td>{item.item_name}</td>
                                  <td>{item.quantity_item}</td>
                                  <td>{formatDate(item.verified_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
