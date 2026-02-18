import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Dashboard.css';

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
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return <div>Loading...</div>;

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
                  <button className="primary-btn owner">Buka Laporan</button>
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
                <div className="value">128</div>
                <div className="hint">Dalam proses</div>
              </div>
              <div className="stat-card green">
                <h3>Tervalidasi</h3>
                <div className="value">98</div>
                <div className="hint">76% selesai</div>
              </div>
              <div className="stat-card yellow">
                <h3>Pending Validasi</h3>
                <div className="value">30</div>
                <div className="hint">Tunggu checker</div>
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
                <h3>📋 Riwayat</h3>
                <p>Lihat riwayat resi dan status validasi</p>
                <div className="actions">
                  <button className="primary-btn admin">Lihat Riwayat</button>
                </div>
              </div>

              <div className="card">
                <h3>👥 Kelola Admin & Checker</h3>
                <p>Tambah, edit, atau hapus akun admin dan checker</p>
                <div className="actions">
                  <button className="primary-btn admin">Kelola Pengguna</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Checker view - minimal */}
        {user.role === 'checker' && (
          <>
            <div className="stats-grid">
              <div className="stat-card green">
                <h3>Pending Validasi</h3>
                <div className="value">24</div>
                <div className="hint">Siap diperiksa</div>
              </div>
              <div className="stat-card green">
                <h3>Sudah Tervalidasi</h3>
                <div className="value">156</div>
                <div className="hint">Hari ini: 8</div>
              </div>
              <div className="stat-card red">
                <h3>Ditolak</h3>
                <div className="value">5</div>
                <div className="hint">Memerlukan info</div>
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
                  <button className="primary-btn">Lihat Riwayat</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
