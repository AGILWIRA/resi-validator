import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResiDetail from './pages/ResiDetail';
import InputResi from './pages/InputResi';
import ValidasiResi from './pages/ValidasiResi';
import ValidasiDetail from './pages/ValidasiDetail';

function App() {
  // Suppress MetaMask extension errors jika extension tidak tersedia
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.ethereum) {
      // Prevent MetaMask extension error jika tidak terinstall
      window.ethereum = undefined;
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/input-resi" element={<InputResi />} />
        <Route path="/resi/:id" element={<ResiDetail />} />
        <Route path="/validasi" element={<ValidasiResi />} />
        <Route path="/validasi-detail/:resiId" element={<ValidasiDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
