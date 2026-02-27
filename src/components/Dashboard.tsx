import React, { useState, useEffect, useMemo } from 'react';
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

const ROLE_MENU: Record<string, string[]> = {
  ADMIN: ['home', 'evaluaciones', 'reportes', 'notificaciones', 'mensajes', 'ajustes'],
  ENTRENADOR: ['evaluaciones', 'reportes', 'notificaciones', 'mensajes', 'ajustes'],
  SUPERVISOR: ['evaluaciones', 'reportes', 'notificaciones', 'mensajes', 'ajustes'],
  USUARIO: ['evaluaciones', 'notificaciones', 'ajustes'],
  VISOR: ['evaluaciones', 'reportes', 'ajustes'],
};

interface MenuItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: MenuItemConfig[] = [
  { key: 'evaluaciones', label: 'Evaluaciones', icon: FaClipboardList },
  { key: 'reportes', label: 'Reportes', icon: FaChartBar },
  { key: 'notificaciones', label: 'Notificaciones', icon: FaBell },
  { key: 'mensajes', label: 'Mensajes', icon: FaComments },
  { key: 'ajustes', label: 'Ajustes', icon: FaCog },
];

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

  const role = user?.role || 'USUARIO';
  const allowedMenuItems = useMemo(() => ROLE_MENU[role] || ROLE_MENU.USUARIO, [role]);

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

  useEffect(() => {
    if (allowedMenuItems.length === 0) {
      return;
    }

    if (!allowedMenuItems.includes(activeView)) {
      const defaultView = allowedMenuItems.includes('home') ? 'home' : allowedMenuItems[0];
      if (activeView !== defaultView) {
        setActiveView(defaultView);
      }
    }
  }, [allowedMenuItems, activeView]);

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

  const renderAccessDenied = (message?: string) => (
    <div className="dashboard-content">
      <div className="access-denied">
        <h2>Acceso restringido</h2>
        <p>{message || 'No tienes permisos para ver esta sección.'}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'evaluaciones':
        if (!allowedMenuItems.includes('evaluaciones')) {
          return renderAccessDenied();
        }
        return <Evaluaciones userRole={role} currentUser={user} />;
      case 'ajustes':
        if (!allowedMenuItems.includes('ajustes')) {
          return renderAccessDenied();
        }
        return <Settings userRole={role} />;
      case 'reportes':
        if (!allowedMenuItems.includes('reportes')) {
          return renderAccessDenied();
        }
        return <Reportes />;
      case 'notificaciones':
        if (!allowedMenuItems.includes('notificaciones')) {
          return renderAccessDenied();
        }
        return <Notificaciones />;
      case 'mensajes':
        if (!allowedMenuItems.includes('mensajes')) {
          return renderAccessDenied();
        }
        return (
          <div className="dashboard-content">
            <p>El módulo de mensajes estará disponible próximamente.</p>
          </div>
        );
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
        {MENU_ITEMS.filter((item) => allowedMenuItems.includes(item.key)).map((item) => (
          <div
            key={item.key}
            className={`menu-item ${activeView === item.key ? 'active' : ''}`}
            onClick={() => setActiveView(item.key)}
          >
            <item.icon className="menu-icon" />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
