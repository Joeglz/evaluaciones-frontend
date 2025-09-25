import React, { useState } from 'react';
import { apiService, LoginRequest } from '../services/api';
import './Login.css';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validación básica de credenciales
      if (username.trim() === '' || password.trim() === '') {
        setError('Por favor, complete todos los campos');
        return;
      }

      // Llamada real a la API de autenticación
      const loginData: LoginRequest = {
        username: username.trim(),
        password: password.trim(),
      };

      const response = await apiService.login(loginData);
      
      if (response.success) {
        setSuccess(true);
        setError('');
        
        // Guardar token si existe
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        // Guardar información del usuario
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        // Mostrar mensaje de éxito por 1 segundo y luego redirigir
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 1000);
      } else {
        setError(response.message || 'Credenciales inválidas');
      }
    } catch (err: any) {
      console.error('Error en login:', err);
      setError(err.message || 'Error al conectar con el servidor. Verifica que el backend esté ejecutándose.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img 
            src="/width_800.png" 
            alt="Avery Dennison Logo" 
            className="logo"
            onError={(e) => {
              console.log('Error loading logo:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        <h1 className="welcome-title">BIENVENIDO</h1>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            <button type="button" className="forgot-password">Olvidé mi contraseña</button>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              ¡Login exitoso! Bienvenido, {username}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
