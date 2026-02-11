import React, { useState, useEffect, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCopy, FaSearch } from 'react-icons/fa';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './EvaluacionesManagement.css';

const slugifyText = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
interface EvaluacionesManagementProps {}

const EvaluacionesManagement: React.FC<EvaluacionesManagementProps> = () => {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  
  // Estados principales
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nombreFilter, setNombreFilter] = useState('');
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPuntoModal, setShowPuntoModal] = useState(false);
  const [showCriterioModal, setShowCriterioModal] = useState(false);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<any>(null);
  const [editNombreValor, setEditNombreValor] = useState('');
  const [editingPunto, setEditingPunto] = useState<any>(null);
  const [editingCriterio, setEditingCriterio] = useState<any>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [evaluacionToDuplicate, setEvaluacionToDuplicate] = useState<any>(null);
  const [duplicateNombre, setDuplicateNombre] = useState('');
  
  // Estados para formularios
  const [createForm, setCreateForm] = useState({
    nombre: '',
    posicion: null as number | null,
    supervisor: null as number | null,
    nivel: 1 as 1 | 2 | 3 | 4 | 5,
    minimo_aprobatorio: 70,
    formula_divisor: 17,
    formula_multiplicador: 80,
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
    formula_divisor: 17,
    formula_multiplicador: 80,
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

const [firmaForm, setFirmaForm] = useState({
  nombre: '',
  identificador: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const filteredEvaluaciones = useMemo(() => {
    if (!nombreFilter.trim()) return evaluaciones;
    const term = nombreFilter.trim().toLowerCase();
    return evaluaciones.filter((e) => (e.nombre || '').toLowerCase().includes(term));
  }, [evaluaciones, nombreFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evaluacionesData, areasData, posicionesData, supervisoresData] = await Promise.all([
        apiService.getEvaluacionesAll({ es_plantilla: true }), // Todas las plantillas (todas las páginas)
        apiService.getAreas(),
        apiService.getPosiciones(),
        apiService.getUsers({ role: 'ADMIN,EVALUADOR', is_active: true })
      ]);
      
      setEvaluaciones(evaluacionesData);
      setAreas(areasData.results);
      setPosiciones(posicionesData);
      setSupervisores(supervisoresData.results);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluacion = async () => {
    // Validar campos requeridos
    if (!createForm.nombre) {
      showError('Por favor ingresa el nombre de la evaluación');
      return;
    }

    try {
      setLoading(true);
      await apiService.createEvaluacion({
        nombre: createForm.nombre,
        es_plantilla: createForm.es_plantilla,
        posicion: createForm.posicion,
        supervisor: createForm.supervisor,
        nivel: createForm.nivel,
        minimo_aprobatorio: createForm.minimo_aprobatorio,
        formula_divisor: createForm.formula_divisor,
        formula_multiplicador: createForm.formula_multiplicador,
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

  const openDuplicateModal = (evaluacion: any) => {
    setEvaluacionToDuplicate(evaluacion);
    setDuplicateNombre(`${evaluacion.nombre || 'Plantilla'} (copia)`);
    setShowDuplicateModal(true);
  };

  const handleDuplicateEvaluacion = async () => {
    if (!evaluacionToDuplicate || !duplicateNombre.trim()) {
      showError('Ingresa el nombre de la nueva plantilla');
      return;
    }

    try {
      setLoading(true);
      const fullEvaluacion = await apiService.getEvaluacion(evaluacionToDuplicate.id);
      await apiService.createEvaluacion({
        nombre: duplicateNombre.trim(),
        es_plantilla: true,
        posicion: fullEvaluacion.posicion ?? undefined,
        supervisor: fullEvaluacion.supervisor ?? null,
        nivel: fullEvaluacion.nivel ?? 1,
        minimo_aprobatorio: fullEvaluacion.minimo_aprobatorio ?? 70,
        formula_divisor: fullEvaluacion.formula_divisor ?? 17,
        formula_multiplicador: fullEvaluacion.formula_multiplicador ?? 80,
        fecha_evaluacion: fullEvaluacion.fecha_evaluacion ?? null,
        is_active: fullEvaluacion.is_active ?? true,
        puntos_evaluacion: (fullEvaluacion.puntos_evaluacion || []).map((p: any) => ({
          pregunta: p.pregunta,
          orden: p.orden ?? 0
        })),
        criterios_evaluacion: (fullEvaluacion.criterios_evaluacion || []).map((c: any) => ({
          criterio: c.criterio,
          orden: c.orden ?? 0
        })),
        ...(fullEvaluacion.firmas?.length
          ? {
              firmas: fullEvaluacion.firmas.map((f: any) => ({
                tipo_firma: f.tipo_firma || slugifyText(f.nombre || ''),
                nombre: f.nombre || '',
                orden: f.orden
              }))
            }
          : {})
      });
      showSuccess('Plantilla duplicada correctamente');
      setShowDuplicateModal(false);
      setEvaluacionToDuplicate(null);
      setDuplicateNombre('');
      loadData();
    } catch (error: any) {
      console.error('Error duplicating evaluacion:', error);
      showError(error.response?.data?.detail || 'Error al duplicar la plantilla');
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
      formula_divisor: 17,
      formula_multiplicador: 80,
      fecha_evaluacion: '',
      is_active: true,
      es_plantilla: true,
      puntos_evaluacion: [],
      criterios_evaluacion: []
    });
  };

  const openDetailModal = async (evaluacion: any) => {
    try {
      setLoading(true);
      const fullEvaluacion = await apiService.getEvaluacion(evaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
      setEditNombreValor(fullEvaluacion.nombre || '');
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading evaluacion details:', error);
      showError('Error al cargar los detalles de la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarNombre = async () => {
    if (!selectedEvaluacion) return;
    const nuevoNombre = editNombreValor.trim();
    if (!nuevoNombre) {
      showError('El nombre no puede estar vacío');
      return;
    }

    if (nuevoNombre === selectedEvaluacion.nombre) {
      return;
    }

    try {
      setLoading(true);
      const payload = { nombre: nuevoNombre } as any;
      await apiService.updateEvaluacion(selectedEvaluacion.id, payload);
      const evaluacionActualizada = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(evaluacionActualizada);
      loadData();
      showSuccess('Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error al actualizar nombre de plantilla:', error);
      showError(error.response?.data?.detail || 'No se pudo actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };

  const getPlantillasFirmas = (evaluacion: any) => {
    return evaluacion.firmas || [];
  };

  // Funciones para manejar puntos de evaluación
  const handleCreatePunto = async () => {
    if (!selectedEvaluacion || !puntoForm.pregunta.trim()) {
      showError('Por favor ingresa una pregunta');
      return;
    }

    try {
      setLoading(true);
      // Calcular el orden automáticamente basado en la cantidad de puntos existentes
      const ordenAutomatico = (selectedEvaluacion.puntos_evaluacion?.length || 0) + 1;
      await apiService.agregarPuntoEvaluacion(selectedEvaluacion.id, {
        pregunta: puntoForm.pregunta,
        orden: ordenAutomatico
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
      // Mantener el orden existente al actualizar
      await apiService.updatePuntoEvaluacion(editingPunto.id, {
        pregunta: puntoForm.pregunta,
        orden: editingPunto.orden || puntoForm.orden
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
      // Calcular el orden automáticamente basado en la cantidad de criterios existentes
      const ordenAutomatico = (selectedEvaluacion.criterios_evaluacion?.length || 0) + 1;
      await apiService.agregarCriterioEvaluacion(selectedEvaluacion.id, {
        criterio: criterioForm.criterio,
        orden: ordenAutomatico
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
      // Mantener el orden existente al actualizar
      await apiService.updateCriterioEvaluacion(editingCriterio.id, {
        criterio: criterioForm.criterio,
        orden: editingCriterio.orden || criterioForm.orden
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

  const resetFirmaForm = () => {
    setFirmaForm({
      nombre: '',
      identificador: ''
    });
  };

  const openCreateFirmaModal = () => {
    if (!selectedEvaluacion) return;
    resetFirmaForm();
    setShowFirmaModal(true);
  };

  const handleCreateFirma = async () => {
    if (!selectedEvaluacion) return;
    if (!firmaForm.nombre.trim()) {
      showError('Ingresa el nombre visible de la firma');
      return;
    }

    const slug = slugifyText(firmaForm.identificador || firmaForm.nombre);
    if (!slug) {
      showError('Ingresa un identificador válido para la firma');
      return;
    }

    try {
      setLoading(true);
      await apiService.createFirmaEvaluacion({
        evaluacion: selectedEvaluacion.id,
        tipo_firma: slug,
        nombre: firmaForm.nombre.trim()
      });
      showSuccess('Firma agregada exitosamente');
      setShowFirmaModal(false);
      resetFirmaForm();
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error agregando firma:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.tipo_firma?.[0];
      showError(errorMessage || 'Error al agregar la firma');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFirma = async (firmaId: number, estaFirmado: boolean) => {
    if (!selectedEvaluacion) return;
    if (estaFirmado) {
      showError('No puedes eliminar una firma que ya ha sido firmada.');
      return;
    }

    if (!window.confirm('¿Eliminar esta firma de la evaluación?')) return;

    try {
      setLoading(true);
      await apiService.deleteFirmaEvaluacion(firmaId);
      showSuccess('Firma eliminada correctamente');
      const fullEvaluacion = await apiService.getEvaluacion(selectedEvaluacion.id);
      setSelectedEvaluacion(fullEvaluacion);
    } catch (error: any) {
      console.error('Error eliminando firma:', error);
      showError(error.response?.data?.detail || 'Error al eliminar la firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="evaluaciones-management">
      <div className="management-header">
        <h2>Gestión de Plantillas</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus /> Nueva Plantilla
        </button>
      </div>

      {/* Filtro por nombre */}
      <div className="evaluaciones-filters">
        <div className="evaluaciones-search">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={nombreFilter}
            onChange={(e) => setNombreFilter(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar plantillas por nombre"
          />
        </div>
      </div>

      {/* Lista de evaluaciones */}
      <div className="evaluaciones-list">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : evaluaciones.length === 0 ? (
          <div className="no-data">No hay evaluaciones disponibles</div>
        ) : (
          <div className="evaluaciones-table-container">
            <table className="evaluaciones-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluaciones.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="table-empty-message">
                      Ninguna plantilla coincide con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredEvaluaciones.map(evaluacion => (
                    <tr 
                      key={evaluacion.id}
                      className="evaluacion-row-clickable"
                      onClick={() => openDetailModal(evaluacion)}
                    >
                      <td>{evaluacion.nombre}</td>
                      <td>
                        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn-icon"
                            onClick={() => openDetailModal(evaluacion)}
                            title="Ver detalles"
                          >
                            <FaEye />
                          </button>
                          <button 
                            className="btn-icon btn-duplicate"
                            onClick={() => openDuplicateModal(evaluacion)}
                            title="Duplicar plantilla"
                          >
                            <FaCopy />
                          </button>
                          <button 
                            className="btn-icon btn-danger"
                            onClick={() => handleDeleteEvaluacion(evaluacion.id)}
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal duplicar plantilla */}
      {showDuplicateModal && evaluacionToDuplicate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Duplicar plantilla</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setEvaluacionToDuplicate(null);
                  setDuplicateNombre('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="duplicate-source">Plantilla original: <strong>{evaluacionToDuplicate.nombre}</strong></p>
              <div className="form-group">
                <label>Nombre de la nueva plantilla</label>
                <input 
                  type="text"
                  value={duplicateNombre}
                  onChange={(e) => setDuplicateNombre(e.target.value)}
                  placeholder="Ej: Mi plantilla (copia)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDuplicateEvaluacion();
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setEvaluacionToDuplicate(null);
                  setDuplicateNombre('');
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleDuplicateEvaluacion}
                disabled={loading || !duplicateNombre.trim()}
              >
                {loading ? 'Duplicando...' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nueva Plantilla</h3>
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
                  <label>Nombre de la Plantilla</label>
                  <input 
                    type="text"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Evaluación de Competencias - Operador"
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
                disabled={loading || !createForm.nombre}
              >
                {loading ? 'Creando...' : 'Crear'}
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
              <h3>Detalles de la Plantilla</h3>
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
                      <input
                        type="text"
                        value={editNombreValor}
                        onChange={(e) => setEditNombreValor(e.target.value)}
                        onBlur={handleActualizarNombre}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleActualizarNombre();
                          }
                          if (e.key === 'Escape') {
                            setEditNombreValor(selectedEvaluacion.nombre || '');
                          }
                        }}
                        maxLength={150}
                        disabled={loading}
                      />
                    </div>
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

                  <div className="detail-section">
                  <div className="section-header">
                    <h4>Firmas</h4>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={openCreateFirmaModal}
                    >
                      <FaPlus /> Agregar Firma
                    </button>
                  </div>

                  {selectedEvaluacion.firmas && selectedEvaluacion.firmas.length > 0 ? (
                    <div className="firmas-grid">
                      {selectedEvaluacion.firmas.map((firma: any) => (
                        <div
                          key={firma.id}
                          className={`firma-item ${firma.esta_firmado ? 'firmado' : 'pendiente'}`}
                        >
                          <div className="firma-header">
                            <span className="firma-tipo">
                              {firma.tipo_firma_display || firma.tipo_firma}
                            </span>
                            <span className={`firma-estado ${firma.esta_firmado ? 'firmado' : 'pendiente'}`}>
                              {firma.estado_display || (firma.esta_firmado ? 'Firmado' : 'Pendiente')}
                            </span>
                          </div>
                          <div className="firma-details">
                            <div className="firma-nombre">{firma.nombre}</div>
                            {firma.esta_firmado ? (
                              <>
                                <div className="firma-usuario">{firma.usuario_nombre}</div>
                                <div className="firma-fecha">
                                  {firma.fecha_firma ? new Date(firma.fecha_firma).toLocaleDateString() : ''}
                                </div>
                              </>
                            ) : (
                              <div className="firma-orden">Orden: {firma.orden}</div>
                            )}
                          </div>
                          <div className="firma-actions">
                            {!firma.esta_firmado && (
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDeleteFirma(firma.id, firma.esta_firmado)}
                                title="Eliminar firma"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-items">
                      <p>No hay firmas configuradas</p>
                  </div>
                )}
                </div>
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

      {/* Modal para Firmas */}
      {showFirmaModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nueva Firma</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowFirmaModal(false);
                  resetFirmaForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre visible *</label>
                <input
                  type="text"
                  value={firmaForm.nombre}
                  onChange={(e) =>
                    setFirmaForm(prev => ({
                      ...prev,
                      nombre: e.target.value,
                      identificador: prev.identificador ? prev.identificador : slugifyText(e.target.value)
                    }))
                  }
                  placeholder="Ej. Firma del Supervisor"
                />
              </div>
              <div className="form-group">
                <label>Identificador (sin espacios) *</label>
                <input
                  type="text"
                  value={firmaForm.identificador}
                  onChange={(e) =>
                    setFirmaForm(prev => ({
                      ...prev,
                      identificador: slugifyText(e.target.value)
                    }))
                  }
                  placeholder="Ej. supervisor-produccion"
                />
                <small className="field-helper">
                  Debe ser único dentro de la evaluación. Se genera automáticamente a partir del nombre, pero puedes ajustarlo.
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowFirmaModal(false);
                  resetFirmaForm();
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateFirma}
                disabled={loading || !firmaForm.nombre.trim()}
              >
                {loading ? 'Guardando...' : 'Agregar Firma'}
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
