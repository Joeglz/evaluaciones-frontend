import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaBan, 
  FaCheckCircle, 
  FaKey, 
  FaSearch,
  FaFilter,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaUser,
  FaUserTag,
  FaBuilding
} from 'react-icons/fa';
import { apiService, User, UserCreate, UserUpdate, ChangePassword, Area, Posicion, Grupo } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  // Hook para manejar toasts
  const { toasts, removeToast, showSuccess, showError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Estados para el sistema de pasos
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para errores de formularios
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  
  // Usuario seleccionado
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Estado para mostrar acciones en tablet
  const [expandedUserActions, setExpandedUserActions] = useState<number | null>(null);
  
  // Formularios
  const [createForm, setCreateForm] = useState<UserCreate>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    role: 'USUARIO',
    areas: [],
    posicion: null,
    grupo: null,
    numero_empleado: null,
    fecha_ingreso: null,
    is_active: true
  });
  
  const [editForm, setEditForm] = useState<UserUpdate>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'USUARIO',
    areas: [],
    posicion: null,
    grupo: null,
    numero_empleado: null,
    fecha_ingreso: null,
    is_active: true
  });
  
  const [passwordForm, setPasswordForm] = useState<ChangePassword>({
    new_password: '',
    new_password_confirm: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadAreas();
    loadPosiciones();
    loadGrupos();
    loadUsers();
  }, []);

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 500); // Esperar 500ms después del último cambio

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter]);

  // Indicador de búsqueda cuando hay cambios en los filtros
  useEffect(() => {
    if (searchTerm || roleFilter || statusFilter) {
      setSearching(true);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  const handleValidationErrors = (error: any): Record<string, string[]> => {
    // Si es un error de validación con el objeto completo de Django
    if (error.name === 'ValidationError' && typeof error.message === 'object') {
      return error.message;
    }
    
    // Manejar errores de validación de Django REST Framework
    if (error.message && typeof error.message === 'object') {
      return error.message;
    }
    
    // Si es un string, intentar parsearlo como JSON
    if (typeof error.message === 'string') {
      try {
        const parsed = JSON.parse(error.message);
        return parsed;
      } catch {
        // Si no se puede parsear, devolver como error general
        return { general: [error.message] };
      }
    }
    
    // Fallback para otros tipos de error
    return { general: ['Error desconocido'] };
  };

  const loadAreas = async () => {
    try {
      const response = await apiService.getAreas({ is_active: true });
      setAreas(response.results);
    } catch (err) {
      console.error('Error al cargar áreas:', err);
    }
  };

  const loadPosiciones = async () => {
    try {
      const response = await apiService.getPosiciones({ is_active: true });
      setPosiciones(response.results);
    } catch (err) {
      console.error('Error al cargar posiciones:', err);
    }
  };

  const loadGrupos = async () => {
    try {
      const response = await apiService.getGrupos({ is_active: true });
      setGrupos(response.results);
    } catch (err) {
      console.error('Error al cargar grupos:', err);
    }
  };

  // Funciones para el sistema de pasos
  const startCreateUser = () => {
    setIsCreating(true);
    setIsEditing(false);
    setCurrentStep(1);
    setCreateForm({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
      role: 'USUARIO',
      areas: [],
      posicion: null,
      grupo: null,
      numero_empleado: null,
      fecha_ingreso: null,
      is_active: true
    });
    setCreateErrors({});
  };

  const startEditUser = (user: User) => {
    setIsCreating(false);
    setIsEditing(true);
    setCurrentStep(1);
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      areas: user.areas,
      posicion: user.posicion,
      grupo: user.grupo,
      numero_empleado: user.numero_empleado,
      fecha_ingreso: user.fecha_ingreso,
      is_active: user.is_active
    });
    setEditErrors({});
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeStepModal = () => {
    setIsCreating(false);
    setIsEditing(false);
    setCurrentStep(1);
    setSelectedUser(null);
    setCreateErrors({});
    setEditErrors({});
  };

  // Funciones para obtener datos filtrados
  const getPosicionesByArea = (areaId: number) => {
    return posiciones.filter(pos => pos.area === areaId);
  };

  const getGruposByArea = (areaId: number) => {
    return grupos.filter(grupo => grupo.area === areaId);
  };

  const loadUsers = async () => {
    try {
      // Solo mostrar loading completo en la carga inicial
      if (users.length === 0) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.is_active = statusFilter === 'active';
      
      const response = await apiService.getUsers(params);
      setUsers(response.results);
      setError(null);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({}); // Limpiar errores previos
    
    try {
      await apiService.createUser(createForm);
      setShowCreateModal(false);
      resetCreateForm();
      loadUsers();
      alert('Usuario creado exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setCreateErrors(validationErrors);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setEditErrors({}); // Limpiar errores previos
    
    try {
      await apiService.updateUser(selectedUser.id, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
      alert('Usuario actualizado exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setEditErrors(validationErrors);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setPasswordErrors({}); // Limpiar errores previos
    
    try {
      await apiService.changeUserPassword(selectedUser.id, passwordForm);
      setShowPasswordModal(false);
      setSelectedUser(null);
      resetPasswordForm();
      alert('Contraseña actualizada exitosamente');
    } catch (err: any) {
      const validationErrors = handleValidationErrors(err);
      setPasswordErrors(validationErrors);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await apiService.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
      alert('Usuario eliminado exitosamente');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;
    
    try {
      if (selectedUser.is_active) {
        await apiService.deactivateUser(selectedUser.id);
        alert('Usuario desactivado exitosamente');
      } else {
        await apiService.activateUser(selectedUser.id);
        alert('Usuario activado exitosamente');
      }
      setShowDeactivateModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditErrors({}); // Limpiar errores previos
    setEditForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      areas: user.areas,
      posicion: user.posicion,
      grupo: user.grupo,
      numero_empleado: user.numero_empleado,
      fecha_ingreso: user.fecha_ingreso,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setPasswordErrors({}); // Limpiar errores previos
    resetPasswordForm();
    setShowPasswordModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (user: User) => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
      role: 'USUARIO',
      areas: [],
      posicion: null,
      grupo: null,
      numero_empleado: null,
      fecha_ingreso: null,
      is_active: true
    });
  };

  // Función para abrir modal de detalles del usuario
  const openUserDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowUserDetailModal(true);
  };

  const handleAreaChange = (areaId: number, checked: boolean, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      const newAreas = checked 
        ? [...createForm.areas, areaId]
        : createForm.areas.filter(id => id !== areaId);
      setCreateForm({...createForm, areas: newAreas});
    } else {
      const newAreas = checked 
        ? [...editForm.areas, areaId]
        : editForm.areas.filter(id => id !== areaId);
      setEditForm({...editForm, areas: newAreas});
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      new_password: '',
      new_password_confirm: ''
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'EVALUADOR': return 'badge-evaluador';
      default: return 'badge-usuario';
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

  // Funciones de renderizado para cada paso
  const renderStep1 = () => {
    const form = isCreating ? createForm : editForm;
    const errors = isCreating ? createErrors : editErrors;

    return (
      <div className="step-content">
        <h3>Datos Generales</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre de Usuario *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, username: e.target.value});
                } else {
                  setEditForm({...editForm, username: e.target.value});
                }
              }}
              className={errors.username ? 'error' : ''}
            />
            {errors.username && <div className="error-message">{errors.username[0]}</div>}
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, email: e.target.value});
                } else {
                  setEditForm({...editForm, email: e.target.value});
                }
              }}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <div className="error-message">{errors.email[0]}</div>}
          </div>

          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, first_name: e.target.value});
                } else {
                  setEditForm({...editForm, first_name: e.target.value});
                }
              }}
              className={errors.first_name ? 'error' : ''}
            />
            {errors.first_name && <div className="error-message">{errors.first_name[0]}</div>}
          </div>

          <div className="form-group">
            <label>Apellido *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, last_name: e.target.value});
                } else {
                  setEditForm({...editForm, last_name: e.target.value});
                }
              }}
              className={errors.last_name ? 'error' : ''}
            />
            {errors.last_name && <div className="error-message">{errors.last_name[0]}</div>}
          </div>

          {isCreating && (
            <>
              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <div className="error-message">{errors.password[0]}</div>}
              </div>

              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <input
                  type="password"
                  value={createForm.password_confirm}
                  onChange={(e) => setCreateForm({...createForm, password_confirm: e.target.value})}
                  className={errors.password_confirm ? 'error' : ''}
                />
                {errors.password_confirm && <div className="error-message">{errors.password_confirm[0]}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const form = isCreating ? createForm : editForm;
    const errors = isCreating ? createErrors : editErrors;

    return (
      <div className="step-content">
        <h3>Rol y Fechas</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Rol *</label>
            <select
              value={form.role}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, role: e.target.value});
                } else {
                  setEditForm({...editForm, role: e.target.value});
                }
              }}
              className={errors.role ? 'error' : ''}
            >
              <option value="USUARIO">Usuario Regular</option>
              <option value="EVALUADOR">Evaluador</option>
              <option value="ADMIN">Administrador</option>
            </select>
            {errors.role && <div className="error-message">{errors.role[0]}</div>}
          </div>

          <div className="form-group">
            <label>Número de Empleado</label>
            <input
              type="text"
              value={form.numero_empleado || ''}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, numero_empleado: e.target.value || null});
                } else {
                  setEditForm({...editForm, numero_empleado: e.target.value || null});
                }
              }}
              className={errors.numero_empleado ? 'error' : ''}
            />
            {errors.numero_empleado && <div className="error-message">{errors.numero_empleado[0]}</div>}
          </div>

          <div className="form-group">
            <label>Fecha de Ingreso</label>
            <input
              type="date"
              value={form.fecha_ingreso || ''}
              onChange={(e) => {
                if (isCreating) {
                  setCreateForm({...createForm, fecha_ingreso: e.target.value || null});
                } else {
                  setEditForm({...editForm, fecha_ingreso: e.target.value || null});
                }
              }}
              className={errors.fecha_ingreso ? 'error' : ''}
            />
            {errors.fecha_ingreso && <div className="error-message">{errors.fecha_ingreso[0]}</div>}
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => {
                  if (isCreating) {
                    setCreateForm({...createForm, is_active: e.target.checked});
                  } else {
                    setEditForm({...editForm, is_active: e.target.checked});
                  }
                }}
              />
              Usuario activo
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const form = isCreating ? createForm : editForm;
    const errors = isCreating ? createErrors : editErrors;

    return (
      <div className="step-content">
        <h3>Área y Posición</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Área *</label>
            <select
              value={form.areas.length > 0 ? form.areas[0] : ''}
              onChange={(e) => {
                const areaId = parseInt(e.target.value);
                if (isCreating) {
                  setCreateForm({
                    ...createForm, 
                    areas: areaId ? [areaId] : [],
                    posicion: null, // Reset posición when area changes
                    grupo: null // Reset grupo when area changes
                  });
                } else {
                  setEditForm({
                    ...editForm, 
                    areas: areaId ? [areaId] : [],
                    posicion: null, // Reset posición when area changes
                    grupo: null // Reset grupo when area changes
                  });
                }
              }}
              className={errors.areas ? 'error' : ''}
            >
              <option value="">Seleccionar área</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {errors.areas && <div className="error-message">{errors.areas[0]}</div>}
          </div>

          {form.areas.length > 0 && (
            <>
              <div className="form-group">
                <label>Posición</label>
                <select
                  value={form.posicion || ''}
                  onChange={(e) => {
                    if (isCreating) {
                      setCreateForm({...createForm, posicion: e.target.value ? parseInt(e.target.value) : null});
                    } else {
                      setEditForm({...editForm, posicion: e.target.value ? parseInt(e.target.value) : null});
                    }
                  }}
                  className={errors.posicion ? 'error' : ''}
                >
                  <option value="">Seleccionar posición</option>
                  {getPosicionesByArea(form.areas[0]).map(posicion => (
                    <option key={posicion.id} value={posicion.id}>{posicion.name}</option>
                  ))}
                </select>
                {errors.posicion && <div className="error-message">{errors.posicion[0]}</div>}
              </div>

              <div className="form-group">
                <label>Grupo</label>
                <select
                  value={form.grupo || ''}
                  onChange={(e) => {
                    if (isCreating) {
                      setCreateForm({...createForm, grupo: e.target.value ? parseInt(e.target.value) : null});
                    } else {
                      setEditForm({...editForm, grupo: e.target.value ? parseInt(e.target.value) : null});
                    }
                  }}
                >
                  <option value="">Seleccionar grupo</option>
                  {getGruposByArea(form.areas[0]).map(grupo => (
                    <option key={grupo.id} value={grupo.id}>{grupo.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const handleFinalSubmit = async () => {
    try {
      if (isCreating) {
        await apiService.createUser(createForm);
        showSuccess('Usuario creado exitosamente');
      } else if (isEditing && selectedUser) {
        await apiService.updateUser(selectedUser.id, editForm);
        showSuccess('Usuario actualizado exitosamente');
      }
      
      closeStepModal();
      loadUsers();
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (isCreating) {
          setCreateErrors(errorData);
        } else {
          setEditErrors(errorData);
        }
      } else {
        showError('Error al guardar el usuario');
      }
    }
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>Gestión de Usuarios</h1>
        <button className="btn-primary" onClick={startCreateUser}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      <div className="user-management-filters">
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
            placeholder="Buscar por nombre, usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <FaFilter />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="ADMIN">Administrador</option>
            <option value="EVALUADOR">Evaluador</option>
            <option value="USUARIO">Usuario Regular</option>
          </select>
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Áreas</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr 
                key={user.id} 
                className="user-row"
                onClick={() => openUserDetailModal(user)}
              >
                <td className="user-name-cell">
                  <div className="user-info">
                    <span className="user-full-name">{user.full_name}</span>
                    <span className="user-username">@{user.username}</span>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {user.role_display}
                  </span>
                </td>
                <td>
                  <div className="areas-list">
                    {user.areas_list && user.areas_list.length > 0 ? (
                      user.areas_list.map((areaName, index) => (
                        <span key={index} className="area-badge">
                          {areaName}
                        </span>
                      ))
                    ) : (
                      <span className="no-areas">Sin áreas</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Usuario */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Usuario</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Usuario *</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                    required
                    className={createErrors.username ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.username} />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    required
                    className={createErrors.email ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.email} />
                </div>
                
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({...createForm, first_name: e.target.value})}
                    className={createErrors.first_name ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.first_name} />
                </div>
                
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({...createForm, last_name: e.target.value})}
                    className={createErrors.last_name ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.last_name} />
                </div>
                
                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    required
                    className={createErrors.password ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.password} />
                </div>
                
                <div className="form-group">
                  <label>Confirmar Contraseña *</label>
                  <input
                    type="password"
                    value={createForm.password_confirm}
                    onChange={(e) => setCreateForm({...createForm, password_confirm: e.target.value})}
                    required
                    className={createErrors.password_confirm ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.password_confirm} />
                </div>
                
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    required
                    className={createErrors.role ? 'field-error-input' : ''}
                  >
                    <option value="USUARIO">Usuario Regular</option>
                    <option value="EVALUADOR">Evaluador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  <FieldError errors={createErrors.role} />
                </div>
                
                <div className="form-group">
                  <label>Posición</label>
                  <select
                    value={createForm.posicion || ''}
                    onChange={(e) => setCreateForm({...createForm, posicion: e.target.value ? parseInt(e.target.value) : null})}
                    className={createErrors.posicion ? 'field-error-input' : ''}
                  >
                    <option value="">Seleccionar posición</option>
                    {posiciones.map((posicion) => (
                      <option key={posicion.id} value={posicion.id}>
                        {posicion.name} ({areas.find(a => a.id === posicion.area)?.name || 'Área no encontrada'})
                      </option>
                    ))}
                  </select>
                  <FieldError errors={createErrors.posicion} />
                </div>
                
                <div className="form-group">
                  <label>Número de Empleado</label>
                  <input
                    type="text"
                    value={createForm.numero_empleado || ''}
                    onChange={(e) => setCreateForm({...createForm, numero_empleado: e.target.value || null})}
                    className={createErrors.numero_empleado ? 'field-error-input' : ''}
                    placeholder="Ej: EMP001"
                  />
                  <FieldError errors={createErrors.numero_empleado} />
                </div>
                
                <div className="form-group">
                  <label>Fecha de Ingreso</label>
                  <input
                    type="date"
                    value={createForm.fecha_ingreso || ''}
                    onChange={(e) => setCreateForm({...createForm, fecha_ingreso: e.target.value || null})}
                    className={createErrors.fecha_ingreso ? 'field-error-input' : ''}
                  />
                  <FieldError errors={createErrors.fecha_ingreso} />
                </div>
                
                <div className="form-group full-width">
                  <label>Áreas Asignadas</label>
                  <div className="areas-checkboxes">
                    {areas.map((area) => (
                      <label key={area.id} className="area-checkbox">
                        <input
                          type="checkbox"
                          checked={createForm.areas.includes(area.id)}
                          onChange={(e) => handleAreaChange(area.id, e.target.checked, 'create')}
                        />
                        <span>{area.name}</span>
                      </label>
                    ))}
                  </div>
                  <FieldError errors={createErrors.areas} />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={createForm.is_active}
                      onChange={(e) => setCreateForm({...createForm, is_active: e.target.checked})}
                    />
                    Usuario activo
                  </label>
                </div>
              </div>
              
              {/* Errores generales */}
              <FieldError errors={createErrors.general} />
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Usuario</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Usuario *</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    required
                  >
                    <option value="USUARIO">Usuario Regular</option>
                    <option value="EVALUADOR">Evaluador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Posición</label>
                  <select
                    value={editForm.posicion || ''}
                    onChange={(e) => setEditForm({...editForm, posicion: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">Seleccionar posición</option>
                    {posiciones.map((posicion) => (
                      <option key={posicion.id} value={posicion.id}>
                        {posicion.name} ({areas.find(a => a.id === posicion.area)?.name || 'Área no encontrada'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Número de Empleado</label>
                  <input
                    type="text"
                    value={editForm.numero_empleado || ''}
                    onChange={(e) => setEditForm({...editForm, numero_empleado: e.target.value || null})}
                    placeholder="Ej: EMP001"
                  />
                </div>
                
                <div className="form-group">
                  <label>Fecha de Ingreso</label>
                  <input
                    type="date"
                    value={editForm.fecha_ingreso || ''}
                    onChange={(e) => setEditForm({...editForm, fecha_ingreso: e.target.value || null})}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Áreas Asignadas</label>
                  <div className="areas-checkboxes">
                    {areas.map((area) => (
                      <label key={area.id} className="area-checkbox">
                        <input
                          type="checkbox"
                          checked={editForm.areas.includes(area.id)}
                          onChange={(e) => handleAreaChange(area.id, e.target.checked, 'edit')}
                        />
                        <span>{area.name}</span>
                      </label>
                    ))}
                  </div>
                  <FieldError errors={editErrors.areas} />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    />
                    Usuario activo
                  </label>
                </div>
              </div>
              
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

      {/* Modal: Cambiar Contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cambiar Contraseña</h2>
            <p>Usuario: <strong>{selectedUser.username}</strong></p>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Nueva Contraseña *</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <input
                  type="password"
                  value={passwordForm.new_password_confirm}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password_confirm: e.target.value})}
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro que deseas eliminar permanentemente al usuario <strong>{selectedUser.username}</strong>?
            </p>
            <p className="warning-text">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteUser}>
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Desactivación/Activación */}
      {showDeactivateModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser.is_active ? 'Confirmar Desactivación' : 'Confirmar Activación'}</h2>
            <p>
              ¿Estás seguro que deseas {selectedUser.is_active ? 'desactivar' : 'activar'} al usuario <strong>{selectedUser.username}</strong>?
            </p>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleDeactivateUser}>
                {selectedUser.is_active ? 'Desactivar' : 'Activar'} Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalles del Usuario */}
      {showUserDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles del Usuario</h2>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowUserDetailModal(false)}
                title="Cerrar"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  value={selectedUser.username}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={selectedUser.first_name || ''}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Apellido</label>
                <input
                  type="text"
                  value={selectedUser.last_name || ''}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Rol</label>
                <div className="role-display">
                  <span className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role_display}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Posición</label>
                <input
                  type="text"
                  value={selectedUser.posicion ? 
                    `${areas.find(a => a.id === posiciones.find(p => p.id === selectedUser.posicion)?.area)?.name || 'Área no encontrada'} - ${posiciones.find(p => p.id === selectedUser.posicion)?.name || 'Posición no encontrada'}` :
                    'Sin posición asignada'
                  }
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Grupo</label>
                <input
                  type="text"
                  value={selectedUser.grupo ? 
                    grupos.find(g => g.id === selectedUser.grupo)?.name || 'Grupo no encontrado' :
                    'Sin grupo asignado'
                  }
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Número de Empleado</label>
                <input
                  type="text"
                  value={selectedUser.numero_empleado || 'Sin número asignado'}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Fecha de Ingreso</label>
                <input
                  type="text"
                  value={selectedUser.fecha_ingreso ? 
                    new Date(selectedUser.fecha_ingreso).toLocaleDateString('es-ES') : 
                    'Sin fecha asignada'
                  }
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Estado</label>
                <div className="status-display">
                  <span className={`status-badge ${selectedUser.is_active ? 'status-active' : 'status-inactive'}`}>
                    {selectedUser.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Fecha de Registro</label>
                <input
                  type="text"
                  value={new Date(selectedUser.date_joined).toLocaleDateString('es-ES')}
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Último Acceso</label>
                <input
                  type="text"
                  value={selectedUser.last_login ? 
                    new Date(selectedUser.last_login).toLocaleDateString('es-ES') : 
                    'Nunca'
                  }
                  readOnly
                  className="readonly-field"
                />
              </div>
              
              <div className="form-group full-width">
                <label>Áreas Asignadas</label>
                <div className="areas-display">
                  {selectedUser.areas_list && selectedUser.areas_list.length > 0 ? (
                    <div className="areas-list">
                      {selectedUser.areas_list.map((areaName, index) => (
                        <span key={index} className="area-badge">
                          {areaName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-areas">Sin áreas asignadas</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-primary" 
                onClick={() => {
                  setShowUserDetailModal(false);
                  startEditUser(selectedUser);
                }}
              >
                <FaEdit /> Editar Usuario
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowUserDetailModal(false);
                  openPasswordModal(selectedUser);
                }}
              >
                <FaKey /> Cambiar Contraseña
              </button>
              <button 
                className="btn-danger" 
                onClick={() => {
                  setShowUserDetailModal(false);
                  openDeleteModal(selectedUser);
                }}
              >
                <FaTrash /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pasos para crear/editar usuario */}
      {(isCreating || isEditing) && (
        <div className="modal-overlay">
          <div className="modal step-modal">
            <div className="modal-header">
              <h2>
                {isCreating ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                <span className="step-indicator">Paso {currentStep} de 3</span>
              </h2>
              <button className="modal-close" onClick={closeStepModal}>
                <FaTimes />
              </button>
            </div>

            <div className="step-progress">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <FaUser />
                <span>Datos Generales</span>
              </div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <FaUserTag />
                <span>Rol y Fechas</span>
              </div>
              <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                <FaBuilding />
                <span>Área y Posición</span>
              </div>
            </div>

            <div className="modal-body">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            <div className="modal-footer">
              <div className="step-buttons">
                {currentStep > 1 && (
                  <button className="btn-secondary" onClick={prevStep}>
                    <FaArrowLeft /> Anterior
                  </button>
                )}
                {currentStep < 3 ? (
                  <button className="btn-primary" onClick={nextStep}>
                    Siguiente <FaArrowRight />
                  </button>
                ) : (
                  <button className="btn-primary" onClick={handleFinalSubmit}>
                    {isCreating ? 'Crear Usuario' : 'Actualizar Usuario'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default UserManagement;

