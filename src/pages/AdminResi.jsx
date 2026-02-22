import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminResi.css';

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

export default function AdminResi() {
  const navigate = useNavigate();
  const [resiList, setResiList] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingResiId, setEditingResiId] = useState(null);
  const [editResiNumber, setEditResiNumber] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, resiId: null, resiNumber: '' });
  const [detailModal, setDetailModal] = useState({ open: false, resi: null, items: [] });

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
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resiRes, itemsRes] = await Promise.all([
        adminFetch('/api/admin/resi'),
        adminFetch('/api/admin/items'),
      ]);
      if (!resiRes.ok) throw new Error('Gagal fetch resi');
      if (!itemsRes.ok) throw new Error('Gagal fetch item');
      const resiData = await resiRes.json();
      const itemsData = await itemsRes.json();
      setResiList(resiData);
      setItemsCatalog(itemsData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (resi) => {
    setEditingResiId(resi.id);
    setEditResiNumber(resi.resi_number);
    const mapped = resi.items.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      quantity_item: item.quantity_item,
    }));
    setEditItems(mapped.length > 0 ? mapped : [{ item_code: '', item_name: '', quantity_item: 1 }]);
  };

  const cancelEdit = () => {
    setEditingResiId(null);
    setEditResiNumber('');
    setEditItems([]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'item_code') {
      const matched = itemsCatalog.find((i) => i.item_code === value);
      updated[index].item_name = matched ? matched.item_name : '';
    }

    setEditItems(updated);
  };

  const addItemRow = () => {
    setEditItems([...editItems, { item_code: '', item_name: '', quantity_item: 1 }]);
  };

  const removeItemRow = (index) => {
    if (editItems.length === 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const saveResi = async () => {
    setError('');
    setSuccess('');
    if (!editResiNumber.trim()) {
      setError('Nomor resi wajib diisi');
      return;
    }

    for (const item of editItems) {
      if (!item.item_code || !item.quantity_item) {
        setError('Setiap item harus memiliki kode dan kuantitas');
        return;
      }
    }

    try {
      const res = await adminFetch(`/api/admin/resi/${editingResiId}`, {
        method: 'PUT',
        body: JSON.stringify({
          resiNumber: editResiNumber,
          items: editItems.map((item) => ({
            item_code: item.item_code,
            quantity_item: Number(item.quantity_item),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah resi');
      setSuccess(`Resi ${data.resi.resi_number} berhasil diubah`);
      cancelEdit();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal mengubah resi');
    }
  };

  const openDeleteModal = (resiId, resiNumber) => {
    setConfirmModal({ open: true, resiId, resiNumber });
  };

  const closeDeleteModal = () => {
    setConfirmModal({ open: false, resiId: null, resiNumber: '' });
  };

  const confirmDelete = async () => {
    const { resiId, resiNumber } = confirmModal;
    closeDeleteModal();
    setError('');
    setSuccess('');
    try {
      const res = await adminFetch(`/api/admin/resi/${resiId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus resi');
      setSuccess(`Resi ${resiNumber} dihapus`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal menghapus resi');
    }
  };

  const openDetailModal = async (resiId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/resi/${resiId}`);
      if (!res.ok) throw new Error('Gagal fetch detail resi');
      const data = await res.json();
      setDetailModal({ open: true, resi: data.resi, items: data.items });
    } catch (err) {
      console.error(err);
      setError('Gagal membuka detail resi');
    }
  };

  const closeDetailModal = () => {
    setDetailModal({ open: false, resi: null, items: [] });
  };

  return (
    <div className="admin-resi-container">
      <nav className="admin-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <div>
            <h1>Admin: Kelola Resi</h1>
            <p>Edit atau hapus resi yang belum terverifikasi.</p>
          </div>
        </div>
      </nav>

      <div className="admin-content">
        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}

        {loading ? (
          <div className="card">Memuat data...</div>
        ) : (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Daftar Resi</h2>
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
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nomor Resi</th>
                      <th>Items</th>
                      <th>Verified</th>
                      <th>Verified By</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resiList
                      .filter((resi) =>
                        resi.resi_number.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((resi) => {
                      const editable = resi.verified_count === 0;
                      // Get unique checker names who verified items in this resi
                      const verifiedByNames = new Set();
                      if (resi.items) {
                        resi.items.forEach(item => {
                          if (item.verified && item.verified_by_name) {
                            verifiedByNames.add(item.verified_by_name);
                          }
                        });
                      }
                      const verifiedByList = Array.from(verifiedByNames).join(', ') || '-';
                      
                      return (
                        <tr key={resi.id}>
                          <td>{resi.resi_number}</td>
                          <td>{resi.item_count}</td>
                          <td>{resi.verified_count}</td>
                          <td>{verifiedByList}</td>
                          <td>{editable ? 'Belum Terverifikasi' : 'Terverifikasi'}</td>
                          <td className="actions">
                            <button onClick={() => openDetailModal(resi.id)} className="info-btn">Detail</button>
                            {editable ? (
                              <>
                                <button onClick={() => startEdit(resi)} className="ghost-btn">Edit</button>
                                <button onClick={() => openDeleteModal(resi.id, resi.resi_number)} className="danger-btn">Hapus</button>
                              </>
                            ) : (
                              <span className="badge">Terkunci</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {resiList.filter((resi) =>
                      resi.resi_number.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty">
                          {searchTerm ? 'Tidak ada resi yang cocok.' : 'Belum ada resi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {editingResiId && (
              <div className="card">
                <h2>Edit Resi</h2>
                <div className="edit-resi">
                  <label>
                    Nomor Resi
                    <input
                      type="text"
                      value={editResiNumber}
                      onChange={(e) => setEditResiNumber(e.target.value)}
                    />
                  </label>

                  <div className="items-editor">
                    <div className="items-header">
                      <h3>Item Dalam Resi</h3>
                      <button onClick={addItemRow} className="primary-btn">+ Tambah Item</button>
                    </div>
                    {editItems.map((item, idx) => (
                      <div key={idx} className="item-row">
                        <select
                          value={item.item_code}
                          onChange={(e) => handleItemChange(idx, 'item_code', e.target.value)}
                        >
                          <option value="">Pilih item</option>
                          {itemsCatalog.map((opt) => (
                            <option key={opt.id} value={opt.item_code}>
                              {opt.item_code} - {opt.item_name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.item_name}
                          placeholder="Nama item"
                          readOnly
                        />
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_item}
                          onChange={(e) => handleItemChange(idx, 'quantity_item', e.target.value)}
                        />
                        <button onClick={() => removeItemRow(idx)} className="ghost-btn">Hapus</button>
                      </div>
                    ))}
                  </div>

                  <div className="actions">
                    <button onClick={saveResi} className="primary-btn">Simpan Perubahan</button>
                    <button onClick={cancelEdit} className="ghost-btn">Batal</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {confirmModal.open && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-header">
                <h3>Hapus Resi</h3>
              </div>
              <div className="modal-body">
                <p>
                  Yakin ingin menghapus resi <strong>{confirmModal.resiNumber}</strong>?
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

        {detailModal.open && (
          <div className="modal-overlay">
            <div className="modal-dialog detail-modal">
              <div className="modal-header">
                <h3>Detail Resi: {detailModal.resi?.resi_number}</h3>
                <button onClick={closeDetailModal} className="close-btn">✕</button>
              </div>
              <div className="modal-body detail-body">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Nama Item</th>
                      <th>Kuantitas</th>
                      <th>Status</th>
                      <th>Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModal.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_code}</td>
                        <td>{item.item_name}</td>
                        <td>{item.quantity_item}</td>
                        <td>
                          <span className={item.verified ? 'status-verified' : 'status-pending'}>
                            {item.verified ? '✓ Verified' : '○ Pending'}
                          </span>
                        </td>
                        <td>
                          <strong>{item.verified_by_name || '-'}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button onClick={closeDetailModal} className="modal-btn cancel-btn">Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
