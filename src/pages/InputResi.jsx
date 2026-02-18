import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InputResi.css';

export default function InputResi() {
  const [resiNumber, setResiNumber] = useState('');
  const [details, setDetails] = useState([{ id: '', nama: '', kuantitas: '' }]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch semua items dari database saat component mount
  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/items`);
        if (res.ok) {
          const items = await res.json();
          setAllItems(items);
        }
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Gagal memuat data barang dari database');
      } finally {
        setItemsLoading(false);
      }
    };
    fetchAllItems();
  }, []);

  const handleResiChange = (e) => {
    setResiNumber(e.target.value);
  };

  // Auto-fill nama item dari API saat item_code selesai diketik
  const fetchItemByCode = async (itemCode, index) => {
    if (!itemCode.trim()) return;
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/items/${itemCode}`);
      if (res.ok) {
        const item = await res.json();
        const newDetails = [...details];
        newDetails[index].nama = item.item_name;
        setDetails(newDetails);
      }
    } catch (err) {
      console.error('Error fetching item:', err);
    }
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    setDetails(newDetails);

    if (field === 'id') {
      if (value.trim()) {
        // Filter dari data yang di-fetch dari database
        const filtered = allItems.filter((item) =>
          item.item_code.toUpperCase().includes(value.toUpperCase())
        );
        const suggestionCodes = filtered.map(item => item.item_code);
        setSuggestions(suggestionCodes);
        setActiveSuggestionField(index);
      } else {
        setSuggestions([]);
        setActiveSuggestionField(null);
      }
    }
  };

  const selectSuggestion = (index, suggestion) => {
    const newDetails = [...details];
    newDetails[index].id = suggestion;
    setDetails(newDetails);
    setSuggestions([]);
    setActiveSuggestionField(null);
    // Fetch nama item dari DB saat suggestion dipilih
    fetchItemByCode(suggestion, index);
  };

  const addDetail = () => {
    setDetails([...details, { id: '', nama: '', kuantitas: '' }]);
  };

  const removeDetail = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resiNumber.trim()) {
      setError('Nomor Resi harus diisi');
      return;
    }

    const validDetails = details.filter(
      (d) => d.id.trim() || d.nama.trim() || d.kuantitas.toString().trim()
    );

    if (validDetails.length === 0) {
      setError('Minimal 1 detail barang harus diisi');
      return;
    }

    for (let detail of validDetails) {
      if (!detail.id.trim() || !detail.nama.trim() || !detail.kuantitas.toString().trim()) {
        setError('Semua field detail barang harus lengkap');
        return;
      }
    }

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/resi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resiNumber, details: validDetails }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Network response was not ok');
      }

      const data = await res.json();
      console.log('Tersimpan:', data);
      setSuccess(`Resi ${resiNumber} berhasil disimpan ke database.`);
      setResiNumber('');
      setDetails([{ id: '', nama: '', kuantitas: '' }]);
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan data ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="input-resi-container">
      {/* Top nav */}
      <nav className="input-resi-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Kembali
          </button>
          <h1>Input Resi Baru</h1>
        </div>
      </nav>

      {/* Main content */}
      <div className="input-resi-content">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {/* Resi Number */}
            <div className="form-section">
              <label htmlFor="resiNumber">Nomor Resi</label>
              <input
                id="resiNumber"
                type="text"
                value={resiNumber}
                onChange={handleResiChange}
                placeholder="Contoh: RES-2024-001"
                className="input-field"
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="message success-message">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="message error-message">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                {error}
              </div>
            )}

            {/* Loading indicator */}
            {itemsLoading && (
              <div className="message" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                Memuat data barang dari database...
              </div>
            )}

            {/* Detail Barang Section */}
            <div className="form-section">
              <div className="section-header">
                <label>Detail Barang</label>
                <button
                  type="button"
                  onClick={addDetail}
                  className="add-detail-btn"
                  disabled={itemsLoading}
                >
                  + Tambah Barang
                </button>
              </div>

              <div className="details-list">
                {details.map((detail, index) => (
                  <div key={index} className="detail-item">
                    <div className="detail-number">{index + 1}</div>

                    <div className="detail-field">
                      <label>ID Barang</label>
                      <div className="autocomplete-wrapper">
                        <input
                          type="text"
                          value={detail.id}
                          onChange={(e) =>
                            handleDetailChange(index, 'id', e.target.value)
                          }
                          placeholder="Ketik untuk mencari..."
                          className="input-field"
                        />
                        {activeSuggestionField === index && suggestions.length > 0 && (
                          <div className="suggestions-dropdown">
                            {suggestions.map((suggestion, idx) => (
                              <div
                                key={idx}
                                className="suggestion-item"
                                onClick={() => selectSuggestion(index, suggestion)}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="detail-field">
                      <label>Nama Barang</label>
                      <input
                        type="text"
                        value={detail.nama}
                        onChange={(e) =>
                          handleDetailChange(index, 'nama', e.target.value)
                        }
                        placeholder="Nama barang (auto-fill)"
                        className="input-field"
                        readOnly
                      />
                    </div>

                    <div className="detail-field">
                      <label>Kuantitas</label>
                      <input
                        type="number"
                        value={detail.kuantitas}
                        onChange={(e) =>
                          handleDetailChange(index, 'kuantitas', e.target.value)
                        }
                        placeholder="0"
                        min="1"
                        className="input-field"
                      />
                    </div>

                    {details.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetail(index)}
                        className="remove-detail-btn"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Resi'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="cancel-btn"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
