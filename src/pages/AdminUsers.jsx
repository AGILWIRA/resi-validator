import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminUsers.css';

const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || 'admin123';

const adminFetch = (path, options = {}) => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const headers = {
    'x-admin-key': ADMIN_KEY,
    ...(options.headers || {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${apiUrl}${path}`, { ...options, headers });
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newUser, setNewUser] = useState({
    full_name: '',
    username: '',
    phone_number: '',
  });

  // Modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, userId: null, userName: '', action: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data checker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUser.full_name.trim() || !newUser.username.trim()) {
      setError('Nama lengkap dan username wajib diisi');
      return;
    }

    if (newUser.username.includes(' ')) {
      setError('Username tidak boleh mengandung spasi');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal membuat checker');

      setSuccess(`Checker ${data.username} berhasil ditambahkan. Password default: 123`);
      setNewUser({ full_name: '', username: '', phone_number: '' });
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal membuat checker');
    }
  };

  const openConfirmModal = (userId, userName, action) => {
    setConfirmModal({ open: true, userId, userName, action });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, userId: null, userName: '', action: '' });
  };

  const confirmAction = async () => {
    const { userId, action } = confirmModal;
    closeConfirmModal();
    setError('');
    setSuccess('');

    try {
      if (action === 'delete') {
        const res = await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Gagal menghapus checker');
        setSuccess(`Checker ${confirmModal.userName} dihapus`);
      } else if (action === 'block') {
        const res = await adminFetch(`/api/admin/users/${userId}/block`, {
          method: 'PUT',
          body: JSON.stringify({ is_blocked: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Gagal memblokir checker');
        setSuccess(`Checker ${confirmModal.userName} berhasil diblokir`);
      } else if (action === 'unblock') {
        const res = await adminFetch(`/api/admin/users/${userId}/block`, {
          method: 'PUT',
          body: JSON.stringify({ is_blocked: false }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Gagal membuka blokir checker');
        setSuccess(`Checker ${confirmModal.userName} berhasil dibuka blokirnya`);
      }

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal melakukan aksi');
    }
  };

  return (
    <div className="admin-users-container">
      <nav className="admin-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <div>
            <h1>Admin: Kelola Checker</h1>
            <p>Tambah, blokir, atau hapus akun checker.</p>
          </div>
        </div>
      </nav>

      <div className="admin-content">
        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}

        <div className="card">
          <h2>Tambah Checker Baru</h2>
          <form onSubmit={handleCreateUser} className="form-grid">
            <label>
              Nama Lengkap Checker
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </label>
            <label>
              Username
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Username (tanpa spasi)"
              />
            </label>
            <label>
              Nomor Telephone
              <input
                type="text"
                value={newUser.phone_number}
                onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                placeholder="Nomor telephone (opsional)"
              />
            </label>
            <button type="submit" className="primary-btn">
              Tambah Checker
            </button>
          </form>
          <div className="hint">Password default: 123 (checker dapat mengubahnya nanti)</div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Daftar Checker</h2>
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Cari nama atau username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Memuat data...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Nama Lengkap</th>
                    <th>Nomor Telephone</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(
                      (user) =>
                        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.full_name}</td>
                        <td>{user.phone_number || '-'}</td>
                        <td>
                          <span className={`badge ${user.is_blocked ? 'blocked' : 'active'}`}>
                            {user.is_blocked ? 'Diblokir' : 'Aktif'}
                          </span>
                        </td>
                        <td className="actions">
                          {user.is_blocked ? (
                            <button
                              onClick={() => openConfirmModal(user.id, user.username, 'unblock')}
                              className="success-btn"
                            >
                              Buka Blokir
                            </button>
                          ) : (
                            <button
                              onClick={() => openConfirmModal(user.id, user.username, 'block')}
                              className="warning-btn"
                            >
                              Blokir
                            </button>
                          )}
                          <button
                            onClick={() => openConfirmModal(user.id, user.username, 'delete')}
                            className="danger-btn"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  {users.filter(
                    (user) =>
                      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty">
                        {searchTerm ? 'Tidak ada checker yang cocok.' : 'Belum ada checker.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {confirmModal.open && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                {confirmModal.action === 'delete'
                  ? 'Hapus Checker'
                  : confirmModal.action === 'block'
                  ? 'Blokir Checker'
                  : 'Buka Blokir Checker'}
              </h3>
            </div>
            <div className="modal-body">
              <p>
                {confirmModal.action === 'delete'
                  ? `Yakin ingin menghapus checker `
                  : confirmModal.action === 'block'
                  ? `Yakin ingin memblokir checker `
                  : `Yakin ingin membuka blokir checker `}
                <strong>{confirmModal.userName}</strong>?
              </p>
              <p className="modal-subtitle">
                {confirmModal.action === 'delete'
                  ? 'Tindakan ini tidak dapat dibatalkan.'
                  : 'Checker tidak akan bisa login jika diblokir.'}
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={closeConfirmModal} className="modal-btn cancel-btn">
                Batal
              </button>
              <button
                onClick={confirmAction}
                className={
                  confirmModal.action === 'delete'
                    ? 'modal-btn danger-btn'
                    : confirmModal.action === 'block'
                    ? 'modal-btn warning-btn'
                    : 'modal-btn success-btn'
                }
              >
                {confirmModal.action === 'delete'
                  ? 'Hapus'
                  : confirmModal.action === 'block'
                  ? 'Blokir'
                  : 'Buka Blokir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
