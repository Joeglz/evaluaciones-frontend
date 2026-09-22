import React, { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import Fase2AreaManagement from './Fase2AreaManagement';
import Fase2Evaluaciones from './Fase2Evaluaciones';
import Fase2Examenes from './Fase2Examenes';
import Fase2Multihabilidad from './Fase2Multihabilidad';
import Fase2UserTechnologies from './Fase2UserTechnologies';
import './Fase2Prototype.css';

type Fase2Tab = 'areas' | 'evaluaciones' | 'usuarios' | 'examenes' | 'multihabilidad';

interface Fase2PrototypeProps {
  onBack: () => void;
}

const TABS: { id: Fase2Tab; label: string }[] = [
  { id: 'areas', label: 'Gestión de áreas' },
  { id: 'evaluaciones', label: 'Evaluaciones' },
  { id: 'usuarios', label: 'Usuarios × tecnologías' },
  { id: 'examenes', label: 'Exámenes' },
  { id: 'multihabilidad', label: 'Multihabilidad' },
];

const Fase2Prototype: React.FC<Fase2PrototypeProps> = ({ onBack }) => {
  const [tab, setTab] = useState<Fase2Tab>('areas');

  return (
    <div className="fase2-prototype">
      <div className="fase2-banner">
        Prototipo + <strong>piloto Strap</strong>: catálogo y matriz hablan con la API. Evaluaciones en el
        menú principal respetan el candado N1 si el área tiene Fase 2 activa.
      </div>
      <div className="fase2-header" style={{ padding: '0 1rem', marginBottom: 0 }}>
        <button type="button" className="fase2-btn-back" onClick={onBack}>
          <FaArrowLeft /> Ajustes
        </button>
      </div>

      <div className="fase2-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`fase2-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="fase2-content">
        {tab === 'areas' && <Fase2AreaManagement />}
        {tab === 'evaluaciones' && <Fase2Evaluaciones />}
        {tab === 'usuarios' && <Fase2UserTechnologies />}
        {tab === 'examenes' && <Fase2Examenes />}
        {tab === 'multihabilidad' && <Fase2Multihabilidad />}
      </div>
    </div>
  );
};

export default Fase2Prototype;
