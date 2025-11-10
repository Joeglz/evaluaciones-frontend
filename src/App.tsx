import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { apiService } from './services/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticación al cargar la aplicación
    const checkAuth = async () => {
      try {
        // Verificar si hay datos de usuario en localStorage
    const user = localStorage.getItem('user');
    
        if (user) {
          // Intentar verificar si la sesión está activa
          try {
            const sessionActive = await apiService.checkSession();
            if (sessionActive) {
      setIsAuthenticated(true);
            } else {
              // Sesión expirada, limpiar localStorage
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
              setIsAuthenticated(false);
            }
          } catch (error) {
            // Si hay error al verificar sesión, asumir que no está autenticado
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#e12026',
          fontSize: '1.2rem'
        }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
