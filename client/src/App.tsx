import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Setores from './pages/Setores';
import Locais from './pages/Locais';
import Equipamentos from './pages/Equipamentos';
import Relatorios from './pages/Relatorios';
import Motores from './pages/Motores';
import Analisadores from './pages/Analisadores';
import GeradorInspecoes from './pages/GeradorInspecoes';
import Configuracoes from './pages/Configuracoes';
import './App.css';

function App() {
  return (
    <Router>
      <AccessibilityProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="usuarios" element={<Usuarios />} />
                    <Route path="setores" element={<Setores />} />
                    <Route path="locais" element={<Locais />} />
                    <Route path="equipamentos" element={<Equipamentos />} />
                    <Route path="motores" element={<Motores />} />
                    <Route path="analisadores" element={<Analisadores />} />
                    <Route path="gerador-inspecoes" element={<GeradorInspecoes />} />
                    <Route path="configuracoes" element={<Configuracoes />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </Router>
  );
}

export default App;
