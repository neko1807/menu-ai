import { Navigate, Route, Routes } from 'react-router-dom';
import UserHome from './pages/UserHome';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UserHome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
