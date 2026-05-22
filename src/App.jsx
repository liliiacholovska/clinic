import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DoctorsPage from './pages/DoctorsPage';
import SchedulePage from './pages/SchedulePage';
import AppointmentsPage from './pages/AppointmentsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/doctors" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/doctors" element={<DoctorsPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/appointments" element={<AppointmentsPage />} />
    </Routes>
  );
}