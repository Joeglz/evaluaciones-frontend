import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaBan, 
  FaCheckCircle, 
  FaSearch,
  FaFilter,
  FaUsers,
  FaBriefcase,
  FaArrowLeft,
  FaChevronDown,
  FaChevronRight
} from 'react-icons/fa';
import { apiService, Area, GrupoNested, PosicionNested, NivelPosicion, Evaluacion, User } from '../services/api';
import './AreaManagement.css';

type AreaWithSupervisores = Area & { supervisores?: Array<{ id: number }> };

const AreaManagement: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Estados para errores de formularios
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'edit'>('list');
  
  // Área seleccionada
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  
  // Estados para niveles y evaluaciones por posición
  const [nivelesPorPosicion, setNivelesPorPosicion] = useState<Record<number, NivelPosicion[]>>({});
  const [evaluacionesPorNivel, setEvaluacionesPorNivel] = useState<Record<number, Evaluacion[]>>({});
  const [evaluacionesPlantillas, setEvaluacionesPlantillas] = useState<Evaluacion[]>([]);
  const [supervisoresDisponibles, setSupervisoresDisponibles] = useState<User[]>([]);
  const [eliminandoEvaluacionId, setEliminandoEvaluacionId] = useState<number | null>(null);
  const [posicionesAbiertas, setPosicionesAbiertas] = useState<Record<string, boolean>>({});
  const [nivelesAbiertos, setNivelesAbiertos] = useState<Record<string, boolean>>({});
  const [showAgregarEvaluacionModal, setShowAgregarEvaluacionModal] = useState(false);
  const [nivelModalInfo, setNivelModalInfo] = useState<{ nivelId: number; posicionId: number } | null>(null);
  const [modalPlantillaId, setModalPlantillaId] = useState<number | null>(null);
  const [modalNombreEvaluacion, setModalNombreEvaluacion] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Formularios
  const [createForm, setCreateForm] = useState({
    name: '',
    is_active: true,
    grupos: [] as GrupoNested[],
    posiciones: [] as PosicionNested[],
    supervisores: [] as number[]
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    is_active: true,
    grupos: [] as GrupoNested[],
    posiciones: [] as PosicionNested[],
    supervisores: [] as number[]
  });

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAreas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Indicador de búsqueda cuando hay cambios en los filtros
  useEffect(() => {
    if (searchTerm || statusFilter) {
      setSearching(true);
    }
  }, [searchTerm, statusFilter]);

  const handleValidationErrors = (error: any): Record<string, string[]> => {
    if (error.name === 'ValidationError' && typeof error.message === 'object') {
      return error.message;
    }
    
    if (error.message && typeof error.message === 'object') {
      return error.message;
    }
    
    if (typeof error.message === 'string') {
      try {
        const parsed = JSON.parse(error.message);
        return parsed;
      } catch {
        return { general: [error.message] };
      }
    }
    
    return { general: ['Error desconocido'] };
  };

  const loadAreas = async () => {
    try {
      if (areas.length === 0) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.is_active = statusFilter === 'active';
      
      const response = await apiService.getAreas(params);
      setAreas(response.results);
      setError(null);
    } catch (err) {
      setError('Error al cargar áreas');
      console.error(err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    
    try {
      await apiService.createArea(createForm);
      setShowCreateModal(false);
      resetCreateForm();
      loadAreas();
      alert('Área creada exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setCreateErrors(validationErrors);
    }
  };

  const handleUpdateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;
    
    setEditErrors({});
    
    try {
      await apiService.updateArea(selectedArea.id, editForm);
      await loadAreas();
      volverALista();
      alert('Área actualizada exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setEditErrors(validationErrors);
    }
  };

  const handleDeleteArea = async () => {
    if (!selectedArea) return;
    
    try {
      await apiService.deleteArea(selectedArea.id);
      setShowDeleteModal(false);
      setSelectedArea(null);
      loadAreas();
      alert('Área eliminada exitosamente');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeactivateArea = async () => {
    if (!selectedArea) return;
    
    try {
      if (selectedArea.is_active) {
        await apiService.deactivateArea(selectedArea.id);
        alert('Área desactivada exitosamente');
      } else {
        await apiService.activateArea(selectedArea.id);
        alert('Área activada exitosamente');
      }
      setShowDeactivateModal(false);
      setSelectedArea(null);
      loadAreas();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const loadSupervisoresDisponibles = async () => {
    if (supervisoresDisponibles.length > 0) {
      return;
    }

    try {
      let page = 1;
      let nextPage: string | null = null;
      const acumulados: User[] = [];

      do {
        const response = await apiService.getUsers({
          role: 'ADMIN,EVALUADOR',
          is_active: true,
          page
        });
        acumulados.push(...(response.results || []));
        nextPage = response.next;
        page += 1;
      } while (nextPage);

      const ordenados = acumulados.sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' })
      );
      setSupervisoresDisponibles(ordenados);
    } catch (err) {
      console.error('Error al cargar supervisores disponibles:', err);
      setSupervisoresDisponibles([]);
    }
  };

  const openEditModal = async (area: Area) => {
    setSelectedArea(area);
    setEditErrors({});
    const areaSupervisores = (area as AreaWithSupervisores).supervisores ?? [];
    const supervisoresIds = areaSupervisores.map((supervisor) => supervisor.id);

    setEditForm({
      name: area.name,
      is_active: area.is_active,
      grupos: area.grupos || [],
      posiciones: area.posiciones || [],
      supervisores: supervisoresIds
    });
    
    if (supervisoresDisponibles.length === 0) {
      await loadSupervisoresDisponibles();
    }
    
    setCurrentView('edit');
    
    // Cargar niveles y evaluaciones para cada posición existente
    if (area.posiciones && area.posiciones.length > 0) {
      await loadNivelesYEvaluaciones(area.posiciones.map(p => p.id));
    }
    
    // Cargar plantillas de evaluaciones
    await loadEvaluacionesPlantillas();
  };

  const openCreateAreaModal = async () => {
    await loadSupervisoresDisponibles();
    setCreateErrors({});
    resetCreateForm();
    setShowCreateModal(true);
  };

  const loadNivelesYEvaluaciones = async (posicionIds: number[]) => {
    const niveles: Record<number, NivelPosicion[]> = {};
    const evaluaciones: Record<number, Evaluacion[]> = {};
    
    for (const posicionId of posicionIds) {
      try {
        // Cargar niveles de la posición
        const nivelesResponse = await apiService.getNivelesPosicion({ posicion_id: posicionId });
        niveles[posicionId] = nivelesResponse.results || [];
        
        // Cargar evaluaciones para cada nivel
        for (const nivel of nivelesResponse.results || []) {
          try {
            const evalResponse = await apiService.getEvaluaciones({ 
              nivel_posicion_id: nivel.id,
              es_plantilla: false
            });
            evaluaciones[nivel.id] = evalResponse.results || [];
          } catch (err) {
            console.error(`Error al cargar evaluaciones para nivel ${nivel.id}:`, err);
            evaluaciones[nivel.id] = [];
          }
        }
      } catch (err) {
        console.error(`Error al cargar niveles para posición ${posicionId}:`, err);
        niveles[posicionId] = [];
      }
    }
    
    setNivelesPorPosicion(niveles);
    setEvaluacionesPorNivel(evaluaciones);
  };

  const loadEvaluacionesPlantillas = async () => {
    try {
      const response = await apiService.getEvaluaciones({ es_plantilla: true });
      setEvaluacionesPlantillas(response.results || []);
    } catch (err) {
      console.error('Error al cargar evaluaciones plantillas:', err);
      setEvaluacionesPlantillas([]);
    }
  };

  const handleEliminarEvaluacionNivel = async (evaluacionId: number, posicionId: number) => {
    const confirmar = window.confirm('¿Eliminar esta evaluación asignada al nivel?');
    if (!confirmar) return;
    try {
      setEliminandoEvaluacionId(evaluacionId);
      await apiService.deleteEvaluacion(evaluacionId);
      await loadNivelesYEvaluaciones([posicionId]);
      alert('Evaluación eliminada correctamente');
    } catch (err: any) {
      console.error('Error al eliminar evaluación del nivel:', err);
      alert(`Error al eliminar la evaluación: ${err.message || err}`);
    } finally {
      setEliminandoEvaluacionId(null);
    }
  };

  const openDeleteModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeactivateModal(true);
  };

  const volverALista = () => {
    setCurrentView('list');
    setSelectedArea(null);
    setEditErrors({});
    setEditForm({
      name: '',
      is_active: true,
      grupos: [],
      posiciones: [],
      supervisores: []
    });
    setNivelesPorPosicion({});
    setEvaluacionesPorNivel({});
    setEliminandoEvaluacionId(null);
    setPosicionesAbiertas({});
    setNivelesAbiertos({});
    setShowAgregarEvaluacionModal(false);
    setNivelModalInfo(null);
    setModalPlantillaId(null);
    setModalNombreEvaluacion('');
    setModalError(null);
  };

  const togglePosicion = (posicionKey: string, defaultOpen: boolean) => {
    setPosicionesAbiertas(prev => {
      const current = prev.hasOwnProperty(posicionKey) ? prev[posicionKey] : defaultOpen;
      return {
        ...prev,
        [posicionKey]: !current
      };
    });
  };

  const handlePosicionHeaderClick = (
    event: React.MouseEvent<HTMLDivElement>,
    posicionKey: string,
    defaultOpen: boolean
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    togglePosicion(posicionKey, defaultOpen);
  };

  const handleNivelHeaderClick = (
    event: React.MouseEvent<HTMLDivElement>,
    posicionId: number,
    nivelNum: number,
    defaultOpen: boolean
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    toggleNivel(posicionId, nivelNum, defaultOpen);
  };

  const abrirModalAgregarEvaluacion = (nivelId: number, posicionId: number) => {
    setNivelModalInfo({ nivelId, posicionId });
    setModalPlantillaId(null);
    setModalNombreEvaluacion('');
    setModalError(null);
    setShowAgregarEvaluacionModal(true);
  };

  const cerrarModalAgregarEvaluacion = () => {
    setShowAgregarEvaluacionModal(false);
    setNivelModalInfo(null);
    setModalPlantillaId(null);
    setModalNombreEvaluacion('');
    setModalError(null);
  };

  const handleModalPlantillaChange = (value: string) => {
    const plantillaId = value ? parseInt(value, 10) : null;
    setModalPlantillaId(plantillaId);
    setModalError(null);

    if (plantillaId) {
      const plantilla = evaluacionesPlantillas.find(p => p.id === plantillaId);
      setModalNombreEvaluacion(plantilla ? plantilla.nombre : '');
    } else {
      setModalNombreEvaluacion('');
    }
  };

  const handleConfirmAgregarEvaluacion = async () => {
    if (!nivelModalInfo) return;
    if (!modalPlantillaId) {
      setModalError('Selecciona una plantilla');
      return;
    }
    if (!modalNombreEvaluacion.trim()) {
      setModalError('Ingresa un nombre para la evaluación');
      return;
    }

    try {
      const plantillaCompleta = await apiService.getEvaluacion(modalPlantillaId);
      await apiService.createEvaluacion({
        nombre: modalNombreEvaluacion.trim(),
        es_plantilla: false,
        nivel_posicion: nivelModalInfo.nivelId,
        plantilla: modalPlantillaId,
        supervisor: null,
        minimo_aprobatorio: plantillaCompleta.minimo_aprobatorio,
        is_active: true,
        puntos_evaluacion: plantillaCompleta.puntos_evaluacion.map(p => ({
          pregunta: p.pregunta,
          orden: p.orden
        })),
        criterios_evaluacion: plantillaCompleta.criterios_evaluacion.map(c => ({
          criterio: c.criterio,
          orden: c.orden
        }))
      });

      await loadNivelesYEvaluaciones([nivelModalInfo.posicionId]);
      cerrarModalAgregarEvaluacion();
    } catch (err: any) {
      const message = err?.message || 'Error al agregar la evaluación';
      setModalError(message);
    }
  };

  const toggleNivel = (posicionId: number, nivelNum: number, abiertoPorDefecto: boolean) => {
    const key = `${posicionId}-${nivelNum}`;
    setNivelesAbiertos(prev => {
      const current = prev.hasOwnProperty(key) ? prev[key] : abiertoPorDefecto;
      return {
        ...prev,
        [key]: !current
      };
    });
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      is_active: true,
      grupos: [],
      posiciones: [],
      supervisores: []
    });
  };

  const handleSupervisorChange = (
    formType: 'create' | 'edit',
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const supervisorId = parseInt(event.target.value, 10);

    if (formType === 'create') {
      setCreateForm((prev) => ({
        ...prev,
        supervisores: supervisorId ? [supervisorId] : []
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        supervisores: supervisorId ? [supervisorId] : []
      }));
    }
  };

  // Funciones para gestionar grupos y posiciones
  const addGrupo = (formType: 'create' | 'edit') => {
    const newGrupo: GrupoNested = {
      name: '',
      is_active: true
    };
    
    if (formType === 'create') {
      setCreateForm({
        ...createForm,
        grupos: [...createForm.grupos, newGrupo]
      });
    } else {
      setEditForm({
        ...editForm,
        grupos: [...editForm.grupos, newGrupo]
      });
    }
  };

  const removeGrupo = (index: number, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      setCreateForm({
        ...createForm,
        grupos: createForm.grupos.filter((_, i) => i !== index)
      });
    } else {
      setEditForm({
        ...editForm,
        grupos: editForm.grupos.filter((_, i) => i !== index)
      });
    }
  };

  const updateGrupo = (index: number, field: keyof GrupoNested, value: any, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      const updatedGrupos = [...createForm.grupos];
      updatedGrupos[index] = { ...updatedGrupos[index], [field]: value };
      setCreateForm({ ...createForm, grupos: updatedGrupos });
    } else {
      const updatedGrupos = [...editForm.grupos];
      updatedGrupos[index] = { ...updatedGrupos[index], [field]: value };
      setEditForm({ ...editForm, grupos: updatedGrupos });
    }
  };

  const addPosicion = (formType: 'create' | 'edit') => {
    const newPosicion: PosicionNested = {
      name: '',
      is_active: true
    };
    
    if (formType === 'create') {
      setCreateForm({
        ...createForm,
        posiciones: [...createForm.posiciones, newPosicion]
      });
    } else {
      setEditForm({
        ...editForm,
        posiciones: [...editForm.posiciones, newPosicion]
      });
    }
  };

  const removePosicion = (posicionIndex: number, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      setCreateForm({
        ...createForm,
        posiciones: createForm.posiciones.filter((_, i) => i !== posicionIndex)
      });
    } else {
      setEditForm({
        ...editForm,
        posiciones: editForm.posiciones.filter((_, i) => i !== posicionIndex)
      });
    }
  };

  const updatePosicion = (posicionIndex: number, field: keyof PosicionNested, value: any, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      const updatedPosiciones = [...createForm.posiciones];
      updatedPosiciones[posicionIndex] = { 
        ...updatedPosiciones[posicionIndex], 
        [field]: value 
      };
      setCreateForm({ ...createForm, posiciones: updatedPosiciones });
    } else {
      const updatedPosiciones = [...editForm.posiciones];
      updatedPosiciones[posicionIndex] = { 
        ...updatedPosiciones[posicionIndex], 
        [field]: value 
      };
      setEditForm({ ...editForm, posiciones: updatedPosiciones });
    }
  };

  const FieldError: React.FC<{ errors: string[] | undefined }> = ({ errors }) => {
    if (!errors || errors.length === 0) return null;
    
    return (
      <div className="field-error">
        {errors.map((error, index) => (
          <span key={index} className="error-text">
            {error}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="area-management-loading">Cargando áreas...</div>;
  }

  return (
    <div className="area-management">
      <div className="area-management-header">
        <h1>{currentView === 'edit' ? `Editar Área${selectedArea ? `: ${selectedArea.name}` : ''}` : 'Gestión de Áreas'}</h1>
        {currentView === 'edit' ? (
          <button className="btn-secondary btn-back" onClick={volverALista}>
            <FaArrowLeft /> Volver
          </button>
        ) : (
          <button className="btn-primary" onClick={openCreateAreaModal}>
            <FaPlus /> Nueva Área
          </button>
        )}
      </div>

      {currentView === 'list' ? (
        <>
          <div className="area-management-filters">
            <div className="search-box">
              {searching ? (
                <div className="search-loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <FaSearch />
              )}
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <FaFilter />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="areas-table-container">
            <table className="areas-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr key={area.id}>
                    <td>{area.name}</td>
                    <td>
                      <span className={`status-badge ${area.is_active ? 'status-active' : 'status-inactive'}`}>
                        {area.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>{new Date(area.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(area)}
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn-icon btn-deactivate" 
                        onClick={() => openDeactivateModal(area)}
                        title={area.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {area.is_active ? <FaBan /> : <FaCheckCircle />}
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => openDeleteModal(area)}
                        title="Eliminar"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        selectedArea && (
          <div className="area-edit-view">
            <form onSubmit={handleUpdateArea} className="area-edit-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required
                    className={editErrors.name ? 'field-error-input' : ''}
                  />
                  <FieldError errors={editErrors.name} />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    />
                    Área activa
                  </label>
                </div>

              <div className="form-group full-width">
                <label>Supervisores del Área</label>
                {supervisoresDisponibles.length === 0 ? (
                  <div className="field-helper">
                    No hay supervisores disponibles para asignar.
                  </div>
                ) : (
                  <>
                    <select
                      value={editForm.supervisores[0]?.toString() || ''}
                      onChange={(event) => handleSupervisorChange('edit', event)}
                    >
                      <option value="">Seleccionar supervisor...</option>
                      {supervisoresDisponibles.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name} — {supervisor.role_display}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <FieldError errors={editErrors.supervisores} />
              </div>
              </div>

              <div className="edit-sections">
                <section className="edit-section grupos-edit">
                  <div className="section-title">
                    <h3><FaUsers /> Grupos</h3>
                    <button 
                      type="button" 
                      className="btn-add-grupo"
                      onClick={() => addGrupo('edit')}
                    >
                      <FaPlus /> Agregar Grupo
                    </button>
                  </div>
                  {editForm.grupos.length === 0 ? (
                    <div className="section-empty">
                      No hay grupos configurados para esta área.
                    </div>
                  ) : (
                    <div className="grupos-tablet-grid">
                      {editForm.grupos.map((grupo, grupoIndex) => (
                        <div key={grupoIndex} className="grupo-card-edit">
                          <div className="grupo-card-edit-header">
                            <span className="grupo-badge-edit">{grupo.name || `Grupo ${grupoIndex + 1}`}</span>
                            <button 
                              type="button" 
                              className="btn-remove-grupo"
                              onClick={() => removeGrupo(grupoIndex, 'edit')}
                              title="Eliminar grupo"
                            >
                              <FaTrash />
                            </button>
                          </div>
                          <div className="grupo-card-edit-body">
                            <label>Nombre del Grupo *</label>
                            <input
                              type="text"
                              value={grupo.name}
                              onChange={(e) => updateGrupo(grupoIndex, 'name', e.target.value, 'edit')}
                              placeholder="Ingresa el nombre del grupo"
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="edit-section posiciones-edit">
                  <div className="section-title">
                    <h3><FaBriefcase /> Posiciones</h3>
                    <button 
                      type="button" 
                      className="btn-add-posicion"
                      onClick={() => addPosicion('edit')}
                    >
                      <FaPlus /> Agregar Posición
                    </button>
                  </div>

                  {editForm.posiciones.length === 0 ? (
                    <div className="section-empty">
                      No hay posiciones configuradas para esta área.
                    </div>
                  ) : (
                    <div className="posiciones-tablet-grid">
                      {editForm.posiciones.map((posicion, posicionIndex) => {
                        const posicionId = posicion.id ?? 0;
                        const niveles = nivelesPorPosicion[posicionId] || [];
                        const nivelesDisponibles: number[] = [1, 2, 3, 4];
                        const posicionKey = posicion.id ? `pos-${posicion.id}` : `pos-nuevo-${posicionIndex}`;
                        const defaultOpen = false;
                        const isPosicionOpen = posicionesAbiertas.hasOwnProperty(posicionKey)
                          ? posicionesAbiertas[posicionKey]
                          : defaultOpen;

                        return (
                          <div key={posicionIndex} className={`posicion-card-edit ${isPosicionOpen ? 'open' : ''}`}>
                            <div
                              className="posicion-card-edit-header"
                              onClick={(event) => handlePosicionHeaderClick(event, posicionKey, defaultOpen)}
                            >
                              <button
                                type="button"
                                className="posicion-toggle"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePosicion(posicionKey, defaultOpen);
                                }}
                                title={isPosicionOpen ? 'Ocultar detalles de la posición' : 'Mostrar detalles de la posición'}
                              >
                                {isPosicionOpen ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                              <div className="posicion-meta">
                                <span className="posicion-badge">{posicion.name || `Posición ${posicionIndex + 1}`}</span>
                                {posicion.id && (
                                  <span className="posicion-id">ID: {posicion.id}</span>
                                )}
                              </div>
                              <button 
                                type="button" 
                                className="btn-remove-posicion"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removePosicion(posicionIndex, 'edit');
                                }}
                                title="Eliminar posición"
                              >
                                <FaTrash />
                              </button>
                            </div>

                            <div className={`posicion-card-edit-content ${isPosicionOpen ? 'open' : ''}`}>
                              <div className="posicion-card-edit-body">
                                <label>Nombre de la Posición *</label>
                                <input
                                  type="text"
                                  value={posicion.name}
                                  onChange={(e) => updatePosicion(posicionIndex, 'name', e.target.value, 'edit')}
                                  placeholder="Ingresa el nombre de la posición"
                                  required
                                />
                              </div>

                              {posicionId === 0 ? (
                                <div className="posicion-alert">
                                  Guarda el área primero para administrar niveles y evaluaciones.
                                </div>
                              ) : (
                                <div className="niveles-wrapper">
                                  <h4>Niveles y Evaluaciones</h4>
                                  <div className="niveles-grid">
                                  {nivelesDisponibles.map((nivelNum: number) => {
                                    const nivelExistente = niveles.find((n: NivelPosicion) => n.nivel === nivelNum);
                                    const nivelId = nivelExistente?.id ?? 0;
                                    const evalList = nivelId ? (evaluacionesPorNivel[nivelId] || []) : [];
                                    const nivelKey = `${posicionId}-${nivelNum}`;
                                    const defaultOpen = !!nivelExistente;
                                    const isOpen = nivelesAbiertos.hasOwnProperty(nivelKey)
                                      ? nivelesAbiertos[nivelKey]
                                      : defaultOpen;

                                    return (
                                      <div key={nivelNum} className={`nivel-card ${nivelExistente ? 'nivel-activo' : 'nivel-inactivo'} ${isOpen && nivelExistente ? 'open' : ''}`}>
                                        <div
                                          className="nivel-card-header"
                                          onClick={(event) => handleNivelHeaderClick(event, posicionId, nivelNum, defaultOpen)}
                                        >
                                          <button
                                            type="button"
                                            className="nivel-toggle"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              nivelExistente && toggleNivel(posicionId, nivelNum, defaultOpen);
                                            }}
                                            disabled={!nivelExistente}
                                            title={nivelExistente ? (isOpen ? 'Ocultar detalles' : 'Mostrar detalles') : 'Activa el nivel para administrar'}
                                          >
                                            {nivelExistente ? (isOpen ? <FaChevronDown /> : <FaChevronRight />) : <FaChevronRight />}
                                          </button>
                                          <span className="nivel-badge">Nivel {nivelNum}</span>
                                          <div className="nivel-header-actions">
                                            {nivelExistente ? (
                                              <button
                                                type="button"
                                                className="btn-icon btn-delete"
                                                onClick={async (event) => {
                                                  event.stopPropagation();
                                                  if (window.confirm('¿Estás seguro de eliminar este nivel?')) {
                                                    try {
                                                      await apiService.deleteNivelPosicion(nivelExistente.id);
                                                      await loadNivelesYEvaluaciones([posicionId]);
                                                    } catch (err: any) {
                                                      alert(`Error al eliminar nivel: ${err.message}`);
                                                    }
                                                  }
                                                }}
                                                title="Eliminar nivel"
                                              >
                                                <FaTrash />
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                className="btn-primary btn-sm"
                                                onClick={async (event) => {
                                                  event.stopPropagation();
                                                  try {
                                                    await apiService.createNivelPosicion({
                                                      posicion: posicionId,
                                                      nivel: nivelNum,
                                                      is_active: true
                                                    });
                                                    await loadNivelesYEvaluaciones([posicionId]);
                                                    setNivelesAbiertos(prev => ({
                                                      ...prev,
                                                      [nivelKey]: true
                                                    }));
                                                  } catch (err: any) {
                                                    alert(`Error al crear nivel: ${err.message}`);
                                                  }
                                                }}
                                              >
                                                <FaPlus /> Activar nivel
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {nivelExistente ? (
                                          <div className={`nivel-card-content ${isOpen ? 'open' : ''}`}>
                                            <button
                                              type="button"
                                              className="btn-primary btn-add-evaluacion"
                                              onClick={() => abrirModalAgregarEvaluacion(nivelExistente.id, posicionId)}
                                            >
                                              <FaPlus /> Agregar Evaluación
                                            </button>
                                            <div className="evaluaciones-list">
                                              {evalList.length === 0 ? (
                                                <div className="section-empty small">
                                                  No hay evaluaciones asignadas a este nivel.
                                                </div>
                                              ) : (
                                                evalList.map(evaluacion => (
                                                  <div key={evaluacion.id} className="evaluacion-pill">
                                                    <span>{evaluacion.nombre}</span>
                                                    <button
                                                      type="button"
                                                      className="btn-icon btn-delete"
                                                      onClick={() => handleEliminarEvaluacionNivel(evaluacion.id, posicionId)}
                                                      disabled={eliminandoEvaluacionId === evaluacion.id}
                                                      title="Eliminar evaluación"
                                                    >
                                                      {eliminandoEvaluacionId === evaluacion.id ? '...' : <FaTrash />}
                                                    </button>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="nivel-empty">
                                            Activa el nivel para asignar evaluaciones.
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <FieldError errors={editErrors.general} />

              <div className="edit-actions">
                <button type="button" className="btn-secondary" onClick={volverALista}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {/* Modal: Crear Área */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nueva Área</h2>
            <form onSubmit={handleCreateArea}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    required
                    className={createErrors.name ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.name} />
                </div>
                
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={createForm.is_active}
                      onChange={(e) => setCreateForm({...createForm, is_active: e.target.checked})}
                    />
                    Área activa
                  </label>
                </div>

              <div className="form-group full-width">
                <label>Supervisores del Área</label>
                {supervisoresDisponibles.length === 0 ? (
                  <div className="field-helper">
                    No hay supervisores disponibles para asignar.
                  </div>
                ) : (
                  <>
                    <select
                      value={createForm.supervisores[0]?.toString() || ''}
                      onChange={(event) => handleSupervisorChange('create', event)}
                    >
                      <option value="">Seleccionar supervisor...</option>
                      {supervisoresDisponibles.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name} — {supervisor.role_display}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <FieldError errors={createErrors.supervisores} />
              </div>
              </div>

              {/* Sección de Grupos */}
              <div className="grupos-section">
                <div className="section-header">
                  <h3><FaUsers /> Grupos</h3>
                  <button 
                    type="button" 
                    className="btn-add-grupo"
                    onClick={() => addGrupo('create')}
                  >
                    <FaPlus /> Agregar Grupo
                  </button>
                </div>

                {createForm.grupos.map((grupo, grupoIndex) => (
                  <div key={grupoIndex} className="grupo-form">
                    <div className="grupo-header">
                      <h4>Grupo {grupoIndex + 1}</h4>
                      <button 
                        type="button" 
                        className="btn-remove-grupo"
                        onClick={() => removeGrupo(grupoIndex, 'create')}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nombre del Grupo *</label>
                        <input
                          type="text"
                          value={grupo.name}
                          onChange={(e) => updateGrupo(grupoIndex, 'name', e.target.value, 'create')}
                          required
                        />
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección de Posiciones */}
              <div className="posiciones-section">
                <div className="section-header">
                  <h3><FaBriefcase /> Posiciones</h3>
                  <button 
                    type="button" 
                    className="btn-add-posicion"
                    onClick={() => addPosicion('create')}
                  >
                    <FaPlus /> Agregar Posición
                  </button>
                </div>

                {createForm.posiciones.map((posicion, posicionIndex) => (
                  <div key={posicionIndex} className="posicion-form">
                    <div className="posicion-header">
                      <h4>Posición {posicionIndex + 1}</h4>
                      <button 
                        type="button" 
                        className="btn-remove-posicion"
                        onClick={() => removePosicion(posicionIndex, 'create')}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nombre de la Posición *</label>
                        <input
                          type="text"
                          value={posicion.name}
                          onChange={(e) => updatePosicion(posicionIndex, 'name', e.target.value, 'create')}
                          required
                        />
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
              
              <FieldError errors={createErrors.general} />
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Área
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {showDeleteModal && selectedArea && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro que deseas eliminar permanentemente el área <strong>{selectedArea.name}</strong>?
            </p>
            <p className="warning-text">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteArea}>
                Eliminar Área
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Desactivación/Activación */}
      {showDeactivateModal && selectedArea && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedArea.is_active ? 'Confirmar Desactivación' : 'Confirmar Activación'}</h2>
            <p>
              ¿Estás seguro que deseas {selectedArea.is_active ? 'desactivar' : 'activar'} el área <strong>{selectedArea.name}</strong>?
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleDeactivateArea}>
                {selectedArea.is_active ? 'Desactivar' : 'Activar'} Área
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar evaluación a nivel */}
      {showAgregarEvaluacionModal && nivelModalInfo && (
        <div className="modal-overlay" onClick={cerrarModalAgregarEvaluacion}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>Agregar evaluación al nivel</h2>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar Plantilla *</label>
                <select
                  value={modalPlantillaId ?? ''}
                  onChange={(e) => handleModalPlantillaChange(e.target.value)}
                >
                  <option value="">Seleccionar Plantilla...</option>
                  {evaluacionesPlantillas.map(plantilla => (
                    <option key={plantilla.id} value={plantilla.id}>
                      {plantilla.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre de la Evaluación *</label>
                <input
                  type="text"
                  value={modalNombreEvaluacion}
                  onChange={(e) => {
                    setModalNombreEvaluacion(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder="Nombre de la evaluación"
                />
              </div>
              {modalError && (
                <div className="field-error">
                  {modalError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrarModalAgregarEvaluacion}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmAgregarEvaluacion}>
                Agregar Evaluación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaManagement;
