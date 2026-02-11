import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaBan, 
  FaCheckCircle, 
  FaSearch,
  FaFilter,
  FaBriefcase
} from 'react-icons/fa';
import { apiService, Posicion, Area, NivelPosicion, Evaluacion } from '../services/api';
import './PosicionManagement.css';

const PosicionManagement: React.FC = () => {
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  
  // Estados para errores de formularios
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // Posición seleccionada
  const [selectedPosicion, setSelectedPosicion] = useState<Posicion | null>(null);
  
  // Estados para niveles y evaluaciones
  const [nivelesPosicion, setNivelesPosicion] = useState<NivelPosicion[]>([]);
  const [nivelesPorPosicion, setNivelesPorPosicion] = useState<Record<number, NivelPosicion[]>>({});
  const [evaluacionesPlantillas, setEvaluacionesPlantillas] = useState<Evaluacion[]>([]);
  const [evaluacionesPorNivel, setEvaluacionesPorNivel] = useState<Record<number, Evaluacion[]>>({});
  const [nombreEvaluacionPorNivel, setNombreEvaluacionPorNivel] = useState<Record<number, string>>({});
  const [plantillaSeleccionadaPorNivel, setPlantillaSeleccionadaPorNivel] = useState<Record<number, number>>({});
  const [loadingNiveles, setLoadingNiveles] = useState(false);
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);
  
  // Formularios
  const [createForm, setCreateForm] = useState({
    name: '',
    area: '',
    is_active: true
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    area: '',
    is_active: true
  });

  // Cargar áreas al montar el componente
  useEffect(() => {
    loadAreas();
  }, []);

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPosiciones();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, areaFilter]);

  // Indicador de búsqueda cuando hay cambios en los filtros
  useEffect(() => {
    if (searchTerm || statusFilter || areaFilter) {
      setSearching(true);
    }
  }, [searchTerm, statusFilter, areaFilter]);

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
      const response = await apiService.getAreas();
      setAreas(response.results);
    } catch (err) {
      console.error('Error al cargar áreas:', err);
    }
  };


  const loadPosiciones = async () => {
    try {
      if (posiciones.length === 0) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.is_active = statusFilter === 'active';
      if (areaFilter) params.area = areaFilter;
      
      const response = await apiService.getPosiciones(params);
      setPosiciones(response.results);
      setError(null);
      
      // Cargar niveles para cada posición
      const niveles: Record<number, NivelPosicion[]> = {};
      if (response.results && response.results.length > 0) {
        for (const posicion of response.results) {
          try {
            const nivelesResponse = await apiService.getNivelesPosicion({ posicion_id: posicion.id });
            niveles[posicion.id] = nivelesResponse.results || [];
          } catch (err) {
            console.error(`Error al cargar niveles para posición ${posicion.id}:`, err);
            niveles[posicion.id] = [];
          }
        }
      }
      setNivelesPorPosicion(niveles);
    } catch (err) {
      setError('Error al cargar posiciones');
      console.error(err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleCreatePosicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    
    try {
      await apiService.createPosicion({
        ...createForm,
        area: parseInt(createForm.area)
      });
      setShowCreateModal(false);
      resetCreateForm();
      loadPosiciones();
      alert('Posición creada exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setCreateErrors(validationErrors);
    }
  };

  const handleUpdatePosicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosicion) return;
    
    setEditErrors({});
    
    try {
      await apiService.updatePosicion(selectedPosicion.id, editForm);
      setShowEditModal(false);
      setSelectedPosicion(null);
      loadPosiciones();
      alert('Posición actualizada exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setEditErrors(validationErrors);
    }
  };

  const handleDeletePosicion = async () => {
    if (!selectedPosicion) return;
    
    try {
      await apiService.deletePosicion(selectedPosicion.id);
      setShowDeleteModal(false);
      setSelectedPosicion(null);
      loadPosiciones();
      alert('Posición eliminada exitosamente');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeactivatePosicion = async () => {
    if (!selectedPosicion) return;
    
    try {
      if (selectedPosicion.is_active) {
        await apiService.deactivatePosicion(selectedPosicion.id);
        alert('Posición desactivada exitosamente');
      } else {
        await apiService.activatePosicion(selectedPosicion.id);
        alert('Posición activada exitosamente');
      }
      setShowDeactivateModal(false);
      setSelectedPosicion(null);
      loadPosiciones();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openEditModal = async (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setEditErrors({});
    setEditForm({
      name: posicion.name,
      area: posicion.area.toString(),
      is_active: posicion.is_active
    });
    setShowEditModal(true);
    // Cargar niveles y evaluaciones cuando se abre el modal
    await loadNivelesPosicion(posicion.id);
    await loadEvaluacionesPlantillas();
  };

  const loadNivelesPosicion = async (posicionId: number) => {
    try {
      setLoadingNiveles(true);
      const response = await apiService.getNivelesPosicion({ posicion_id: posicionId });
      setNivelesPosicion(response.results);
      
      // Cargar evaluaciones para cada nivel
      const evaluaciones: Record<number, Evaluacion[]> = {};
      for (const nivel of response.results) {
        try {
          const evalList = await apiService.getEvaluacionesAll({ 
            nivel_posicion_id: nivel.id,
            es_plantilla: false
          });
          evaluaciones[nivel.id] = evalList;
        } catch (err) {
          console.error(`Error al cargar evaluaciones para nivel ${nivel.id}:`, err);
          evaluaciones[nivel.id] = [];
        }
      }
      setEvaluacionesPorNivel(evaluaciones);
    } catch (err) {
      console.error('Error al cargar niveles:', err);
      setNivelesPosicion([]);
    } finally {
      setLoadingNiveles(false);
    }
  };

  const loadEvaluacionesPlantillas = async () => {
    try {
      setLoadingEvaluaciones(true);
      const response = await apiService.getEvaluaciones({ es_plantilla: true });
      setEvaluacionesPlantillas(response.results);
    } catch (err) {
      console.error('Error al cargar evaluaciones plantillas:', err);
      setEvaluacionesPlantillas([]);
    } finally {
      setLoadingEvaluaciones(false);
    }
  };

  const handleCrearNivel = async (posicionId: number, nivel: number) => {
    try {
      await apiService.createNivelPosicion({
        posicion: posicionId,
        nivel: nivel,
        is_active: true
      });
      await loadNivelesPosicion(posicionId);
      
      // Actualizar nivelesPorPosicion para reflejar el cambio
      const nivelesResponse = await apiService.getNivelesPosicion({ posicion_id: posicionId });
      setNivelesPorPosicion(prev => ({
        ...prev,
        [posicionId]: nivelesResponse.results
      }));
      
      alert(`Nivel ${nivel} creado exitosamente`);
    } catch (err: any) {
      alert(`Error al crear nivel: ${err.message}`);
    }
  };

  const handleEliminarNivel = async (nivelId: number) => {
    if (!selectedPosicion) return;
    if (!confirm('¿Estás seguro de eliminar este nivel?')) return;
    
    try {
      await apiService.deleteNivelPosicion(nivelId);
      await loadNivelesPosicion(selectedPosicion.id);
      
      // Actualizar nivelesPorPosicion para reflejar el cambio
      const nivelesResponse = await apiService.getNivelesPosicion({ posicion_id: selectedPosicion.id });
      setNivelesPorPosicion(prev => ({
        ...prev,
        [selectedPosicion.id]: nivelesResponse.results
      }));
      
      alert('Nivel eliminado exitosamente');
    } catch (err: any) {
      alert(`Error al eliminar nivel: ${err.message}`);
    }
  };

  const handleAgregarEvaluacionANivel = async (nivelPosicionId: number, plantillaId: number, nombre: string) => {
    try {
      const plantilla = evaluacionesPlantillas.find(p => p.id === plantillaId);
      if (!plantilla) return;

      if (!nombre || !nombre.trim()) {
        alert('Por favor ingresa un nombre para la evaluación');
        return;
      }

      // Obtener la plantilla completa con puntos y criterios
      const plantillaCompleta = await apiService.getEvaluacion(plantillaId);

      // Crear una evaluación real basada en la plantilla, copiando puntos y criterios
      await apiService.createEvaluacion({
        nombre: nombre.trim(),
        es_plantilla: false,
        nivel_posicion: nivelPosicionId,
        plantilla: plantillaId,
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
      
      // Recargar evaluaciones para este nivel
      const evalResponse = await apiService.getEvaluaciones({ 
        nivel_posicion_id: nivelPosicionId,
        es_plantilla: false
      });
      setEvaluacionesPorNivel(prev => ({
        ...prev,
        [nivelPosicionId]: evalResponse.results
      }));
      
      // Limpiar campos
      setPlantillaSeleccionadaPorNivel(prev => {
        const newState = { ...prev };
        delete newState[nivelPosicionId];
        return newState;
      });
      setNombreEvaluacionPorNivel(prev => {
        const newState = { ...prev };
        delete newState[nivelPosicionId];
        return newState;
      });
      
      alert('Evaluación agregada al nivel exitosamente');
    } catch (err: any) {
      alert(`Error al agregar evaluación: ${err.message}`);
    }
  };

  const getEvaluacionesPorNivel = (nivelPosicionId: number): Evaluacion[] => {
    return evaluacionesPorNivel[nivelPosicionId] || [];
  };

  const nivelesDisponibles = [1, 2, 3, 4];

  const openDeleteModal = (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setShowDeactivateModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      area: '',
      is_active: true
    });
  };

  const getAreaName = (areaId: number): string => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.name : 'Área no encontrada';
  };

  const getNivelesDePosicion = (posicionId: number): NivelPosicion[] => {
    return nivelesPorPosicion[posicionId] || [];
  };

  const tieneNivel = (posicionId: number, nivelNum: number): boolean => {
    const niveles = getNivelesDePosicion(posicionId);
    return niveles.some(n => n.nivel === nivelNum && n.is_active);
  };

  const handleAreaChange = (areaId: string) => {
    setAreaFilter(areaId);
    setCreateForm({...createForm, area: areaId}); // Update area in form
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
    return <div className="posicion-management-loading">Cargando posiciones...</div>;
  }

  return (
    <div className="posicion-management">
      <div className="posicion-management-header">
        <h1><FaBriefcase /> Gestión de Posiciones</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Nueva Posición
        </button>
      </div>

      <div className="posicion-management-filters">
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
            placeholder="Buscar por nombre o área..."
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

        <div className="filter-group">
          <FaFilter />
          <select value={areaFilter} onChange={(e) => handleAreaChange(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map(area => (
              <option key={area.id} value={area.id.toString()}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <FaFilter />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="posiciones-table-container">
        <table className="posiciones-table">
          <thead>
            <tr>
              <th>Nombre</th>
                <th>Área</th>
              <th>Niveles</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posiciones.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  {loading ? 'Cargando posiciones...' : 'No hay posiciones disponibles'}
                </td>
              </tr>
            ) : (
              posiciones.map((posicion) => {
                const niveles = getNivelesDePosicion(posicion.id);
                // Debug: verificar niveles cargados
                if (niveles.length > 0) {
                  console.log(`Posición ${posicion.name} tiene ${niveles.length} niveles:`, niveles.map(n => n.nivel));
                }
                return (
              <tr key={posicion.id}>
                <td>{posicion.name}</td>
                <td>{getAreaName(posicion.area)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {[1, 2, 3, 4].map((nivelNum) => {
                          const tieneEsteNivel = tieneNivel(posicion.id, nivelNum);
                          return (
                            <span
                              key={nivelNum}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.375rem 0.625rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                backgroundColor: tieneEsteNivel ? '#d4edda' : '#e9ecef',
                                color: tieneEsteNivel ? '#155724' : '#6c757d',
                                border: `2px solid ${tieneEsteNivel ? '#28a745' : '#ced4da'}`,
                                minWidth: '2.5rem',
                                height: '2rem',
                                textAlign: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              title={tieneEsteNivel ? `Nivel ${nivelNum} activo` : `Nivel ${nivelNum} no disponible`}
                            >
                              {nivelNum}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                <td>
                  <span className={`status-badge ${posicion.is_active ? 'status-active' : 'status-inactive'}`}>
                    {posicion.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>{new Date(posicion.created_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button 
                    className="btn-icon btn-edit" 
                    onClick={() => openEditModal(posicion)}
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-icon btn-deactivate" 
                    onClick={() => openDeactivateModal(posicion)}
                    title={posicion.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {posicion.is_active ? <FaBan /> : <FaCheckCircle />}
                  </button>
                  <button 
                    className="btn-icon btn-delete" 
                    onClick={() => openDeleteModal(posicion)}
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Posición */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nueva Posición</h2>
            <form onSubmit={handleCreatePosicion}>
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
                
                <div className="form-group">
                  <label>Área *</label>
                  <select
                    value={areaFilter}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    required
                    className={createErrors.area ? 'field-error-input' : ''}
                  >
                    <option value="">Seleccionar área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id.toString()}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={createErrors.area} />
                </div>

                <div className="form-group">
                  <label>Área *</label>
                  <select
                    value={createForm.area}
                    onChange={(e) => setCreateForm({...createForm, area: e.target.value})}
                    required
                    className={createErrors.area ? 'field-error-input' : ''}
                  >
                    <option value="">Seleccionar área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id.toString()}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={createErrors.area} />
                </div>
                
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={createForm.is_active}
                      onChange={(e) => setCreateForm({...createForm, is_active: e.target.checked})}
                    />
                    Posición activa
                  </label>
                </div>
              </div>
              
              <FieldError errors={createErrors.general} />
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Posición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Posición */}
      {showEditModal && selectedPosicion && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Posición</h2>
            <form onSubmit={handleUpdatePosicion}>
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

                <div className="form-group">
                  <label>Área *</label>
                  <select
                    value={editForm.area}
                    onChange={(e) => setEditForm({...editForm, area: e.target.value})}
                    required
                    className={editErrors.area ? 'field-error-input' : ''}
                  >
                    <option value="">Seleccionar área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id.toString()}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={editErrors.area} />
                </div>
                
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    />
                    Posición activa
                  </label>
                </div>
              </div>
              
              <FieldError errors={editErrors.general} />
              
              {/* Sección de Niveles y Evaluaciones */}
              <div className="niveles-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e9ecef' }}>
                <h3 style={{ marginBottom: '1rem' }}>Niveles y Evaluaciones</h3>
                
                {loadingNiveles ? (
                  <div>Cargando niveles...</div>
                ) : (
                  <div className="niveles-container">
                    {nivelesDisponibles.map((nivelNum) => {
                      const nivelExistente = nivelesPosicion.find(n => n.nivel === nivelNum);
                      return (
                        <div key={nivelNum} className="nivel-item" style={{ 
                          marginBottom: '1.5rem', 
                          padding: '1rem', 
                          border: '1px solid #dee2e6', 
                          borderRadius: '8px',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0 }}>Nivel {nivelNum}</h4>
                            {nivelExistente ? (
                              <button
                                type="button"
                                className="btn-icon btn-delete"
                                onClick={() => handleEliminarNivel(nivelExistente.id)}
                                title="Eliminar nivel"
                              >
                                <FaTrash />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleCrearNivel(selectedPosicion!.id, nivelNum)}
                                title="Agregar nivel"
                              >
                                <FaPlus /> Agregar Nivel {nivelNum}
                              </button>
                            )}
                          </div>
                          
                          {nivelExistente && (
                            <div className="evaluaciones-nivel" style={{ marginTop: '1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <select
                                  className="form-control"
                                  value={plantillaSeleccionadaPorNivel[nivelExistente.id] || ''}
                                  onChange={(e) => {
                                    const plantillaId = e.target.value ? parseInt(e.target.value) : 0;
                                    setPlantillaSeleccionadaPorNivel(prev => ({
                                      ...prev,
                                      [nivelExistente.id]: plantillaId
                                    }));
                                    // Pre-llenar el nombre con el de la plantilla
                                    if (plantillaId > 0) {
                                      const plantilla = evaluacionesPlantillas.find(p => p.id === plantillaId);
                                      if (plantilla) {
                                        setNombreEvaluacionPorNivel(prev => ({
                                          ...prev,
                                          [nivelExistente.id]: plantilla.nombre
                                        }));
                                      }
                                    } else {
                                      setNombreEvaluacionPorNivel(prev => ({
                                        ...prev,
                                        [nivelExistente.id]: ''
                                      }));
                                    }
                                  }}
                                  style={{ width: '100%' }}
                                >
                                  <option value="">Seleccionar Plantilla...</option>
                                  {evaluacionesPlantillas.map(plantilla => (
                                    <option key={plantilla.id} value={plantilla.id}>
                                      {plantilla.nombre}
                                    </option>
                                  ))}
                                </select>
                                
                                {plantillaSeleccionadaPorNivel[nivelExistente.id] && (
                                  <>
                                    <input
                                      type="text"
                                      className="form-control"
                                      placeholder="Nombre de la evaluación *"
                                      value={nombreEvaluacionPorNivel[nivelExistente.id] || ''}
                                      onChange={(e) => {
                                        setNombreEvaluacionPorNivel(prev => ({
                                          ...prev,
                                          [nivelExistente.id]: e.target.value
                                        }));
                                      }}
                                      style={{ width: '100%' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      onClick={() => {
                                        const plantillaId = plantillaSeleccionadaPorNivel[nivelExistente.id];
                                        const nombre = nombreEvaluacionPorNivel[nivelExistente.id];
                                        if (plantillaId && nombre) {
                                          handleAgregarEvaluacionANivel(nivelExistente.id, plantillaId, nombre);
                                        }
                                      }}
                                      style={{ width: '100%', padding: '0.5rem' }}
                                    >
                                      Agregar Evaluación
                                    </button>
                                  </>
                                )}
                              </div>
                              
                              {/* Lista de evaluaciones del nivel */}
                              <div className="evaluaciones-list" style={{ marginTop: '0.5rem' }}>
                                {getEvaluacionesPorNivel(nivelExistente.id).length === 0 ? (
                                  <div style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                                    No hay evaluaciones asignadas a este nivel
                                  </div>
                                ) : (
                                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {getEvaluacionesPorNivel(nivelExistente.id).map(evaluacion => (
                                      <li key={evaluacion.id} style={{ 
                                        padding: '0.5rem', 
                                        marginBottom: '0.25rem', 
                                        backgroundColor: 'white',
                                        borderRadius: '4px',
                                        border: '1px solid #dee2e6'
                                      }}>
                                        {evaluacion.nombre}
                                        {evaluacion.plantilla_nombre && (
                                          <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>
                                            (Plantilla: {evaluacion.plantilla_nombre})
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="modal-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e9ecef' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {showDeleteModal && selectedPosicion && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro que deseas eliminar permanentemente la posición <strong>{selectedPosicion.name}</strong>?
            </p>
            <p className="warning-text">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDeletePosicion}>
                Eliminar Posición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Desactivación/Activación */}
      {showDeactivateModal && selectedPosicion && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedPosicion.is_active ? 'Confirmar Desactivación' : 'Confirmar Activación'}</h2>
            <p>
              ¿Estás seguro que deseas {selectedPosicion.is_active ? 'desactivar' : 'activar'} la posición <strong>{selectedPosicion.name}</strong>?
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleDeactivatePosicion}>
                {selectedPosicion.is_active ? 'Desactivar' : 'Activar'} Posición
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosicionManagement;
