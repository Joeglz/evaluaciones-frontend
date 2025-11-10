import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaFilter, FaCalendarAlt, FaUser, FaBuilding, FaChartBar } from 'react-icons/fa';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './EvaluacionesManagement.css';

interface EvaluacionesManagementProps {}

const EvaluacionesManagement: React.FC<EvaluacionesManagementProps> = () => {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  
  // Estados principales
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    area_id: '',
    posicion_id: '',
    supervisor_id: '',
    nivel: '',
    search: ''
  });
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPuntoModal, setShowPuntoModal] = useState(false);
  const [showCriterioModal, setShowCriterioModal] = useState(false);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<any>(null);
  const [editingPunto, setEditingPunto] = useState<any>(null);
  const [editingCriterio, setEditingCriterio] = useState<any>(null);
  
  // Estados para formularios
  const [createForm, setCreateForm] = useState({
    nombre: '',
    posicion: null as number | null,
    supervisor: null as number | null,
    nivel: 1 as 1 | 2 | 3 | 4 | 5,
    minimo_aprobatorio: 70,
    fecha_evaluacion: '',
    is_active: true,
    es_plantilla: true, // Las evaluaciones en este componente son plantillas
    puntos_evaluacion: [] as any[],
    criterios_evaluacion: [] as any[]
  });
  
  const [editForm, setEditForm] = useState({
    nombre: '',
    posicion: null as number | null,
    supervisor: null as number | null,
    nivel: 1 as 1 | 2 | 3 | 4 | 5,
    minimo_aprobatorio: 70,
    fecha_evaluacion: '',
    is_active: true
  });

  // Estados para formularios de puntos y criterios
  const [puntoForm, setPuntoForm] = useState({
    pregunta: '',
    orden: 0
  });

  const [criterioForm, setCriterioForm] = useState({
    criterio: '',
    orden: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evaluacionesData, areasData, posicionesData, supervisoresData] = await Promise.all([
        apiService.getEvaluaciones({ es_plantilla: true }), // Solo cargar plantillas
        apiService.getAreas(),
        apiService.getPosiciones(),
        apiService.getUsers({ role: 'ADMIN,EVALUADOR', is_active: true })
      ]);
      
      setEvaluaciones(evaluacionesData.results);
      setAreas(areasData.results);
      setPosiciones(posicionesData.results);
      setSupervisores(supervisoresData.results);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const params: any = {
        es_plantilla: true // Solo mostrar plantillas
      };
      
      if (filtros.area_id) params.area_id = parseInt(filtros.area_id);
      if (filtros.posicion_id) params.posicion_id = parseInt(filtros.posicion_id);
      if (filtros.supervisor_id) params.supervisor_id = parseInt(filtros.supervisor_id);
      if (filtros.nivel) params.nivel = parseInt(filtros.nivel);
      if (filtros.search) params.search = filtros.search;
      
      const data = await apiService.getEvaluaciones(params);
      setEvaluaciones(data.results);
    } catch (error) {
      console.error('Error applying filters:', error);
      showError('Error al aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluacion = async () => {
    // Validar campos requeridos
    if (!createForm.nombre || !createForm.posicion || !createForm.fecha_evaluacion) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      await apiService.createEvaluacion({
        nombre: createForm.nombre,
        es_plantilla: createForm.es_plantilla,
        posicion: createForm.posicion!,
        supervisor: createForm.supervisor,
        nivel: createForm.nivel,
        minimo_aprobatorio: createForm.minimo_aprobatorio,
        fecha_evaluacion: createForm.fecha_evaluacion || null,
        is_active: createForm.is_active,
        puntos_evaluacion: createForm.puntos_evaluacion,
        criterios_evaluacion: createForm.criterios_evaluacion
      });
      showSuccess('Evaluación creada exitosamente');
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating evaluacion:', error);
      showError(error.response?.data?.detail || 'Error al crear la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvaluacion = async () => {
    if (!selectedEvaluacion) return;
    
    // Validar campos requeridos
    if (!editForm.nombre || !editForm.posicion || !editForm.fecha_evaluacion) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }
    
    try {
      setLoading(true);
      await apiService.updateEvaluacion(selectedEvaluacion.id, {
        nombre: editForm.nombre,
        posicion: editForm.posicion!,
        supervisor: editForm.supervisor,
        nivel: editForm.nivel,
        minimo_aprobatorio: editForm.minimo_aprobatorio,
        fecha_evaluacion: editForm.fecha_evaluacion,
        is_active: editForm.is_active
      });
      showSuccess('Evaluación actualizada exitosamente');
      setShowEditModal(false);
      setSelectedEvaluacion(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating evaluacion:', error);
      showError(error.response?.data?.detail || 'Error al actualizar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvaluacion = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta evaluación?')) return;
    
    try {
      setLoading(true);
      await apiService.deleteEvaluacion(id);
      showSuccess('Evaluación eliminada exitosamente');
      loadData();
    } catch (error: any) {
      console.error('Error deleting evaluacion:', error);
      showError(error.response?.data?.detail || 'Error al eliminar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      nombre: '',
      posicion: null,
      supervisor: null,
      nivel: 1,
      minimo_aprobatorio: 70,
      fecha_evaluacion: '',
      is_active: true,
      es_plantilla: true,
      puntos_evaluacion: [],
      criterios_evaluacion: []
    });
  };

  const openEditModal = (evaluacion: any) => {
    setSelectedEvaluacion(evaluacion);
    setEditForm({
      nombre: evaluacion.nombre,
      posicion: evaluacion.posicion,
      supervisor: evaluacion.supervisor,
      nivel: evaluacion.nivel,
      minimo_aprobatorio: evaluacion.minimo_aprobatorio,
      fecha_evaluacion: evaluacion.fecha_evaluacion,
      is_active: evaluacion.is_active
    });
    setShowEditModal(true);
  };

  const openDetailModal = async (evaluacion: any) => {
    try {
      setLoading(true);
      const fullEvaluacion = await apiService.getEvaluacion(evaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading evaluacion details:', error);
      showError('Error al cargar los detalles de la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const getPosicionesByArea = (areaId: number) => {
    return posiciones.filter(p => p.area === areaId);
  };

  const getSupervisoresByArea = (areaId: number) => {
    return supervisores.filter(s => s.areas?.includes(areaId));
  };

  // Funciones para manejar puntos de evaluación
  const handleCreatePunto = async () => {
    if (!selectedEvaluacion || !puntoForm.pregunta.trim()) {
      showError('Por favor ingresa una pregunta');
      return;
    }

    try {
      setLoading(true);
      await apiService.agregarPuntoEvaluacion(selectedEvaluacion.id, {
        pregunta: puntoForm.pregunta,
        orden: puntoForm.orden
      });
      showSuccess('Punto de evaluación agregado exitosamente');
      setShowPuntoModal(false);
      resetPuntoForm();
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error creating punto:', error);
      showError(error.response?.data?.detail || 'Error al agregar el punto de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePunto = async () => {
    if (!editingPunto || !puntoForm.pregunta.trim()) {
      showError('Por favor ingresa una pregunta');
      return;
    }

    try {
      setLoading(true);
      await apiService.updatePuntoEvaluacion(editingPunto.id, {
        pregunta: puntoForm.pregunta,
        orden: puntoForm.orden
      });
      showSuccess('Punto de evaluación actualizado exitosamente');
      setShowPuntoModal(false);
      setEditingPunto(null);
      resetPuntoForm();
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error updating punto:', error);
      showError(error.response?.data?.detail || 'Error al actualizar el punto de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePunto = async (puntoId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este punto de evaluación?')) return;

    try {
      setLoading(true);
      await apiService.deletePuntoEvaluacion(puntoId);
      showSuccess('Punto de evaluación eliminado exitosamente');
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error deleting punto:', error);
      showError(error.response?.data?.detail || 'Error al eliminar el punto de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const openEditPuntoModal = (punto: any) => {
    setEditingPunto(punto);
    setPuntoForm({
      pregunta: punto.pregunta,
      orden: punto.orden
    });
    setShowPuntoModal(true);
  };

  const resetPuntoForm = () => {
    setPuntoForm({
      pregunta: '',
      orden: 0
    });
  };

  // Funciones para manejar criterios de evaluación
  const handleCreateCriterio = async () => {
    if (!selectedEvaluacion || !criterioForm.criterio.trim()) {
      showError('Por favor ingresa un criterio');
      return;
    }

    try {
      setLoading(true);
      await apiService.agregarCriterioEvaluacion(selectedEvaluacion.id, {
        criterio: criterioForm.criterio,
        orden: criterioForm.orden
      });
      showSuccess('Criterio de evaluación agregado exitosamente');
      setShowCriterioModal(false);
      resetCriterioForm();
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error creating criterio:', error);
      showError(error.response?.data?.detail || 'Error al agregar el criterio de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCriterio = async () => {
    if (!editingCriterio || !criterioForm.criterio.trim()) {
      showError('Por favor ingresa un criterio');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateCriterioEvaluacion(editingCriterio.id, {
        criterio: criterioForm.criterio,
        orden: criterioForm.orden
      });
      showSuccess('Criterio de evaluación actualizado exitosamente');
      setShowCriterioModal(false);
      setEditingCriterio(null);
      resetCriterioForm();
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error updating criterio:', error);
      showError(error.response?.data?.detail || 'Error al actualizar el criterio de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCriterio = async (criterioId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este criterio de evaluación?')) return;

    try {
      setLoading(true);
      await apiService.deleteCriterioEvaluacion(criterioId);
      showSuccess('Criterio de evaluación eliminado exitosamente');
      // Recargar detalles de la evaluación
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error deleting criterio:', error);
      showError(error.response?.data?.detail || 'Error al eliminar el criterio de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const openEditCriterioModal = (criterio: any) => {
    setEditingCriterio(criterio);
    setCriterioForm({
      criterio: criterio.criterio,
      orden: criterio.orden
    });
    setShowCriterioModal(true);
  };

  const resetCriterioForm = () => {
    setCriterioForm({
      criterio: '',
      orden: 0
    });
  };

  return (
    <div className="evaluaciones-management">
      <div className="management-header">
        <h2>Gestión de Evaluaciones</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus /> Nueva Evaluación
        </button>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Área</label>
            <select 
              value={filtros.area_id}
              onChange={(e) => handleFilterChange('area_id', e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Posición</label>
            <select 
              value={filtros.posicion_id}
              onChange={(e) => handleFilterChange('posicion_id', e.target.value)}
            >
              <option value="">Todas las posiciones</option>
              {filtros.area_id ? 
                getPosicionesByArea(parseInt(filtros.area_id)).map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                )) :
                posiciones.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))
              }
            </select>
          </div>

          <div className="filter-group">
            <label>Supervisor</label>
            <select 
              value={filtros.supervisor_id}
              onChange={(e) => handleFilterChange('supervisor_id', e.target.value)}
            >
              <option value="">Todos los supervisores</option>
              {filtros.area_id ?
                getSupervisoresByArea(parseInt(filtros.area_id)).map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                )) :
                supervisores.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                ))
              }
            </select>
          </div>

          <div className="filter-group">
            <label>Nivel</label>
            <select 
              value={filtros.nivel}
              onChange={(e) => handleFilterChange('nivel', e.target.value)}
            >
              <option value="">Todos los niveles</option>
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
              <option value="4">Nivel 4</option>
              <option value="5">Nivel 5</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Buscar</label>
            <div className="search-input">
              <FaSearch />
              <input 
                type="text"
                placeholder="Buscar por nombre..."
                value={filtros.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="btn btn-secondary"
              onClick={applyFilters}
              disabled={loading}
            >
              <FaFilter /> Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de evaluaciones */}
      <div className="evaluaciones-list">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : evaluaciones.length === 0 ? (
          <div className="no-data">No hay evaluaciones disponibles</div>
        ) : (
          <div className="evaluaciones-grid">
            {evaluaciones.map(evaluacion => (
              <div key={evaluacion.id} className="evaluacion-card">
                <div className="card-header">
                  <h3>{evaluacion.nombre}</h3>
                  <div className="card-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => openDetailModal(evaluacion)}
                      title="Ver detalles"
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => openEditModal(evaluacion)}
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteEvaluacion(evaluacion.id)}
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <div className="card-content">
                  <div className="info-row">
                    <FaBuilding />
                    <span>{evaluacion.area_name} - {evaluacion.posicion_name}</span>
                  </div>
                  
                  <div className="info-row">
                    <FaUser />
                    <span>{evaluacion.supervisor_name}</span>
                  </div>
                  
                  <div className="info-row">
                    <FaChartBar />
                    <span>{evaluacion.nivel_display}</span>
                  </div>
                  
                  <div className="info-row">
                    <FaCalendarAlt />
                    <span>{new Date(evaluacion.fecha_evaluacion).toLocaleDateString()}</span>
                  </div>
                  
                  {evaluacion.resultado !== null && (
                    <div className="resultado">
                      <strong>Resultado: {evaluacion.resultado}%</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nueva Evaluación</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre de la Evaluación</label>
                  <input 
                    type="text"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Evaluación de Competencias - Operador"
                  />
                </div>

                <div className="form-group">
                  <label>Posición</label>
                  <select 
                    value={createForm.posicion || ''}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, posicion: parseInt(e.target.value) || null }))}
                  >
                    <option value="">Seleccionar posición</option>
                    {posiciones.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name} ({pos.area_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Supervisor</label>
                  <select 
                    value={createForm.supervisor || ''}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, supervisor: parseInt(e.target.value) || null }))}
                  >
                    <option value="">Seleccionar supervisor</option>
                    {supervisores.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Nivel</label>
                  <select 
                    value={createForm.nivel}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nivel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
                  >
                    <option value="1">Nivel 1</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4</option>
                    <option value="5">Nivel 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mínimo Aprobatorio (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.minimo_aprobatorio}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, minimo_aprobatorio: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Evaluación</label>
                  <input 
                    type="date"
                    value={createForm.fecha_evaluacion}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, fecha_evaluacion: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateEvaluacion}
                disabled={loading || !createForm.nombre || !createForm.posicion || !createForm.fecha_evaluacion}
              >
                {loading ? 'Creando...' : 'Crear Evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && selectedEvaluacion && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Editar Evaluación</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre de la Evaluación</label>
                  <input 
                    type="text"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Posición</label>
                  <select 
                    value={editForm.posicion || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, posicion: parseInt(e.target.value) || null }))}
                  >
                    <option value="">Seleccionar posición</option>
                    {posiciones.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name} ({pos.area_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Supervisor</label>
                  <select 
                    value={editForm.supervisor || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, supervisor: parseInt(e.target.value) || null }))}
                  >
                    <option value="">Seleccionar supervisor</option>
                    {supervisores.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Nivel</label>
                  <select 
                    value={editForm.nivel}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nivel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
                  >
                    <option value="1">Nivel 1</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4</option>
                    <option value="5">Nivel 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mínimo Aprobatorio (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.minimo_aprobatorio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, minimo_aprobatorio: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Evaluación</label>
                  <input 
                    type="date"
                    value={editForm.fecha_evaluacion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fecha_evaluacion: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Activa
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleEditEvaluacion}
                disabled={loading || !editForm.nombre || !editForm.posicion || !editForm.fecha_evaluacion}
              >
                {loading ? 'Actualizando...' : 'Actualizar Evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailModal && selectedEvaluacion && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>Detalles de la Evaluación</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-sections">
                <div className="detail-section">
                  <h4>Información General</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Nombre:</label>
                      <span>{selectedEvaluacion.nombre}</span>
                    </div>
                    <div className="detail-item">
                      <label>Área:</label>
                      <span>{selectedEvaluacion.area_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Posición:</label>
                      <span>{selectedEvaluacion.posicion_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Supervisor:</label>
                      <span>{selectedEvaluacion.supervisor_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Nivel:</label>
                      <span>{selectedEvaluacion.nivel_display}</span>
                    </div>
                    <div className="detail-item">
                      <label>Mínimo Aprobatorio:</label>
                      <span>{selectedEvaluacion.minimo_aprobatorio}%</span>
                    </div>
                    <div className="detail-item">
                      <label>Fecha de Evaluación:</label>
                      <span>{new Date(selectedEvaluacion.fecha_evaluacion).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Estado:</label>
                      <span className={selectedEvaluacion.is_active ? 'status-active' : 'status-inactive'}>
                        {selectedEvaluacion.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {selectedEvaluacion.resultado !== null && (
                      <div className="detail-item">
                        <label>Resultado:</label>
                        <span className="resultado">{selectedEvaluacion.resultado}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-header">
                    <h4>Puntos de Evaluación</h4>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        resetPuntoForm();
                        setEditingPunto(null);
                        setShowPuntoModal(true);
                      }}
                    >
                      <FaPlus /> Agregar Punto
                    </button>
                  </div>
                  
                  {selectedEvaluacion.puntos_evaluacion && selectedEvaluacion.puntos_evaluacion.length > 0 ? (
                    <div className="puntos-list">
                      {selectedEvaluacion.puntos_evaluacion.map((punto: any, index: number) => (
                        <div key={punto.id} className="punto-item">
                          <div className="punto-header">
                            <span className="punto-orden">{index + 1}.</span>
                            <span className="punto-pregunta">{punto.pregunta}</span>
                            {punto.puntuacion && (
                              <span className={`punto-puntuacion puntuacion-${punto.puntuacion}`}>
                                {punto.puntuacion === 1 ? 'Bajo' : punto.puntuacion === 2 ? 'Medio' : 'Alto'}
                              </span>
                            )}
                          </div>
                          <div className="punto-actions">
                            <button 
                              className="btn-icon"
                              onClick={() => openEditPuntoModal(punto)}
                              title="Editar punto"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="btn-icon btn-danger"
                              onClick={() => handleDeletePunto(punto.id)}
                              title="Eliminar punto"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-items">
                      <p>No hay puntos de evaluación configurados</p>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <div className="section-header">
                    <h4>Criterios de Evaluación</h4>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        resetCriterioForm();
                        setEditingCriterio(null);
                        setShowCriterioModal(true);
                      }}
                    >
                      <FaPlus /> Agregar Criterio
                    </button>
                  </div>
                  
                  {selectedEvaluacion.criterios_evaluacion && selectedEvaluacion.criterios_evaluacion.length > 0 ? (
                    <div className="criterios-list">
                      {selectedEvaluacion.criterios_evaluacion.map((criterio: any, index: number) => (
                        <div key={criterio.id} className="criterio-item">
                          <div className="criterio-content">
                            <span className="criterio-orden">{index + 1}.</span>
                            <span className="criterio-texto">{criterio.criterio}</span>
                          </div>
                          <div className="criterio-actions">
                            <button 
                              className="btn-icon"
                              onClick={() => openEditCriterioModal(criterio)}
                              title="Editar criterio"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="btn-icon btn-danger"
                              onClick={() => handleDeleteCriterio(criterio.id)}
                              title="Eliminar criterio"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-items">
                      <p>No hay criterios de evaluación configurados</p>
                    </div>
                  )}
                </div>

                {selectedEvaluacion.firmas && selectedEvaluacion.firmas.length > 0 && (
                  <div className="detail-section">
                    <h4>Firmas</h4>
                    <div className="firmas-grid">
                      {selectedEvaluacion.firmas.map((firma: any) => (
                        <div key={firma.id} className={`firma-item ${firma.esta_firmado ? 'firmado' : 'pendiente'}`}>
                          <div className="firma-header">
                            <span className="firma-tipo">{firma.tipo_firma_display}</span>
                            <span className={`firma-estado ${firma.esta_firmado ? 'firmado' : 'pendiente'}`}>
                              {firma.esta_firmado ? 'Firmado' : 'Pendiente'}
                            </span>
                          </div>
                          <div className="firma-details">
                            <div className="firma-nombre">{firma.nombre}</div>
                            {firma.esta_firmado && (
                              <>
                                <div className="firma-usuario">{firma.usuario_nombre}</div>
                                <div className="firma-fecha">
                                  {new Date(firma.fecha_firma).toLocaleDateString()}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Puntos de Evaluación */}
      {showPuntoModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPunto ? 'Editar Punto de Evaluación' : 'Nuevo Punto de Evaluación'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowPuntoModal(false);
                  setEditingPunto(null);
                  resetPuntoForm();
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Pregunta</label>
                <textarea 
                  value={puntoForm.pregunta}
                  onChange={(e) => setPuntoForm(prev => ({ ...prev, pregunta: e.target.value }))}
                  placeholder="Ingresa la pregunta de evaluación..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Orden</label>
                <input 
                  type="number"
                  min="0"
                  value={puntoForm.orden}
                  onChange={(e) => setPuntoForm(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowPuntoModal(false);
                  setEditingPunto(null);
                  resetPuntoForm();
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={editingPunto ? handleUpdatePunto : handleCreatePunto}
                disabled={loading || !puntoForm.pregunta.trim()}
              >
                {loading ? 'Guardando...' : (editingPunto ? 'Actualizar' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Criterios de Evaluación */}
      {showCriterioModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingCriterio ? 'Editar Criterio de Evaluación' : 'Nuevo Criterio de Evaluación'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCriterioModal(false);
                  setEditingCriterio(null);
                  resetCriterioForm();
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Criterio</label>
                <textarea 
                  value={criterioForm.criterio}
                  onChange={(e) => setCriterioForm(prev => ({ ...prev, criterio: e.target.value }))}
                  placeholder="Ingresa el criterio de evaluación..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Orden</label>
                <input 
                  type="number"
                  min="0"
                  value={criterioForm.orden}
                  onChange={(e) => setCriterioForm(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCriterioModal(false);
                  setEditingCriterio(null);
                  resetCriterioForm();
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={editingCriterio ? handleUpdateCriterio : handleCreateCriterio}
                disabled={loading || !criterioForm.criterio.trim()}
              >
                {loading ? 'Guardando...' : (editingCriterio ? 'Actualizar' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default EvaluacionesManagement;
