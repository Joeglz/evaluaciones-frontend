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
  FaEye
} from 'react-icons/fa';
import { apiService, Area, GrupoNested, PosicionNested } from '../services/api';
import './AreaManagement.css';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Área seleccionada
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  
  // Formularios
  const [createForm, setCreateForm] = useState({
    name: '',
    is_active: true,
    grupos: [] as GrupoNested[],
    posiciones: [] as PosicionNested[]
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    is_active: true,
    grupos: [] as GrupoNested[],
    posiciones: [] as PosicionNested[]
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
      setShowEditModal(false);
      setSelectedArea(null);
      loadAreas();
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

  const openEditModal = (area: Area) => {
    setSelectedArea(area);
    setEditErrors({});
    setEditForm({
      name: area.name,
      is_active: area.is_active,
      grupos: area.grupos || [],
      posiciones: area.posiciones || []
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeactivateModal(true);
  };

  const openDetailsModal = (area: Area) => {
    setSelectedArea(area);
    setShowDetailsModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      is_active: true,
      grupos: [],
      posiciones: []
    });
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
        <h1>Gestión de Áreas</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Nueva Área
        </button>
      </div>

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
                    className="btn-icon btn-view" 
                    onClick={() => openDetailsModal(area)}
                    title="Ver detalles"
                  >
                    <FaEye />
                  </button>
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

      {/* Modal: Editar Área */}
      {showEditModal && selectedArea && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Área</h2>
            <form onSubmit={handleUpdateArea}>
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
              </div>

              {/* Sección de Grupos */}
              <div className="grupos-section">
                <div className="section-header">
                  <h3><FaUsers /> Grupos</h3>
                  <button 
                    type="button" 
                    className="btn-add-grupo"
                    onClick={() => addGrupo('edit')}
                  >
                    <FaPlus /> Agregar Grupo
                  </button>
                </div>

                {editForm.grupos.map((grupo, grupoIndex) => (
                  <div key={grupoIndex} className="grupo-form">
                    <div className="grupo-header">
                      <h4>Grupo {grupoIndex + 1}</h4>
                      <button 
                        type="button" 
                        className="btn-remove-grupo"
                        onClick={() => removeGrupo(grupoIndex, 'edit')}
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
                          onChange={(e) => updateGrupo(grupoIndex, 'name', e.target.value, 'edit')}
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
                    onClick={() => addPosicion('edit')}
                  >
                    <FaPlus /> Agregar Posición
                  </button>
                </div>

                {editForm.posiciones.map((posicion, posicionIndex) => (
                  <div key={posicionIndex} className="posicion-form">
                    <div className="posicion-header">
                      <h4>Posición {posicionIndex + 1}</h4>
                      <button 
                        type="button" 
                        className="btn-remove-posicion"
                        onClick={() => removePosicion(posicionIndex, 'edit')}
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
                          onChange={(e) => updatePosicion(posicionIndex, 'name', e.target.value, 'edit')}
                          required
                        />
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
              
              <FieldError errors={editErrors.general} />
              
              <div className="modal-actions">
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

      {/* Modal: Ver Detalles del Área */}
      {showDetailsModal && selectedArea && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-details" onClick={(e) => e.stopPropagation()}>
            <h2>Detalles del Área: {selectedArea.name}</h2>
            
            <div className="area-details">
              <div className="detail-section">
                <h3>Información General</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Nombre:</label>
                    <span>{selectedArea.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Estado:</label>
                    <span className={`status-badge ${selectedArea.is_active ? 'status-active' : 'status-inactive'}`}>
                      {selectedArea.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Fecha de Creación:</label>
                    <span>{new Date(selectedArea.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3><FaUsers /> Grupos ({selectedArea.grupos?.length || 0})</h3>
                {selectedArea.grupos && selectedArea.grupos.length > 0 ? (
                  <div className="grupos-list">
                    {selectedArea.grupos.map(grupo => (
                      <div key={grupo.id} className="grupo-item">
                        <div className="grupo-header">
                          <span className="grupo-name">{grupo.name}</span>
                          <span className={`status-badge ${grupo.is_active ? 'status-active' : 'status-inactive'}`}>
                            {grupo.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No hay grupos asignados a esta área.</p>
                )}
              </div>

              <div className="detail-section">
                <h3><FaBriefcase /> Posiciones ({selectedArea.posiciones?.length || 0})</h3>
                <div className="posiciones-summary">
                  {selectedArea.posiciones && selectedArea.posiciones.length > 0 ? (
                    <div className="posiciones-list">
                      {selectedArea.posiciones.map(posicion => (
                        <div key={posicion.id} className="posicion-item">
                          <div className="posicion-header">
                            <span className="posicion-name">{posicion.name}</span>
                            <span className={`status-badge ${posicion.is_active ? 'status-active' : 'status-inactive'}`}>
                              {posicion.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No hay posiciones en esta área.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaManagement;
