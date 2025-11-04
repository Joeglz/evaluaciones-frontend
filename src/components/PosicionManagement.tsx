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
import { apiService, Posicion, Area } from '../services/api';
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

  const openEditModal = (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setEditErrors({});
    setEditForm({
      name: posicion.name,
      area: posicion.area.toString(),
      is_active: posicion.is_active
    });
    setShowEditModal(true);
  };

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
              <th>Estado</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posiciones.map((posicion) => (
              <tr key={posicion.id}>
                <td>{posicion.name}</td>
                <td>{getAreaName(posicion.area)}</td>
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
            ))}
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
