import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminItems.css';

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

export default function AdminItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newItem, setNewItem] = useState({ item_code: '', item_name: '', compatible_phone: '' });
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState({ item_code: '', item_name: '', compatible_phone: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, itemId: null, itemCode: '' });

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
    loadItems();
  }, [navigate]);

  const loadItems = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat item');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newItem.item_code.trim() || !newItem.item_name.trim()) {
      setError('Item code dan item name wajib diisi');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/items', {
        method: 'POST',
        body: JSON.stringify(newItem),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan item');
      setSuccess(`Item ${data.item_code} berhasil ditambahkan`);
      setNewItem({ item_code: '', item_name: '', compatible_phone: '' });
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal menambahkan item');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditItem({
      item_code: item.item_code,
      item_name: item.item_name,
      compatible_phone: item.compatible_phone || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditItem({ item_code: '', item_name: '', compatible_phone: '' });
  };

  const saveEdit = async (id) => {
    setError('');
    setSuccess('');
    if (!editItem.item_code.trim() || !editItem.item_name.trim()) {
      setError('Item code dan item name wajib diisi');
      return;
    }

    try {
      const res = await adminFetch(`/api/admin/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editItem),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah item');
      setSuccess(`Item ${data.item_code} berhasil diubah`);
      cancelEdit();
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal mengubah item');
    }
  };

  const openDeleteModal = (id, code) => {
    setConfirmModal({ open: true, itemId: id, itemCode: code });
  };

  const closeDeleteModal = () => {
    setConfirmModal({ open: false, itemId: null, itemCode: '' });
  };

  const confirmDelete = async () => {
    const { itemId, itemCode } = confirmModal;
    closeDeleteModal();
    setError('');
    setSuccess('');
    try {
      const res = await adminFetch(`/api/admin/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus item');
      setSuccess(`Item ${itemCode} dihapus`);
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal menghapus item');
    }
  };

  return (
    <div className="admin-items-container">
      <nav className="admin-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <div>
            <h1>Admin: Kelola Item</h1>
            <p>Tambah, edit, atau hapus data item.</p>
          </div>
        </div>
      </nav>

      <div className="admin-content">
        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}

        <div className="card">
          <h2>Tambah Item Baru</h2>
          <form onSubmit={handleCreate} className="form-grid">
            <label>
              Kode Item
              <input
                type="text"
                value={newItem.item_code}
                onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                placeholder="BRP123"
              />
            </label>
            <label>
              Nama Item
              <input
                type="text"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder="Nama barang"
              />
            </label>
            <label>
              Compatible Phone
              <input
                type="text"
                value={newItem.compatible_phone}
                onChange={(e) => setNewItem({ ...newItem, compatible_phone: e.target.value })}
                placeholder="Opsional"
              />
            </label>
            <button type="submit" className="primary-btn">Tambah Item</button>
          </form>
          <div className="hint">
            Perubahan item_code hanya bisa jika item belum dipakai di resi.
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Daftar Item</h2>
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Cari kode atau nama item..."
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
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Compatible Phone</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter(
                      (item) =>
                        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((item) => (
                    <tr key={item.id}>
                      <td>
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editItem.item_code}
                            onChange={(e) => setEditItem({ ...editItem, item_code: e.target.value })}
                          />
                        ) : (
                          item.item_code
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editItem.item_name}
                            onChange={(e) => setEditItem({ ...editItem, item_name: e.target.value })}
                          />
                        ) : (
                          item.item_name
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editItem.compatible_phone}
                            onChange={(e) => setEditItem({ ...editItem, compatible_phone: e.target.value })}
                          />
                        ) : (
                          item.compatible_phone || '-'
                        )}
                      </td>
                      <td className="actions">
                        {editingId === item.id ? (
                          <>
                            <button onClick={() => saveEdit(item.id)} className="primary-btn">Simpan</button>
                            <button onClick={cancelEdit} className="ghost-btn">Batal</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="ghost-btn">Edit</button>
                            <button onClick={() => openDeleteModal(item.id, item.item_code)} className="danger-btn">Hapus</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.filter(
                    (item) =>
                      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty">
                        {searchTerm ? 'Tidak ada item yang cocok.' : 'Belum ada item.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {confirmModal.open && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-header">
                <h3>Hapus Item</h3>
              </div>
              <div className="modal-body">
                <p>
                  Yakin ingin menghapus item <strong>{confirmModal.itemCode}</strong>?
                </p>
                <p className="modal-subtitle">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="modal-footer">
                <button onClick={closeDeleteModal} className="modal-btn cancel-btn">Batal</button>
                <button onClick={confirmDelete} className="modal-btn danger-btn">Hapus</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
