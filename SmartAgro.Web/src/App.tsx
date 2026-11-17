import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GreenhouseProvider } from './context/GreenhouseContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GreenhouseProvider>
          <Toaster position="top-right" />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardLayout />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GreenhouseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}