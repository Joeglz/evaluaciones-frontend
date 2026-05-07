import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FaClipboardList, 
  FaChartBar, 
  FaBell, 
  FaComments, 
  FaCog,
  FaArrowLeft
} from 'react-icons/fa';
import { apiService } from '../services/api';
import Settings from './Settings';
import Evaluaciones from './Evaluaciones';
import Notificaciones from './Notificaciones';
import Reportes from './Reportes';
import { TopbarProvider, useTopbar } from '../contexts/TopbarContext';
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

const DashboardInner: React.FC<DashboardProps> = ({ onLogout }) => {
  const { override: topbarOverride } = useTopbar();
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('home');
  const [evaluacionUsuarioIdParaAbrir, setEvaluacionUsuarioIdParaAbrir] = useState<number | null>(null);
  const [firmaDesdeNotificaciones, setFirmaDesdeNotificaciones] = useState(false);
  const [notificacionesNoLeidasCount, setNotificacionesNoLeidasCount] = useState<number>(0);
  const [settingsResetSignal, setSettingsResetSignal] = useState<number>(0);
  const [settingsSectionTitle, setSettingsSectionTitle] = useState<string | null>(null);

  const handleSettingsSectionChange = useCallback((title: string | null) => {
    setSettingsSectionTitle(title);
  }, []);

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
    if (viewKey === 'ajustes') {
      setSettingsResetSignal((prev) => prev + 1);
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
        return (
          <Settings
            userRole={role}
            resetSignal={settingsResetSignal}
            onSectionChange={handleSettingsSectionChange}
          />
        );
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

  const bottomMenuRef = React.useRef<HTMLElement | null>(null);

  // Safari iPad/iPhone: tras enfocar y luego cerrar el teclado virtual, el
  // documento puede quedar desplazado verticalmente o el viewport reportar
  // una altura "encogida". Reseteamos el scroll del documento y forzamos un
  // pequeño reflujo de #root para que iOS recalcule 100dvh correctamente.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const resetScroll = () => {
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      body.scrollTop = 0;
      if (root) {
        root.scrollTop = 0;
        // Trigger reflow para que Safari recalcule 100dvh tras el teclado.
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        root.offsetHeight;
      }
    };

    const reapplyWithRetries = () => {
      const checkpoints = [0, 60, 150, 300, 600, 1000];
      checkpoints.forEach((ms) => window.setTimeout(resetScroll, ms));
    };

    resetScroll();

    window.addEventListener('orientationchange', reapplyWithRetries);
    window.addEventListener('focusout', reapplyWithRetries);
    window.visualViewport?.addEventListener('resize', resetScroll);

    return () => {
      window.removeEventListener('orientationchange', reapplyWithRetries);
      window.removeEventListener('focusout', reapplyWithRetries);
      window.visualViewport?.removeEventListener('resize', resetScroll);
    };
  }, []);

  // Safari iPad/iPhone: bloquea explícitamente el gesto de scroll cuando se
  // arrastra sobre la barra inferior fija para que no encadene el rubber-band
  // del viewport. `touch-action: none` no siempre basta en versiones antiguas.
  useEffect(() => {
    const node = bottomMenuRef.current;
    if (!node) return;
    const block = (event: TouchEvent) => {
      event.preventDefault();
    };
    node.addEventListener('touchmove', block, { passive: false });
    return () => node.removeEventListener('touchmove', block);
  }, []);

  // Safari iPad/iPhone: bloquea el rubber-band del viewport.
  // Detección dinámica: subimos por el DOM desde el target del touch y sólo
  // permitimos el gesto si encontramos un ancestro que realmente tiene scroll
  // disponible en la dirección del arrastre. Cubre listas, modales, formularios
  // y cualquier scroll nuevo sin necesidad de marcar manualmente.
  useEffect(() => {
    let lastTouchY = 0;

    const isFormElement = (el: HTMLElement): boolean => {
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    // Sube buscando el primer ancestro con scroll real en Y. Devuelve null si
    // ninguno puede absorber el gesto.
    const findScrollableAncestor = (
      target: EventTarget | null,
      deltaY: number
    ): HTMLElement | null => {
      let el: HTMLElement | null = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (isFormElement(el)) return el;
        const style = window.getComputedStyle(el);
        const ovy = style.overflowY;
        const canScroll =
          (ovy === 'auto' || ovy === 'scroll') &&
          el.scrollHeight > el.clientHeight;
        if (canScroll) {
          // ¿Tiene rango disponible en la dirección del arrastre?
          const atTop = el.scrollTop <= 0;
          const atBottom =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if (deltaY < 0 && !atBottom) return el; // arrastre hacia arriba => scroll hacia abajo
          if (deltaY > 0 && !atTop) return el; // arrastre hacia abajo => scroll hacia arriba
          // Si está en el borde, sigue subiendo a buscar otro ancestro
        }
        el = el.parentElement;
      }
      return null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        lastTouchY = event.touches[0].clientY;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const currentY = event.touches[0].clientY;
      const deltaY = currentY - lastTouchY;
      lastTouchY = currentY;
      const scrollable = findScrollableAncestor(event.target, deltaY);
      if (!scrollable) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const bottomMenu = (
    <nav
      className="bottom-menu"
      aria-label="Navegación principal"
      ref={bottomMenuRef}
    >
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

  const showHeader =
    activeView === 'home' ||
    activeView === 'ajustes' ||
    activeView === 'evaluaciones' ||
    activeView === 'reportes';

  return (
    <>
      <div className="dashboard-container">
        {/* Cabecera: muestra el título de la sección actual o un override
            contextual (p.ej. al editar un usuario en Ajustes). */}
        {showHeader && (
          <header
            className={`dashboard-header${topbarOverride ? ' dashboard-header--override' : ''}`}
          >
            {topbarOverride ? (
              <div className="dashboard-header__override">
                {topbarOverride.onBack && (
                  <button
                    type="button"
                    className="dashboard-header__back"
                    onClick={topbarOverride.onBack}
                    title={topbarOverride.backLabel || 'Volver'}
                  >
                    <FaArrowLeft aria-hidden />
                    <span className="dashboard-header__back-label">
                      {topbarOverride.backLabel || 'Volver'}
                    </span>
                  </button>
                )}
                <div className="dashboard-header__heading">
                  {topbarOverride.kicker && (
                    <span className="dashboard-header__kicker">
                      {topbarOverride.kicker}
                    </span>
                  )}
                  <div className="dashboard-header__title-row">
                    <h1 className="dashboard-header__title">
                      {topbarOverride.title}
                    </h1>
                    {topbarOverride.badge && (
                      <span
                        className={`role-badge ${topbarOverride.badge.className || ''}`}
                      >
                        {topbarOverride.badge.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="welcome-message">
                <h1>
                  {activeView === 'ajustes' && settingsSectionTitle
                    ? settingsSectionTitle
                    : `Hola ${getDisplayName()}, ¿qué quieres hacer hoy?`}
                </h1>
              </div>
            )}
            <button onClick={handleLogout} className="logout-button">
              Cerrar Sesión
            </button>
          </header>
        )}

        <main
          data-scroll="true"
          className={`dashboard-main${
            activeView === 'ajustes' && settingsSectionTitle ? ' dashboard-main--inner-scroll' : ''
          }`}
        >
          {renderContent()}
        </main>
        {bottomMenu}
      </div>
    </>
  );
};

const Dashboard: React.FC<DashboardProps> = (props) => (
  <TopbarProvider>
    <DashboardInner {...props} />
  </TopbarProvider>
);

export default Dashboard;
