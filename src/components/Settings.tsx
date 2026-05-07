import React, { useState, useMemo, useEffect } from 'react';
import {
  FaUsers,
  FaBuilding,
  FaUser,
  FaChartBar
} from 'react-icons/fa';
import UserManagement from './UserManagement';
import AreaManagement from './AreaManagement';
import UserProfile from './UserProfile';
import EvaluacionesManagement from './EvaluacionesManagement';
import './Settings.css';

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

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return allowedSections.includes('users') ? <UserManagement /> : renderAccessDenied();
      case 'areas':
        return allowedSections.includes('areas') ? <AreaManagement /> : renderAccessDenied();
      case 'plantillas':
        return allowedSections.includes('plantillas') ? <EvaluacionesManagement /> : renderAccessDenied();
      case 'profile':
        return <UserProfile />;
      case 'main':
      default:
        return (
          <div className="settings-main">
            <div className="settings-header">
              <h1>Ajustes del Sistema</h1>
              <p>Gestiona la configuración del sistema de evaluaciones</p>
            </div>

            <div className="settings-grid">
              {allowedSections.includes('profile') && (
                <div 
                  className="settings-card"
                  onClick={() => setActiveSection('profile')}
                >
                  <div className="settings-card-icon">
                    <FaUser />
                  </div>
                  <div className="settings-card-content">
                    <h3>Mi Perfil</h3>
                    <p>Edita tu información personal</p>
                  </div>
                  <div className="settings-card-arrow">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('users') && (
                <div 
                  className="settings-card"
                  onClick={() => setActiveSection('users')}
                >
                  <div className="settings-card-icon">
                    <FaUsers />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Usuarios</h3>
                    <p>Administra usuarios, roles y permisos del sistema</p>
                  </div>
                  <div className="settings-card-arrow">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('areas') && (
                <div 
                  className="settings-card"
                  onClick={() => setActiveSection('areas')}
                >
                  <div className="settings-card-icon">
                    <FaBuilding />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Áreas</h3>
                    <p>Crea y administra las áreas de trabajo</p>
                  </div>
                  <div className="settings-card-arrow">
                    →
                  </div>
                </div>
              )}

              {allowedSections.includes('plantillas') && (
                <div 
                  className="settings-card"
                  onClick={() => setActiveSection('plantillas')}
                >
                  <div className="settings-card-icon">
                    <FaChartBar />
                  </div>
                  <div className="settings-card-content">
                    <h3>Gestión de Plantillas</h3>
                    <p>Crea y administra plantillas de evaluación</p>
                  </div>
                  <div className="settings-card-arrow">
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
