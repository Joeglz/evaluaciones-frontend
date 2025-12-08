import React, { useState, useEffect, useMemo } from 'react';
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
  FaBuilding,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaFileExcel,
  FaUpload
} from 'react-icons/fa';
import { apiService, User, UserCreate, UserUpdate, ChangePassword, Area, Posicion, Grupo, getMediaUrl } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './UserManagement.css';

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];

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
  type ValidationErrors = Record<string, string[]> & {
    detail?: string | string[];
    non_field_errors?: string[];
    __all__?: string[];
  };

  const [createErrors, setCreateErrors] = useState<ValidationErrors>({});
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  
  // Estados para modales
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

  const [createProfilePhotoFile, setCreateProfilePhotoFile] = useState<File | null>(null);
  const [createProfilePhotoPreview, setCreateProfilePhotoPreview] = useState<string | null>(null);
  const [editProfilePhotoFile, setEditProfilePhotoFile] = useState<File | null>(null);
  
  // Estados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<string | null>(null);
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState<boolean>(false);
  
  // Estados para carga masiva
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadZipFile, setBulkUploadZipFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);

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

  useEffect(() => {
    return () => {
      if (createProfilePhotoPreview && createProfilePhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(createProfilePhotoPreview);
      }
    };
  }, [createProfilePhotoPreview]);

  useEffect(() => {
    return () => {
      if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(editProfilePhotoPreview);
      }
    };
  }, [editProfilePhotoPreview]);

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

  const validateProfilePhoto = (file: File): boolean => {
    if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
      showError('La foto debe ser una imagen JPG o PNG.');
      return false;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      showError('La foto debe pesar máximo 2 MB.');
      return false;
    }
    return true;
  };

  const handleCreatePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (createProfilePhotoPreview && createProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(createProfilePhotoPreview);
    }
    if (!file) {
      setCreateProfilePhotoFile(null);
      setCreateProfilePhotoPreview(null);
      return;
    }
    if (!validateProfilePhoto(file)) {
      event.target.value = '';
      setCreateProfilePhotoFile(null);
      setCreateProfilePhotoPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setCreateProfilePhotoFile(file);
    setCreateProfilePhotoPreview(previewUrl);
  };

  const clearCreateProfilePhoto = () => {
    if (createProfilePhotoPreview && createProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(createProfilePhotoPreview);
    }
    setCreateProfilePhotoFile(null);
    setCreateProfilePhotoPreview(null);
  };

  const handleEditPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfilePhotoPreview);
    }
    if (!file) {
      setEditProfilePhotoFile(null);
      setEditProfilePhotoPreview(
        selectedUser?.profile_photo ? getMediaUrl(selectedUser.profile_photo) : null
      );
      return;
    }
    if (!validateProfilePhoto(file)) {
      event.target.value = '';
      setEditProfilePhotoFile(null);
      setEditProfilePhotoPreview(
        selectedUser?.profile_photo ? getMediaUrl(selectedUser.profile_photo) : null
      );
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setEditProfilePhotoFile(file);
    setEditProfilePhotoPreview(previewUrl);
    setRemoveProfilePhoto(false);
  };

  const clearEditProfilePhotoSelection = () => {
    if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfilePhotoPreview);
    }
    setEditProfilePhotoFile(null);
    setEditProfilePhotoPreview(
      selectedUser?.profile_photo ? getMediaUrl(selectedUser.profile_photo) : null
    );
    setRemoveProfilePhoto(false);
  };

  const handleRemoveCurrentProfilePhoto = () => {
    if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfilePhotoPreview);
    }
    setEditProfilePhotoFile(null);
    setEditProfilePhotoPreview(null);
    setRemoveProfilePhoto(true);
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
    clearCreateProfilePhoto();
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

    if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfilePhotoPreview);
    }
    setEditProfilePhotoFile(null);
    setEditProfilePhotoPreview(user.profile_photo ? getMediaUrl(user.profile_photo) : null);
    setRemoveProfilePhoto(false);
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
    if (createProfilePhotoPreview && createProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(createProfilePhotoPreview);
    }
    if (editProfilePhotoPreview && editProfilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfilePhotoPreview);
    }

    setCreateProfilePhotoFile(null);
    setCreateProfilePhotoPreview(null);
    setEditProfilePhotoFile(null);
    setEditProfilePhotoPreview(null);
    setRemoveProfilePhoto(false);

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

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.downloadUserTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_carga_masiva_usuarios.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Plantilla descargada exitosamente');
    } catch (err: any) {
      showError(err.message || 'Error al descargar la plantilla');
    }
  };

  const handleBulkUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showError('El archivo debe ser un Excel (.xlsx o .xls)');
        e.target.value = '';
        return;
      }
      setBulkUploadFile(file);
    }
  };

  const handleBulkUploadZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.name.endsWith('.zip')) {
        showError('El archivo debe ser un ZIP (.zip)');
        e.target.value = '';
        return;
      }
      setBulkUploadZipFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      showError('Por favor selecciona un archivo');
      return;
    }

    setBulkUploadLoading(true);
    try {
      const result = await apiService.bulkUploadUsers(bulkUploadFile, bulkUploadZipFile || undefined);
      
      let message = `Procesamiento completado:\n`;
      message += `✓ Usuarios creados: ${result.summary.total_created}\n`;
      if (result.summary.total_errors > 0) {
        message += `✗ Errores: ${result.summary.total_errors}\n`;
      }
      
      if (result.created_areas.length > 0) {
        message += `\nÁreas creadas: ${result.created_areas.join(', ')}\n`;
      }
      if (result.created_posiciones.length > 0) {
        message += `Posiciones creadas: ${result.created_posiciones.join(', ')}\n`;
      }
      if (result.created_grupos.length > 0) {
        message += `Grupos creados: ${result.created_grupos.join(', ')}\n`;
      }

      if (result.summary.images_assigned > 0) {
        message += `\n✓ Imágenes asignadas: ${result.summary.images_assigned}\n`;
      }
      if (result.summary.images_not_found > 0) {
        message += `⚠ Imágenes no encontradas: ${result.summary.images_not_found}\n`;
        if (result.images_not_found && result.images_not_found.length > 0) {
          message += `  Usuarios sin imagen: ${result.images_not_found.map(img => img.username).join(', ')}\n`;
        }
      }

      if (result.errors.length > 0) {
        message += `\nErrores encontrados:\n`;
        result.errors.forEach(err => {
          const identifier = err.email || err.numero_empleado || 'N/A';
          message += `  Fila ${err.row} (${identifier}): ${err.error}\n`;
        });
      }

      if (result.summary.total_created > 0) {
        showSuccess(message);
      } else if (result.summary.total_errors > 0) {
        showError(message);
      } else {
        showSuccess(message);
      }
      
      setShowBulkUploadModal(false);
      setBulkUploadFile(null);
      setBulkUploadZipFile(null);
      loadUsers();
      loadAreas();
      loadPosiciones();
      loadGrupos();
    } catch (err: any) {
      showError(err.message || 'Error al procesar el archivo');
    } finally {
      setBulkUploadLoading(false);
    }
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
    setShowPassword(false);
    setShowPasswordConfirm(false);
    clearCreateProfilePhoto();
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

  const handleFillDefaultPassword = async () => {
    try {
      const response = await apiService.getDefaultPassword();
      setCreateForm({
        ...createForm,
        password: response.default_password,
        password_confirm: response.default_password
      });
      showSuccess('Contraseña por defecto aplicada');
    } catch (error: any) {
      console.error('Error al obtener contraseña por defecto:', error);
      showError('Error al obtener la contraseña por defecto');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-admin';
      case 'ENTRENADOR':
        return 'badge-entrenador';
      case 'SUPERVISOR':
        return 'badge-supervisor';
      default:
        return 'badge-usuario';
    }
  };

  const getUserPositionName = (user: User): string => {
    const posicion = posiciones.find((pos) => pos.id === user.posicion);
    if (posicion) {
      return posicion.name;
    }
    if (user.posicion_name) {
      return user.posicion_name;
    }
    return 'Sin posición';
  };

  const filteredUsersList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return users;
    }

    return users.filter((user) => {
      const hayNumeroEmpleado = user.numero_empleado ? `#${user.numero_empleado}` : '';
      const posicionNombre = getUserPositionName(user);
      const areasTexto = (user.areas_list || []).join(' ').toLowerCase();

      return (
        user.full_name.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        user.role_display.toLowerCase().includes(term) ||
        hayNumeroEmpleado.toLowerCase().includes(term) ||
        posicionNombre.toLowerCase().includes(term) ||
        areasTexto.includes(term)
      );
    });
  }, [users, searchTerm, posiciones]);

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

  const renderGlobalErrors = (errors: ValidationErrors | undefined, details?: string | string[]) => {
    const nonFieldErrors = errors?.non_field_errors || errors?.__all__ || [];
    const detailArray = Array.isArray(details) ? details : details ? [details] : [];
    const messages = [...nonFieldErrors, ...detailArray];

    if (messages.length === 0) {
      return null;
    }

    return (
      <div className="step-modal__global-error">
        {messages.map((message, index) => (
          <span key={index}>{message}</span>
        ))}
      </div>
    );
  };

  const getStepForErrors = (errors: ValidationErrors | undefined): number => {
    if (!errors) {
      return currentStep;
    }

    const step1Fields = new Set([
      'username',
      'email',
      'first_name',
      'last_name',
      'password',
      'password_confirm',
      'profile_photo',
    ]);
    const step2Fields = new Set([
      'role',
      'numero_empleado',
      'fecha_ingreso',
      'is_active',
    ]);
    const step3Fields = new Set([
      'areas',
      'posicion',
      'grupo',
    ]);

    const fieldKeys = Object.keys(errors).filter(
      (key) => !['detail', 'non_field_errors', '__all__'].includes(key)
    );

    for (const key of fieldKeys) {
      if (step1Fields.has(key)) {
        return 1;
      }
    }

    for (const key of fieldKeys) {
      if (step2Fields.has(key)) {
        return 2;
      }
    }

    for (const key of fieldKeys) {
      if (step3Fields.has(key)) {
        return 3;
      }
    }

    if (errors.non_field_errors || errors.__all__ || errors.detail) {
      return 1;
    }

    return currentStep;
  };

  // Funciones de renderizado para cada paso
  const renderStep1 = () => {
    const form = isCreating ? createForm : editForm;
    const errors = isCreating ? createErrors : editErrors;
    const photoPreview = isCreating ? createProfilePhotoPreview : editProfilePhotoPreview;

    return (
      <div className="step-content">
        <h3>Datos Generales</h3>

        <div className="step-photo-block">
          <div className="step-photo-preview">
            {photoPreview ? (
              <img src={photoPreview} alt="Foto de perfil" />
            ) : (
              <div className="photo-placeholder">
                <FaUser />
              </div>
            )}
          </div>
          <div className="step-photo-actions">
            <label className="btn-upload full">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={isCreating ? handleCreatePhotoChange : handleEditPhotoChange}
              />
              {photoPreview ? 'Cambiar foto' : 'Agregar foto'}
            </label>
            {photoPreview && (
              <button
                type="button"
                className="btn-link"
                onClick={isCreating ? clearCreateProfilePhoto : clearEditProfilePhotoSelection}
              >
                Quitar foto
              </button>
            )}
            {!isCreating && selectedUser?.profile_photo && !removeProfilePhoto && (
              <button type="button" className="btn-link" onClick={handleRemoveCurrentProfilePhoto}>
                Eliminar foto actual
              </button>
            )}
            {!isCreating && removeProfilePhoto && (
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setRemoveProfilePhoto(false);
                  setEditProfilePhotoPreview(selectedUser?.profile_photo ? getMediaUrl(selectedUser.profile_photo) : null);
                }}
              >
                Restaurar foto
              </button>
            )}
            {!isCreating && removeProfilePhoto && (
              <p className="photo-remove-note">Se eliminará la foto actual al guardar.</p>
            )}
            <FieldError errors={errors.profile_photo} />
          </div>
        </div>

        <div className="form-grid">
          {!isCreating && (
            <div className="form-group">
              <label>Nombre de Usuario</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => {
                  setEditForm({...editForm, username: e.target.value});
                }}
                className={errors.username ? 'error' : ''}
                readOnly
                title="El nombre de usuario se genera automáticamente desde el número de empleado"
              />
              {errors.username && <div className="error-message">{errors.username[0]}</div>}
            </div>
          )}

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
                <div className="password-field-header">
                  <label>Contraseña *</label>
                  <button
                    type="button"
                    className="btn-default-password"
                    onClick={handleFillDefaultPassword}
                    title="Usar contraseña por defecto"
                  >
                    <FaKey /> Usar contraseña por defecto
                  </button>
                </div>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className={errors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <div className="error-message">{errors.password[0]}</div>}
              </div>

              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={createForm.password_confirm}
                    onChange={(e) => setCreateForm({...createForm, password_confirm: e.target.value})}
                    className={errors.password_confirm ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    title={showPasswordConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPasswordConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
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
              <option value="ENTRENADOR">Entrenador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrador</option>
            </select>
            {errors.role && <div className="error-message">{errors.role[0]}</div>}
          </div>

          <div className="form-group">
            <label>Número de Empleado {isCreating ? '*' : ''}</label>
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
              required={isCreating}
            />
            {errors.numero_empleado && <div className="error-message">{errors.numero_empleado[0]}</div>}
            {isCreating && (
              <div className="field-helper">
                Este número se usará como nombre de usuario para iniciar sesión
              </div>
            )}
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
    if (isCreating) {
      setCreateErrors({});
    } else {
      setEditErrors({});
    }

    try {
      if (isCreating) {
        let payload: UserCreate | FormData;

        if (createProfilePhotoFile) {
          const formData = new FormData();
          // No enviar username, el backend lo generará desde numero_empleado
          formData.append('email', createForm.email);
          formData.append('first_name', createForm.first_name || '');
          formData.append('last_name', createForm.last_name || '');
          formData.append('password', createForm.password);
          formData.append('password_confirm', createForm.password_confirm);
          formData.append('role', createForm.role);
          formData.append('is_active', createForm.is_active ? 'true' : 'false');

          if (createForm.numero_empleado) {
            formData.append('numero_empleado', createForm.numero_empleado);
          }

          if (createForm.fecha_ingreso) {
            formData.append('fecha_ingreso', createForm.fecha_ingreso);
          }

          if (createForm.posicion !== null) {
            formData.append('posicion', String(createForm.posicion));
          }

          if (createForm.grupo !== null) {
            formData.append('grupo', String(createForm.grupo));
          }

          createForm.areas.forEach((areaId) => formData.append('areas', String(areaId)));
          formData.append('profile_photo', createProfilePhotoFile);
          payload = formData;
        } else {
          // No enviar username, el backend lo generará desde numero_empleado
          const { username, ...createPayload } = createForm;
          payload = createPayload;
        }

        await apiService.createUser(payload);
        showSuccess('Usuario creado exitosamente');
      } else if (isEditing && selectedUser) {
        let payload: UserUpdate | FormData;

        if (editProfilePhotoFile || removeProfilePhoto) {
          const formData = new FormData();
          formData.append('username', editForm.username);
          formData.append('email', editForm.email);
          formData.append('first_name', editForm.first_name || '');
          formData.append('last_name', editForm.last_name || '');
          formData.append('role', editForm.role);
          formData.append('is_active', editForm.is_active ? 'true' : 'false');

          if (editForm.numero_empleado) {
            formData.append('numero_empleado', editForm.numero_empleado);
          } else {
            formData.append('numero_empleado', '');
          }

          if (editForm.fecha_ingreso) {
            formData.append('fecha_ingreso', editForm.fecha_ingreso);
          } else {
            formData.append('fecha_ingreso', '');
          }

          if (editForm.posicion !== null) {
            formData.append('posicion', String(editForm.posicion));
          }

          if (editForm.grupo !== null) {
            formData.append('grupo', String(editForm.grupo));
          }

          editForm.areas.forEach((areaId) => formData.append('areas', String(areaId)));
          formData.append('remove_profile_photo', removeProfilePhoto ? 'true' : 'false');

          if (editProfilePhotoFile) {
            formData.append('profile_photo', editProfilePhotoFile);
          }

          payload = formData;
        } else {
          payload = { ...editForm, remove_profile_photo: removeProfilePhoto };
        }

        await apiService.updateUser(selectedUser.id, payload);
        showSuccess('Usuario actualizado exitosamente');
      }

      closeStepModal();
      loadUsers();
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);

      const errorData: ValidationErrors | undefined = err?.errorData || err?.response?.data;

      if (errorData) {
        if (isCreating) {
          setCreateErrors(errorData);
        } else {
          setEditErrors(errorData);
        }

        const targetStep = getStepForErrors(errorData);
        if (targetStep !== currentStep) {
          setCurrentStep(targetStep);
        }

        const nonField = Array.isArray(errorData?.non_field_errors) ? errorData.non_field_errors : [];
        const detailValue = errorData?.detail;
        const detailList = Array.isArray(detailValue)
          ? detailValue
          : detailValue
          ? [detailValue]
          : [];
        const messages = [...nonField, ...detailList];

        if (messages.length > 0) {
          messages.forEach((message) => showError(message));
        } else {
          showError('Corrige los campos marcados antes de continuar.');
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
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleDownloadTemplate}>
            <FaDownload /> Descargar Plantilla
          </button>
          <button className="btn-secondary" onClick={() => setShowBulkUploadModal(true)}>
            <FaUpload /> Carga Masiva
          </button>
          <button className="btn-primary" onClick={startCreateUser}>
            <FaPlus /> Nuevo Usuario
          </button>
        </div>
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
            <option value="ENTRENADOR">Entrenador</option>
            <option value="SUPERVISOR">Supervisor</option>
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
              <th>Número de Empleado</th>
              <th>Posición</th>
              <th>Áreas</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsersList.map((user) => (
              <tr 
                key={user.id} 
                className="user-row"
                onClick={() => openUserDetailModal(user)}
              >
                <td className="user-name-cell">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.profile_photo ? (
                        <img
                          src={getMediaUrl(user.profile_photo)}
                          alt={`Foto de ${user.full_name}`}
                        />
                      ) : (
                        <FaUser />
                      )}
                    </div>
                    <div className="user-data">
                      <span className="user-full-name">{user.full_name}</span>
                      <span className="user-username">@{user.username}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {user.role_display}
                  </span>
                </td>
                <td>
                  {user.numero_empleado ? `#${user.numero_empleado}` : 'Sin asignar'}
                </td>
                <td>
                  {getUserPositionName(user)}
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

      {/* Modal: Cambiar contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cambiar contraseña para {selectedUser.full_name}</h2>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nueva contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    required
                  />
                  <FieldError errors={passwordErrors.new_password} />
                </div>
                <div className="form-group">
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.new_password_confirm}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password_confirm: e.target.value })
                    }
                    required
                  />
                  <FieldError errors={passwordErrors.new_password_confirm} />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* Modal: Confirmar eliminación */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Eliminar usuario</h2>
            <p>
              ¿Estás seguro de que deseas eliminar a <strong>{selectedUser.full_name}</strong>? Esta
              acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteUser}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Modal: Activar/Desactivar usuario */}
      {showDeactivateModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser.is_active ? 'Desactivar' : 'Activar'} usuario</h2>
            <p>
              ¿Seguro que quieres {selectedUser.is_active ? 'desactivar' : 'activar'} a
              <strong> {selectedUser.full_name}</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleDeactivateUser}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Modal: Detalle de usuario */}
      {showUserDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetailModal(false)}>
          <div className="modal-content modal-user-detail" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowUserDetailModal(false)}
              title="Cerrar"
            >
              <FaTimes />
            </button>
 
            <div className="user-detail-avatar">
              {selectedUser.profile_photo ? (
                <img
                  src={getMediaUrl(selectedUser.profile_photo)}
                  alt={`Foto de ${selectedUser.full_name}`}
                />
              ) : (
                <FaUser />
              )}
            </div>
 
            <div className="user-detail-info">
              <h2>{selectedUser.full_name}</h2>
              <span className="user-detail-username">@{selectedUser.username}</span>
              <div className="user-detail-meta">
                <span className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                  {selectedUser.role_display}
                </span>
                <span className={`status-badge ${selectedUser.is_active ? 'status-active' : 'status-inactive'}`}>
                  {selectedUser.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
 
            <div className="user-detail-grid">
              <div className="user-detail-field">
                <span className="label">Número de empleado</span>
                <span className="value">
                  {selectedUser.numero_empleado ? `#${selectedUser.numero_empleado}` : 'Sin asignar'}
                </span>
              </div>
 
              <div className="user-detail-field">
                <span className="label">Correo electrónico</span>
                <span className="value">{selectedUser.email}</span>
              </div>
 
              <div className="user-detail-field">
                <span className="label">Posición</span>
                <span className="value">{getUserPositionName(selectedUser)}</span>
              </div>
 
              <div className="user-detail-field">
                <span className="label">Áreas</span>
                <span className="value areas-value">
                  {selectedUser.areas_list && selectedUser.areas_list.length > 0 ? (
                    selectedUser.areas_list.map((area, index) => (
                      <span key={index} className="area-badge">
                        {area}
                      </span>
                    ))
                  ) : (
                    <span className="no-areas">Sin áreas</span>
                  )}
                </span>
              </div>
            </div>
 
            <div className="modal-actions user-detail-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowUserDetailModal(false);
                  openDeactivateModal(selectedUser);
                }}
              >
                {selectedUser.is_active ? <FaBan /> : <FaCheckCircle />}{' '}
                {selectedUser.is_active ? 'Desactivar' : 'Activar'}
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
                className="btn-primary"
                onClick={() => {
                  setShowUserDetailModal(false);
                  startEditUser(selectedUser);
                }}
              >
                <FaEdit /> Editar Usuario
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
          <div className="step-modal" onClick={(e) => e.stopPropagation()}>
            <header className="step-modal__header">
              <button className="step-modal__close" onClick={closeStepModal} title="Cerrar">
                <FaTimes />
              </button>
              <div className="step-modal__title">
                <h2>{isCreating ? 'Crear Usuario' : 'Editar Usuario'}</h2>
                <span className="step-modal__subtitle">Paso {currentStep} de 3</span>
              </div>
            </header>

            <nav className="step-modal__progress">
              <button
                type="button"
                className={`progress-chip ${currentStep === 1 ? 'active' : ''}`}
                onClick={() => setCurrentStep(1)}
              >
                <FaUser />
                <span>Datos</span>
              </button>
              <button
                type="button"
                className={`progress-chip ${currentStep === 2 ? 'active' : ''}`}
                onClick={() => setCurrentStep(2)}
              >
                <FaUserTag />
                <span>Rol</span>
              </button>
              <button
                type="button"
                className={`progress-chip ${currentStep === 3 ? 'active' : ''}`}
                onClick={() => setCurrentStep(3)}
              >
                <FaBuilding />
                <span>Ubicación</span>
              </button>
            </nav>

            <section className="step-modal__body">
              {renderGlobalErrors(
                isCreating ? createErrors : editErrors,
                isCreating ? createErrors.detail : editErrors.detail
              )}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </section>

            <footer className="step-modal__footer">
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
            </footer>
          </div>
        </div>
      )}

      {/* Toast Container */}
      {/* Modal de Carga Masiva */}
      {showBulkUploadModal && (
        <div className="modal-overlay" onClick={() => !bulkUploadLoading && setShowBulkUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Carga Masiva de Usuarios</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowBulkUploadModal(false)}
                disabled={bulkUploadLoading}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar archivo Excel</label>
                <div className="bulk-upload-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadTemplate}
                    disabled={bulkUploadLoading}
                  >
                    <FaDownload /> Descargar Plantilla
                  </button>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkUploadFileChange}
                  disabled={bulkUploadLoading}
                  style={{ marginTop: '10px' }}
                />
                {bulkUploadFile && (
                  <p className="file-selected">
                    <FaFileExcel /> {bulkUploadFile.name}
                  </p>
                )}
                <p className="field-helper">
                  El archivo debe ser un Excel (.xlsx o .xls). 
                  Descarga la plantilla para ver el formato requerido.
                  <br />
                  <strong>Nota:</strong> Las áreas, posiciones y grupos se crearán automáticamente si no existen.
                </p>
              </div>
              
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Seleccionar archivo ZIP con imágenes (Opcional)</label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleBulkUploadZipFileChange}
                  disabled={bulkUploadLoading}
                />
                {bulkUploadZipFile && (
                  <p className="file-selected">
                    <FaFileExcel /> {bulkUploadZipFile.name}
                  </p>
                )}
                <p className="field-helper">
                  Sube un archivo ZIP con las imágenes de los usuarios. 
                  Los nombres de los archivos deben coincidir con el campo "Nombre de Imagen" del Excel.
                  <br />
                  Formatos soportados: JPG, JPEG, PNG, GIF, BMP
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadFile(null);
                  setBulkUploadZipFile(null);
                }}
                disabled={bulkUploadLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleBulkUpload}
                disabled={!bulkUploadFile || bulkUploadLoading}
              >
                {bulkUploadLoading ? 'Procesando...' : <><FaUpload /> Cargar Usuarios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default UserManagement;

