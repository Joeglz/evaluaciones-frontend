import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaBan, 
  FaCheckCircle, 
  FaSearch,
  FaFilter,
  FaUsers
} from 'react-icons/fa';
import { apiService, Grupo, Area } from '../services/api';
import './GrupoManagement.css';

const GrupoManagement: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
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
  
  // Grupo seleccionado
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  
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
      loadGrupos();
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
      const data = await apiService.getAreas();
      setAreas(data);
    } catch (err) {
      console.error('Error al cargar áreas:', err);
    }
  };

  const loadGrupos = async () => {
    try {
      if (grupos.length === 0) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.is_active = statusFilter === 'active';
      if (areaFilter) params.area = areaFilter;
      
      const data = await apiService.getGrupos(params);
      setGrupos(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar grupos');
      console.error(err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleCreateGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    
    try {
      await apiService.createGrupo({
        ...createForm,
        area: parseInt(createForm.area)
      });
      setShowCreateModal(false);
      resetCreateForm();
      loadGrupos();
      alert('Grupo creado exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setCreateErrors(validationErrors);
    }
  };

  const handleUpdateGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrupo) return;
    
    setEditErrors({});
    
    try {
      await apiService.updateGrupo(selectedGrupo.id, editForm);
      setShowEditModal(false);
      setSelectedGrupo(null);
      loadGrupos();
      alert('Grupo actualizado exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setEditErrors(validationErrors);
    }
  };

  const handleDeleteGrupo = async () => {
    if (!selectedGrupo) return;
    
    try {
      await apiService.deleteGrupo(selectedGrupo.id);
      setShowDeleteModal(false);
      setSelectedGrupo(null);
      loadGrupos();
      alert('Grupo eliminado exitosamente');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeactivateGrupo = async () => {
    if (!selectedGrupo) return;
    
    try {
      if (selectedGrupo.is_active) {
        await apiService.deactivateGrupo(selectedGrupo.id);
        alert('Grupo desactivado exitosamente');
      } else {
        await apiService.activateGrupo(selectedGrupo.id);
        alert('Grupo activado exitosamente');
      }
      setShowDeactivateModal(false);
      setSelectedGrupo(null);
      loadGrupos();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openEditModal = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setEditErrors({});
    setEditForm({
      name: grupo.name,
      area: grupo.area.toString(),
      is_active: grupo.is_active
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
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
    return <div className="grupo-management-loading">Cargando grupos...</div>;
  }

  return (
    <div className="grupo-management">
      <div className="grupo-management-header">
        <h1><FaUsers /> Gestión de Grupos</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Nuevo Grupo
        </button>
      </div>

      <div className="grupo-management-filters">
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
            placeholder="Buscar por nombre, descripción o área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <FaFilter />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className="filter-group">
          <FaFilter />
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map(area => (
              <option key={area.id} value={area.id.toString()}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grupos-table-container">
        <table className="grupos-table">
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
            {grupos.map((grupo) => (
              <tr key={grupo.id}>
                <td>{grupo.name}</td>
                <td>{getAreaName(grupo.area)}</td>
                <td>
                  <span className={`status-badge ${grupo.is_active ? 'status-active' : 'status-inactive'}`}>
                    {grupo.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>{new Date(grupo.created_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button 
                    className="btn-icon btn-edit" 
                    onClick={() => openEditModal(grupo)}
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-icon btn-deactivate" 
                    onClick={() => openDeactivateModal(grupo)}
                    title={grupo.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {grupo.is_active ? <FaBan /> : <FaCheckCircle />}
                  </button>
                  <button 
                    className="btn-icon btn-delete" 
                    onClick={() => openDeleteModal(grupo)}
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

      {/* Modal: Crear Grupo */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Grupo</h2>
            <form onSubmit={handleCreateGrupo}>
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
                    Grupo activo
                  </label>
                </div>
              </div>
              
              <FieldError errors={createErrors.general} />
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Grupo */}
      {showEditModal && selectedGrupo && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Grupo</h2>
            <form onSubmit={handleUpdateGrupo}>
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
                    Grupo activo
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
      {showDeleteModal && selectedGrupo && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro que deseas eliminar permanentemente el grupo <strong>{selectedGrupo.name}</strong>?
            </p>
            <p className="warning-text">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteGrupo}>
                Eliminar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Desactivación/Activación */}
      {showDeactivateModal && selectedGrupo && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedGrupo.is_active ? 'Confirmar Desactivación' : 'Confirmar Activación'}</h2>
            <p>
              ¿Estás seguro que deseas {selectedGrupo.is_active ? 'desactivar' : 'activar'} el grupo <strong>{selectedGrupo.name}</strong>?
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleDeactivateGrupo}>
                {selectedGrupo.is_active ? 'Desactivar' : 'Activar'} Grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrupoManagement;
