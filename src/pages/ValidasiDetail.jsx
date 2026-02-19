import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/library';
import './ValidasiDetail.css';

export default function ValidasiDetail() {
  const { resiId } = useParams();
  const [resi, setResi] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [isScannedFromDevice, setIsScannedFromDevice] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: '', itemName: '', itemCode: '', message: '' });
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  const fetchResiDetail = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/resi/${resiId}`);
      if (!res.ok) throw new Error('Failed to fetch resi');
      const data = await res.json();
      setResi(data.resi);
      setItems(data.items);
      // Initialize verification status
      const status = {};
      data.items.forEach((item) => {
        status[item.id] = { 
          verified: item.verified, 
          scanned: false,
          scannedCount: 0,
          requiredCount: item.quantity_item
        };
      });
      setVerificationStatus(status);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail resi');
    } finally {
      setLoading(false);
    }
  }, [resiId]);

  // Camera / scanner handlers
  const pickBackCamera = (devices) => {
    if (!devices || devices.length === 0) return null;
    const byLabel = devices.find((d) => /back|rear|environment/i.test(d.label));
    return (byLabel || devices[devices.length - 1]).deviceId;
  };

  const startScanner = async () => {
    setError('');
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const devices = await codeReaderRef.current.listVideoInputDevices();
      const deviceId = pickBackCamera(devices);
      await codeReaderRef.current.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          setScannedCode(result.getText());
          setIsScannedFromDevice(true);
        }
      });
      setScanning(true);
    } catch (err) {
      console.error('startScanner error', err);
      setError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
    }
  };

  const stopScanner = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    } catch (err) {
      console.error(err);
    }
    setScanning(false);
  };

  // Handle image file (gallery) decoding
  const handleFileInput = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromImageElement(img);
        if (result) {
          setScannedCode(result.getText());
          setIsScannedFromDevice(true);
        }
      } catch (err) {
        console.error('decode image error', err);
        setError('Barcode tidak terbaca dari gambar');
      } finally {
        URL.revokeObjectURL(img.src);
      }
    };
  };

  const handleVerifyItem = useCallback(async () => {
    if (!scannedCode.trim()) {
      setError('Silakan input atau scan barcode terlebih dahulu');
      return;
    }

    const currentItem = items[currentItemIndex];
    const currentStatus = verificationStatus[currentItem.id];
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const res = await fetch(
        `${apiUrl}/api/resi_items/${currentItem.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanned_code: scannedCode.toUpperCase() }),
        }
      );

      const result = await res.json();

      // Stop scanner ketika ada result (benar atau salah)
      stopScanner();

      // Check if barcode matches current item
      if (!res.ok || !result.verified) {
        // Barcode tidak sesuai
        setModalData({
          type: 'mismatch',
          itemName: currentItem.item_name,
          itemCode: currentItem.item_code,
          scannedCode: scannedCode.toUpperCase(),
          message: 'Barcode yang discan tidak sesuai dengan item yang ada di resi',
        });
        setShowModal(true);
        setScannedCode('');
        return;
      }

      // Increment scanned count
      const newScannedCount = (currentStatus.scannedCount || 0) + 1;
      const isItemFullyScanned = newScannedCount >= currentStatus.requiredCount;

      // Update verification status
      setVerificationStatus((prev) => ({
        ...prev,
        [currentItem.id]: {
          verified: isItemFullyScanned ? true : false,
          scanned: true,
          scannedCount: newScannedCount,
          requiredCount: currentStatus.requiredCount,
          result,
        },
      }));

      setScannedCode('');

      // Show success modal
      const allItems = items.every((item, idx) => {
        if (idx === currentItemIndex) {
          return isItemFullyScanned;
        }
        return verificationStatus[item.id]?.verified;
      });

      setModalData({
        type: 'success',
        itemName: currentItem.item_name,
        itemCode: currentItem.item_code,
        scanCount: newScannedCount,
        requiredCount: currentStatus.requiredCount,
        message: isItemFullyScanned ? `${currentItem.item_name} berhasil discan` : `Scan ${newScannedCount}/${currentStatus.requiredCount}`,
        isComplete: isItemFullyScanned,
        hasNext: currentItemIndex < items.length - 1,
        allVerified: allItems,
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setError('Gagal verifikasi item');
    }
  }, [items, currentItemIndex, scannedCode, verificationStatus]);

  const handleModalAction = () => {
    if (modalData.type === 'success') {
      if (modalData.isComplete) {
        // Item fully scanned, move to next
        if (modalData.hasNext) {
          setCurrentItemIndex(currentItemIndex + 1);
        }
      }
      setShowModal(false);
      // Restart scanner jika belum selesai semua
      if (!modalData.allVerified) {
        setTimeout(() => {
          startScanner();
        }, 300);
      }
    } else if (modalData.type === 'mismatch') {
      setShowModal(false);
      // Restart scanner untuk coba lagi
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };

  useEffect(() => {
    fetchResiDetail();
  }, [resiId, fetchResiDetail]);

  // Auto-verify when code is scanned from device/camera
  useEffect(() => {
    if (scannedCode && isScannedFromDevice) {
      const timer = setTimeout(() => {
        handleVerifyItem();
        setIsScannedFromDevice(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [scannedCode, isScannedFromDevice, handleVerifyItem]);

  const allVerified = items.every((item) => verificationStatus[item.id]?.verified);

  if (loading) {
    return (
      <div className="validasi-detail-container">
        <nav className="validasi-nav">
          <button onClick={() => navigate('/validasi')} className="back-btn">
            ← Kembali
          </button>
          <h1>Validasi Detail</h1>
        </nav>
        <div className="content">Memuat data...</div>
      </div>
    );
  }

  if (!resi) {
    return (
      <div className="validasi-detail-container">
        <nav className="validasi-nav">
          <button onClick={() => navigate('/validasi')} className="back-btn">
            ← Kembali
          </button>
          <h1>Validasi Detail</h1>
        </nav>
        <div className="error-message">Resi tidak ditemukan</div>
      </div>
    );
  }

  const currentItem = items[currentItemIndex];
  const currentStatus = verificationStatus[currentItem?.id];

  return (
    <div className="validasi-detail-container">
      <nav className="validasi-nav">
        <div className="nav-inner">
          <button onClick={() => navigate('/validasi')} className="back-btn">
            ← Kembali
          </button>
          <div>
            <h1>Validasi Resi</h1>
            <p className="resi-number">{resi.resi_number}</p>
          </div>
        </div>
      </nav>

      <div className="validasi-detail-content">
        {error && (
          <div className="error-message">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
            </svg>
            {error}
          </div>
        )}

        <div className="validation-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(Object.values(verificationStatus).reduce((sum, s) => sum + (s.scannedCount || 0), 0) / Object.values(verificationStatus).reduce((sum, s) => sum + s.requiredCount, 0)) * 100}%`,
              }}
            ></div>
          </div>
          <p className="progress-text">
            {Object.values(verificationStatus).reduce((sum, s) => sum + (s.scannedCount || 0), 0)} / {Object.values(verificationStatus).reduce((sum, s) => sum + s.requiredCount, 0)}{' '}
            scan selesai
          </p>
        </div>

        {allVerified && (
          <div className="success-message">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
            Semua item sudah terverifikasi!
          </div>
        )}

        <div className="scanner-section">
          <div className="current-item">
            <h3>Item {currentItemIndex + 1} dari {items.length}</h3>
            <div className="item-details">
              <div className="detail-row">
                <span className="label">Kode Barang:</span>
                <span className="value">{currentItem.item_code}</span>
              </div>
              <div className="detail-row">
                <span className="label">Nama Barang:</span>
                <span className="value">{currentItem.item_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Kuantitas:</span>
                <span className="value">{currentItem.quantity_item}</span>
              </div>
              <div className="detail-row">
                <span className="label">Scan Progress:</span>
                <span className="value" style={{ color: currentStatus?.scannedCount >= currentStatus?.requiredCount ? '#28a745' : '#ffc107' }}>
                  {currentStatus?.scannedCount || 0} / {currentStatus?.requiredCount || 0}
                </span>
              </div>
            </div>
          </div>

          {!currentStatus?.verified ? (
            <div className="scan-form">
              <label htmlFor="scanCode">Scan Barcode atau Ketik Kode: ({currentStatus?.scannedCount || 0}/{currentStatus?.requiredCount || 0})</label>
              <div className="scan-controls">
                <div className="scan-input-wrap">
                  <input
                    id="scanCode"
                    type="text"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyItem()}
                    placeholder="Arahkan scanner ke barcode atau pilih gambar..."
                    className="scan-input"
                  />
                </div>
                <div className="scan-action-buttons">
                  <button onClick={handleVerifyItem} className="verify-btn">
                    Verifikasi
                  </button>
                  {!scanning ? (
                    <button onClick={startScanner} className="verify-btn secondary-btn">
                      Buka Kamera
                    </button>
                  ) : (
                    <button onClick={stopScanner} className="verify-btn danger-btn">
                      Hentikan Kamera
                    </button>
                  )}
                </div>
              </div>

              <div className="scan-file">
                <input type="file" accept="image/*" onChange={handleFileInput} />
              </div>

              <div className="scan-video-wrap">
                <video ref={videoRef} className="scan-video" autoPlay muted />
              </div>

              {scannedCode && (
                <div style={{ marginTop: 8, color: '#333' }}>
                  Ter-scan: <strong>{scannedCode}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="verification-result verified">
              <div className="icon">✓</div>
              <p>Item ini sudah terverifikasi</p>
            </div>
          )}
        </div>

        <div className="items-summary">
          <h3>Daftar Item</h3>
          <div className="items-table">
            {items.map((item, index) => {
              const status = verificationStatus[item.id];
              return (
                <div
                  key={item.id}
                  className={`item-row ${status?.verified ? 'verified' : ''} ${
                    index === currentItemIndex ? 'active' : ''
                  }`}
                >
                  <div className="item-number">{index + 1}</div>
                  <div className="item-info">
                    <span className="code">{item.item_code}</span>
                    <span className="name">{item.item_name}</span>
                  </div>
                  <div className="item-qty">×{item.quantity_item}</div>
                  {status?.verified ? (
                    <div className="status verified">✓ ({status.scannedCount}/{status.requiredCount})</div>
                  ) : (
                    <div className="status pending">
                      {status?.scannedCount || 0}/{status?.requiredCount || 0}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {allVerified && (
          <div className="form-actions">
            <button onClick={() => navigate('/validasi')} className="done-btn">
              Selesai & Lanjut ke Resi Berikutnya
            </button>
          </div>
        )}
      </div>

      {/* Modal for verification feedback */}
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalData.type}`}>
            {modalData.type === 'success' && (
              <>
                <div className="modal-icon success-icon">✓</div>
                <h2>{modalData.message}</h2>
                <div className="modal-item-info">
                  <p><strong>Kode:</strong> {modalData.itemCode}</p>
                  <p><strong>Nama:</strong> {modalData.itemName}</p>
                  <p className="scan-progress">
                    Scan: <strong>{modalData.scanCount}/{modalData.requiredCount}</strong>
                  </p>
                </div>
                <div className="modal-actions">
                  {modalData.isComplete && !modalData.allVerified ? (
                    <button onClick={handleModalAction} className="modal-btn next-btn">
                      Lanjut ke Item Berikutnya →
                    </button>
                  ) : modalData.allVerified ? (
                    <button onClick={() => {
                      setShowModal(false);
                      // Jangan restart scanner jika semua sudah terverifikasi
                    }} className="modal-btn finish-btn">
                      Lihat Ringkasan
                    </button>
                  ) : (
                    <button onClick={handleModalAction} className="modal-btn continue-btn">
                      Lanjut Scan
                    </button>
                  )}
                </div>
              </>
            )}
            {modalData.type === 'mismatch' && (
              <>
                <div className="modal-icon error-icon">✕</div>
                <h2>Barang Tidak Sesuai</h2>
                <div className="modal-item-info">
                  <p className="expected">
                    <strong>⚠ Diharapkan:</strong> {modalData.itemCode} - {modalData.itemName}
                  </p>
                  <p className="scanned">
                    <strong>🔍 Ter-Scan:</strong> {modalData.scannedCode}
                  </p>
                </div>
                <div className="modal-actions">
                  <button onClick={handleModalAction} className="modal-btn retry-btn">
                    Coba Lagi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
