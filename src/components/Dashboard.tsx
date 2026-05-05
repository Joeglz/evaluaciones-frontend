import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  FaClipboardList, 
  FaChartBar, 
  FaBell, 
  FaComments, 
  FaCog
} from 'react-icons/fa';
import { apiService } from '../services/api';
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
  const [evaluacionUsuarioIdParaAbrir, setEvaluacionUsuarioIdParaAbrir] = useState<number | null>(null);
  const [firmaDesdeNotificaciones, setFirmaDesdeNotificaciones] = useState(false);
  const [notificacionesNoLeidasCount, setNotificacionesNoLeidasCount] = useState<number>(0);

  const role = user?.role || 'USUARIO';
  const allowedMenuItems = useMemo(() => ROLE_MENU[role] || ROLE_MENU.USUARIO, [role]);

  const cargarCantidadNotificacionesNoLeidas = useCallback(async () => {
    if (!allowedMenuItems.includes('notificaciones')) return;
    try {
      const lista = await apiService.obtenerNotificaciones({ solo_no_leidas: true });
      setNotificacionesNoLeidasCount(Array.isArray(lista) ? lista.length : 0);
    } catch {
      setNotificacionesNoLeidasCount(0);
    }
  }, [allowedMenuItems]);

  useEffect(() => {
    cargarCantidadNotificacionesNoLeidas();
  }, [cargarCantidadNotificacionesNoLeidas]);

  useEffect(() => {
    cargarCantidadNotificacionesNoLeidas();
    if (activeView === 'notificaciones') {
      const interval = setInterval(cargarCantidadNotificacionesNoLeidas, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [activeView, cargarCantidadNotificacionesNoLeidas]);

  const handleIrAFirmarEvaluacion = (evaluacionUsuarioId: number) => {
    setFirmaDesdeNotificaciones(true);
    setEvaluacionUsuarioIdParaAbrir(evaluacionUsuarioId);
    setActiveView('evaluaciones');
  };

  const handleVolverNotificacionesDesdeFirma = () => {
    setFirmaDesdeNotificaciones(false);
    setEvaluacionUsuarioIdParaAbrir(null);
    setActiveView('notificaciones');
  };

  const handleMenuNavigate = (viewKey: string) => {
    if (viewKey !== 'evaluaciones') {
      setFirmaDesdeNotificaciones(false);
    }
    setActiveView(viewKey);
  };

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
        return (
          <Evaluaciones
            userRole={role}
            currentUser={user}
            evaluacionUsuarioIdParaAbrir={evaluacionUsuarioIdParaAbrir}
            onAbiertoEvaluacionParaFirmar={() => setEvaluacionUsuarioIdParaAbrir(null)}
            firmaDesdeNotificaciones={firmaDesdeNotificaciones}
            onVolverNotificaciones={handleVolverNotificacionesDesdeFirma}
          />
        );
      case 'ajustes':
        if (!allowedMenuItems.includes('ajustes')) {
          return renderAccessDenied();
        }
        return <Settings userRole={role} />;
      case 'reportes':
        if (!allowedMenuItems.includes('reportes')) {
          return renderAccessDenied();
        }
        return <Reportes userRole={role} />;
      case 'notificaciones':
        if (!allowedMenuItems.includes('notificaciones')) {
          return renderAccessDenied();
        }
        return (
          <Notificaciones onIrAFirmarEvaluacion={handleIrAFirmarEvaluacion} onNotificacionesActualizadas={cargarCantidadNotificacionesNoLeidas} />
        );
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

  const bottomMenu = (
    <nav className="bottom-menu" aria-label="Navegación principal">
      {MENU_ITEMS.filter((item) => allowedMenuItems.includes(item.key)).map((item) => (
        <div
          key={item.key}
          className={`menu-item ${activeView === item.key ? 'active' : ''}`}
          onClick={() => handleMenuNavigate(item.key)}
        >
          <div className="menu-item-icon-wrap">
            <item.icon className="menu-icon" />
            {item.key === 'notificaciones' && notificacionesNoLeidasCount > 0 && (
              <span className="menu-item-badge" aria-label={`${notificacionesNoLeidasCount} notificaciones no leídas`}>
                {notificacionesNoLeidasCount > 99 ? '99+' : notificacionesNoLeidasCount}
              </span>
            )}
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
  );

  return (
    <>
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

        <main className="dashboard-main">
          {renderContent()}
        </main>
      </div>
      {createPortal(bottomMenu, document.body)}
    </>
  );
};

export default Dashboard;
