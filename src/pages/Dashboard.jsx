import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Dashboard.css';

const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || 'admin123';
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const adminFetch = (path, options = {}) => {
  const headers = {
    'x-admin-key': ADMIN_KEY,
    ...(options.headers || {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${apiUrl}${path}`, { ...options, headers });
};

const getRoleIcon = (role) => {
  const icons = {
    owner: '👑',
    admin: '⚙️',
    checker: '✓',
  };
  return icons[role] || '👤';
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    day: null,
    total_resi: 0,
    verified_resi: 0,
    pending_resi: 0,
    verified_percent: 0,
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin' || user.role === 'checker') {
      fetchDailyStats();
    }
  }, [user]);

  const fetchDailyStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/stats/daily`);
      if (!res.ok) throw new Error('Gagal fetch stats harian');
      const data = await res.json();
      setDailyStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openReport = async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportError('');
    try {
      const res = await adminFetch('/api/admin/reports/daily?days=30');
      if (!res.ok) throw new Error('Gagal fetch laporan harian');
      const data = await res.json();
      setReportRows(data);
    } catch (err) {
      console.error(err);
      setReportError('Gagal memuat laporan harian');
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setReportOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return <div>Loading...</div>;

  const statusLabel = dailyStats.verified_percent === 100 && dailyStats.total_resi > 0 ? 'Verified' : 'Pending';
  const dayLabel = dailyStats.day
    ? new Date(dailyStats.day).toLocaleDateString('id-ID')
    : '-';

  return (
    <div className="dashboard-container">
      <nav className="top-nav">
        <div className="inner">
          <div className="brand">
            <h1>Resi Validator</h1>
            <p>Sistem Manajemen Resi Internal</p>
          </div>

          <div className="user-info">
            <div className="meta">
              <p>{user.name}</p>
              <small>{user.username}</small>
            </div>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className={`welcome-card ${user.role}`}>
          <div className="icon">{getRoleIcon(user.role)}</div>
          <div>
            <h2>Selamat Datang, {user.name}!</h2>
            <p>Role: <strong style={{textTransform:'uppercase'}}>{user.role}</strong></p>
            <div className="footer-note">Akses dan fitur berbeda berdasarkan peran Anda.</div>
          </div>
        </div>

        {/* Owner view */}
        {user.role === 'owner' && (
          <>
            <div className="stats-grid">
              <div className="stat-card red">
                <h3>Total Resi</h3>
                <div className="value">1,234</div>
                <div className="hint">+12 bulan ini</div>
              </div>
              <div className="stat-card blue">
                <h3>Tervalidasi</h3>
                <div className="value">1,150</div>
                <div className="hint">93% valid</div>
              </div>
              <div className="stat-card yellow">
                <h3>Pending</h3>
                <div className="value">42</div>
                <div className="hint">Menunggu validasi</div>
              </div>
              <div className="stat-card red">
                <h3>Ditolak</h3>
                <div className="value">42</div>
                <div className="hint">7% ditolak</div>
              </div>
            </div>

            <div className="cards-grid">
              <div className="card">
                <h3>📊 Laporan & Analytics</h3>
                <p>Lihat laporan detail dan analisis data resi secara menyeluruh</p>
                <div className="actions">
                  <button onClick={openReport} className="primary-btn owner">Buka Laporan</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Admin view */}
        {user.role === 'admin' && (
          <>
            <div className="stats-grid">
              <div className="stat-card blue">
                <h3>Total Resi Hari Ini</h3>
                <div className="value">{dailyStats.total_resi}</div>
                <div className="hint">Tanggal: {dayLabel}</div>
              </div>
              <div className="stat-card green">
                <h3>Tervalidasi</h3>
                <div className="value">{dailyStats.verified_resi}</div>
                <div className="hint">{dailyStats.verified_percent}% verified</div>
              </div>
              <div className="stat-card yellow">
                <h3>Pending Validasi</h3>
                <div className="value">{dailyStats.pending_resi}</div>
                <div className="hint">Status: {statusLabel}</div>
              </div>
            </div>

            <div className="cards-grid">
              <div className="card">
                <h3>📦 Input Resi Baru</h3>
                <p>Tambahkan resi baru ke dalam sistem untuk divalidasi</p>
                <div className="actions">
                  <button onClick={() => navigate('/input-resi')} className="primary-btn admin">Input Resi</button>
                </div>
              </div>

              <div className="card">
                <h3>🧾 Kelola Resi</h3>
                <p>Edit atau hapus resi yang belum terverifikasi</p>
                <div className="actions">
                  <button onClick={() => navigate('/admin/resi')} className="primary-btn admin">Kelola Resi</button>
                </div>
              </div>

              <div className="card">
                <h3>📦 Kelola Item</h3>
                <p>Tambah, edit, atau hapus master data item</p>
                <div className="actions">
                  <button onClick={() => navigate('/admin/items')} className="primary-btn admin">Kelola Item</button>
                </div>
              </div>

              <div className="card">
                <h3>👥 Kelola Checker</h3>
                <p>Tambah, blokir, atau hapus akun checker</p>
                <div className="actions">
                  <button onClick={() => navigate('/admin/users')} className="primary-btn admin">Kelola Checker</button>
                </div>
              </div>

              <div className="card">
                <h3>📊 Laporan Harian</h3>
                <p>Lihat laporan verifikasi per hari (30 hari terakhir)</p>
                <div className="actions">
                  <button onClick={openReport} className="primary-btn admin">Buka Laporan</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Checker view - minimal */}
        {user.role === 'checker' && (
          <>
            <div className="stats-grid">
              <div className="stat-card blue">
                <h3>Total Resi Hari Ini</h3>
                <div className="value">{dailyStats.total_resi}</div>
                <div className="hint">Tanggal: {dayLabel}</div>
              </div>
              <div className="stat-card green">
                <h3>Sudah Tervalidasi</h3>
                <div className="value">{dailyStats.verified_resi}</div>
                <div className="hint">{dailyStats.verified_percent}% verified</div>
              </div>
              <div className="stat-card yellow">
                <h3>Pending Validasi</h3>
                <div className="value">{dailyStats.pending_resi}</div>
                <div className="hint">Status: {statusLabel}</div>
              </div>
            </div>

            <div className="cards-grid">
              <div className="card">
                <h3>✓ Validasi Resi</h3>
                <p>Periksa dan validasi resi yang pending untuk dipastikan keasliannya</p>
                <div className="actions">
                  <button onClick={() => navigate('/validasi')} className="primary-btn">Mulai Validasi</button>
                </div>
              </div>

              <div className="card">
                <h3>📊 Riwayat Validasi</h3>
                <p>Lihat riwayat validasi Anda dan detail setiap resi</p>
                <div className="actions">
                  <button onClick={() => navigate('/checker/history')} className="primary-btn">Lihat Riwayat</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {reportOpen && (user.role === 'admin' || user.role === 'owner') && (
        <div className="report-overlay">
          <div className="report-dialog">
            <div className="report-header">
              <h3>Laporan Harian (30 Hari Terakhir)</h3>
              <button onClick={closeReport} className="report-close">✕</button>
            </div>
            <div className="report-body">
              {reportLoading && <div className="report-loading">Memuat laporan...</div>}
              {reportError && <div className="report-error">{reportError}</div>}
              {!reportLoading && !reportError && (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Total Resi</th>
                      <th>Verified</th>
                      <th>Pending</th>
                      <th>Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.day}>
                        <td>{new Date(row.day).toLocaleDateString('id-ID')}</td>
                        <td>{row.total_resi}</td>
                        <td>{row.verified_resi}</td>
                        <td>{row.pending_resi}</td>
                        <td>{row.verified_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="report-footer">
              <button onClick={closeReport} className="primary-btn admin">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
