import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import {
  FaUsers,
  FaBuilding,
  FaUser,
  FaChartBar
} from 'react-icons/fa';
import './Settings.css';

const UserManagement = lazy(() => import('./UserManagement'));
const AreaManagement = lazy(() => import('./AreaManagement'));
const UserProfile = lazy(() => import('./UserProfile'));
const EvaluacionesManagement = lazy(() => import('./EvaluacionesManagement'));

interface SettingsProps {
  userRole?: string;
  /**
   * Señal numérica que, al cambiar, regresa Settings a su menú principal.
   * Se incrementa desde Dashboard cuando el usuario toca "Ajustes" en el
   * menú inferior estando ya dentro de Ajustes.
   */
  resetSignal?: number;
  /**
   * Notifica al Dashboard el título de la sección actual de Ajustes para
   * mostrarlo en la cabecera. `null` indica el menú principal de Ajustes.
   */
  onSectionChange?: (title: string | null) => void;
}

const SECTION_TITLES: Record<string, string> = {
  profile: 'Mi Perfil',
  users: 'Gestión de Usuarios',
  areas: 'Gestión de Áreas',
  plantillas: 'Gestión de Plantillas',
};

const Settings: React.FC<SettingsProps> = ({ userRole, resetSignal, onSectionChange }) => {
  const [activeSection, setActiveSection] = useState<string>('main');

  useEffect(() => {
    if (resetSignal !== undefined) {
      setActiveSection('main');
    }
  }, [resetSignal]);

  const allowedSections = useMemo<string[]>(() => {
    switch (userRole) {
      case 'ADMIN':
        return ['profile', 'users', 'areas', 'plantillas'];
      case 'ENTRENADOR':
      case 'SUPERVISOR':
        return ['profile'];
      case 'USUARIO':
      case 'VISOR':
      default:
        return ['profile'];
    }
  }, [userRole]);

  useEffect(() => {
    if (activeSection !== 'main' && !allowedSections.includes(activeSection)) {
      setActiveSection('main');
    }
  }, [activeSection, allowedSections]);

  useEffect(() => {
    if (!onSectionChange) return;
    onSectionChange(SECTION_TITLES[activeSection] ?? null);
  }, [activeSection, onSectionChange]);

  useEffect(() => {
    return () => {
      if (onSectionChange) onSectionChange(null);
    };
  }, [onSectionChange]);

  const renderAccessDenied = () => (
    <div className="access-denied">
      <h2>Acceso restringido</h2>
      <p>No tienes permisos para ver esta sección.</p>
    </div>
  );

  const openSection = (section: string) => {
    setActiveSection(section);
  };

  const onCardKeyDown = (section: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSection(section);
    }
  };

  const renderContent = () => {
    const fallback = <div className="settings-lazy-fallback">Cargando...</div>;
    switch (activeSection) {
      case 'users':
        return allowedSections.includes('users') ? (
          <Suspense fallback={fallback}><UserManagement /></Suspense>
        ) : renderAccessDenied();
      case 'areas':
        return allowedSections.includes('areas') ? (
          <Suspense fallback={fallback}><AreaManagement /></Suspense>
        ) : renderAccessDenied();
      case 'plantillas':
        return allowedSections.includes('plantillas') ? (
          <Suspense fallback={fallback}><EvaluacionesManagement /></Suspense>
        ) : renderAccessDenied();
      case 'profile':
        return (
          <Suspense fallback={fallback}><UserProfile /></Suspense>
        );
      case 'main':
      default:
        return (
          <div className="settings-main">
            <div className="settings-header">
              <h1>Ajustes del Sistema</h1>
              <p>Gestiona la configuración del sistema de evaluaciones</p>
            </div>

            <div className="settings-grid" role="list">
              {allowedSections.includes('profile') && (
                <div
                  className="settings-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => openSection('profile')}
                  onKeyDown={onCardKeyDown('profile')}
                  aria-label="Mi Perfil"
                >
                  <div className="settings-card-icon" aria-hidden="true">
                    <FaUser />
                  </div>
                  <div className="settings-card-content">
                    <h3>Mi Perfil</h3>
                    <p>Edita tu información personal</p>
                  </div>
                  <div className="settings-card-arrow" aria-hidden="true">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('users') && (
                <div
                  className="settings-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => openSection('users')}
                  onKeyDown={onCardKeyDown('users')}
                  aria-label="Gestión de Usuarios"
                >
                  <div className="settings-card-icon" aria-hidden="true">
                    <FaUsers />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Usuarios</h3>
                    <p>Administra usuarios, roles y permisos del sistema</p>
                  </div>
                  <div className="settings-card-arrow" aria-hidden="true">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('areas') && (
                <div
                  className="settings-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => openSection('areas')}
                  onKeyDown={onCardKeyDown('areas')}
                  aria-label="Gestión de Áreas"
                >
                  <div className="settings-card-icon" aria-hidden="true">
                    <FaBuilding />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Áreas</h3>
                    <p>Administra áreas, grupos y posiciones</p>
                  </div>
                  <div className="settings-card-arrow" aria-hidden="true">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('plantillas') && (
                <div
                  className="settings-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => openSection('plantillas')}
                  onKeyDown={onCardKeyDown('plantillas')}
                  aria-label="Gestión de Plantillas"
                >
                  <div className="settings-card-icon" aria-hidden="true">
                    <FaChartBar />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Plantillas</h3>
                    <p>Administra plantillas de evaluación</p>
                  </div>
                  <div className="settings-card-arrow" aria-hidden="true">
                    →
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="settings-container">
      {renderContent()}
    </div>
  );
};

export default Settings;
