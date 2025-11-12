import React, { useState } from 'react';
import { 
  FaUsers, 
  FaBuilding, 
  FaCog,
  FaArrowLeft,
  FaUser,
  FaChartBar
} from 'react-icons/fa';
import UserManagement from './UserManagement';
import AreaManagement from './AreaManagement';
import UserProfile from './UserProfile';
import EvaluacionesManagement from './EvaluacionesManagement';
import './Settings.css';

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('main');

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'areas':
        return <AreaManagement />;
      case 'evaluaciones':
        return <EvaluacionesManagement />;
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
              <div 
                className="settings-card"
                onClick={() => setActiveSection('profile')}
              >
                <div className="settings-card-icon">
                  <FaUser />
                </div>
                <div className="settings-card-content">
                  <h3>Mi Perfil</h3>
                  <p>Edita tu información personal y firma digital</p>
                </div>
                <div className="settings-card-arrow">
                  →
                </div>
              </div>

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

              <div 
                className="settings-card"
                onClick={() => setActiveSection('evaluaciones')}
              >
                <div className="settings-card-icon">
                  <FaChartBar />
                </div>
                <div className="settings-card-content">
                  <h3>Gestión de Evaluaciones</h3>
                  <p>Crea y administra evaluaciones de competencias</p>
                </div>
                <div className="settings-card-arrow">
                  →
                </div>
              </div>

            </div>
          </div>
        );
    }
  };

  const renderHeader = () => {
    if (activeSection === 'main') {
      return null;
    }

    return (
      <div className="settings-nav">
        <button 
          className="back-button"
          onClick={() => setActiveSection('main')}
        >
          <FaArrowLeft /> Volver a Ajustes
        </button>
        <div className="settings-nav-title">
          {activeSection === 'profile' && 'Mi Perfil'}
          {activeSection === 'users' && 'Gestión de Usuarios'}
          {activeSection === 'areas' && 'Gestión de Áreas'}
          {activeSection === 'evaluaciones' && 'Gestión de Evaluaciones'}
        </div>
      </div>
    );
  };

  return (
    <div className="settings-container">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};

export default Settings;
