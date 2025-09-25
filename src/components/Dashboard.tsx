import React, { useState, useEffect } from 'react';
import { 
  FaClipboardList, 
  FaChartBar, 
  FaBell, 
  FaComments, 
  FaCog 
} from 'react-icons/fa';
import './Dashboard.css';

interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface DashboardProps {
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Obtener información del usuario desde localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    }
  };

  const getDisplayName = () => {
    if (!user) return 'Usuario';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else {
      return user.username;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header con mensaje de bienvenida */}
      <header className="dashboard-header">
        <div className="welcome-message">
          <h1>Hola {getDisplayName()}, ¿qué quieres hacer hoy?</h1>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </header>

      {/* Contenido principal */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <p>Contenido del dashboard aquí...</p>
        </div>
      </main>

      {/* Menú inferior */}
      <nav className="bottom-menu">
        <div className="menu-item">
          <FaClipboardList className="menu-icon" />
          <span>Evaluaciones</span>
        </div>
        <div className="menu-item">
          <FaChartBar className="menu-icon" />
          <span>Reportes</span>
        </div>
        <div className="menu-item">
          <FaBell className="menu-icon" />
          <span>Notificaciones</span>
        </div>
        <div className="menu-item">
          <FaComments className="menu-icon" />
          <span>Mensajes</span>
        </div>
        <div className="menu-item">
          <FaCog className="menu-icon" />
          <span>Ajustes</span>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
