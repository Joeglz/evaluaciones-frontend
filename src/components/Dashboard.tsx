import React, { useState, useEffect } from 'react';
import { 
  FaClipboardList, 
  FaChartBar, 
  FaBell, 
  FaComments, 
  FaCog
} from 'react-icons/fa';
import Settings from './Settings';
import Evaluaciones from './Evaluaciones';
import Notificaciones from './Notificaciones';
import Reportes from './Reportes';
import './Dashboard.css';

interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_admin?: boolean;
  is_evaluador?: boolean;
}

interface DashboardProps {
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('home');

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

  const renderContent = () => {
    switch (activeView) {
      case 'evaluaciones':
        // Solo mostrar evaluaciones para administradores
        if (user?.role === 'ADMIN' || user?.is_admin) {
          return <Evaluaciones />;
        } else {
          return (
            <div className="dashboard-content">
              <div className="access-denied">
                <h2>Acceso Restringido</h2>
                <p>Esta sección solo está disponible para administradores.</p>
              </div>
            </div>
          );
        }
      case 'ajustes':
        return <Settings />;
      case 'notificaciones':
        return <Notificaciones />;
      case 'reportes':
        return <Reportes />;
      case 'home':
      default:
        return (
          <div className="dashboard-content">
            <p>Contenido del dashboard aquí...</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header con mensaje de bienvenida */}
      {(activeView === 'home' ||
        activeView === 'ajustes' ||
        activeView === 'evaluaciones' ||
        activeView === 'reportes') && (
        <header className="dashboard-header">
          <div className="welcome-message">
            <h1>Hola {getDisplayName()}, ¿qué quieres hacer hoy?</h1>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </header>
      )}

      {/* Contenido principal */}
      <main className="dashboard-main">
        {renderContent()}
      </main>

      {/* Menú inferior */}
      <nav className="bottom-menu">
        <div 
          className={`menu-item ${activeView === 'evaluaciones' ? 'active' : ''}`}
          onClick={() => setActiveView('evaluaciones')}
        >
          <FaClipboardList className="menu-icon" />
          <span>Evaluaciones</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'reportes' ? 'active' : ''}`}
          onClick={() => setActiveView('reportes')}
        >
          <FaChartBar className="menu-icon" />
          <span>Reportes</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'notificaciones' ? 'active' : ''}`}
          onClick={() => setActiveView('notificaciones')}
        >
          <FaBell className="menu-icon" />
          <span>Notificaciones</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'mensajes' ? 'active' : ''}`}
          onClick={() => setActiveView('mensajes')}
        >
          <FaComments className="menu-icon" />
          <span>Mensajes</span>
        </div>
        <div 
          className={`menu-item ${activeView === 'ajustes' ? 'active' : ''}`}
          onClick={() => setActiveView('ajustes')}
        >
          <FaCog className="menu-icon" />
          <span>Ajustes</span>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
