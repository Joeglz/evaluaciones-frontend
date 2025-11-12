import React, { useState, useEffect } from 'react';
import { FaUser, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import { apiService, getMediaUrl } from '../services/api';
import './UserProfile.css';

interface UserProfileProps {}

const PROFILE_PHOTO_MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];

const UserProfile: React.FC<UserProfileProps> = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    numero_empleado: ''
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadUserData();
  }, []);

useEffect(() => {
  return () => {
    if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePhotoPreview);
    }
  };
}, [profilePhotoPreview]);

  const loadUserData = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
          first_name: parsedUser.first_name || '',
          last_name: parsedUser.last_name || '',
          email: parsedUser.email || '',
          numero_empleado: parsedUser.numero_empleado || ''
        });
        setProfilePhotoFile(null);
        setProfilePhotoPreview(parsedUser.profile_photo ? getMediaUrl(parsedUser.profile_photo) : null);
        setRemoveProfilePhoto(false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        showError('Error al cargar los datos del usuario');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo específico
    if (errors[name]) {
      setErrors((prev: Record<string, string>) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

const validateProfilePhoto = (file: File): boolean => {
  if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
    showError('La foto debe ser una imagen JPG o PNG.');
    return false;
  }
  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    showError('La foto debe pesar máximo 2 MB.');
    return false;
  }
  return true;
};

const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0] ?? null;

  if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) {
    URL.revokeObjectURL(profilePhotoPreview);
  }

  if (!file) {
    setProfilePhotoFile(null);
    setProfilePhotoPreview(user?.profile_photo ? getMediaUrl(user.profile_photo) : null);
    setRemoveProfilePhoto(false);
    return;
  }

  if (!validateProfilePhoto(file)) {
    event.target.value = '';
    setProfilePhotoFile(null);
    setProfilePhotoPreview(user?.profile_photo ? getMediaUrl(user.profile_photo) : null);
    setRemoveProfilePhoto(false);
    return;
  }

  const url = URL.createObjectURL(file);
  setProfilePhotoFile(file);
  setProfilePhotoPreview(url);
  setRemoveProfilePhoto(false);
};

const clearProfilePhotoSelection = () => {
  if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) {
    URL.revokeObjectURL(profilePhotoPreview);
  }
  setProfilePhotoFile(null);
  setProfilePhotoPreview(user?.profile_photo ? getMediaUrl(user.profile_photo) : null);
  setRemoveProfilePhoto(false);
};

const handleRemoveProfilePhoto = () => {
  if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) {
    URL.revokeObjectURL(profilePhotoPreview);
  }
  setProfilePhotoFile(null);
  setProfilePhotoPreview(null);
  setRemoveProfilePhoto(true);
};

const startEditingProfile = () => {
  if (!isAdmin) {
    return;
  }
  setIsEditing(true);
  setRemoveProfilePhoto(false);
  setProfilePhotoFile(null);
  setProfilePhotoPreview(user?.profile_photo ? getMediaUrl(user.profile_photo) : null);
};

  const handleSubmit = async () => {
    if (!isAdmin) {
      showError('Solo un administrador puede editar el perfil.');
      return;
    }
    try {
      setLoading(true);
      setErrors({});

      // Validaciones básicas
      const newErrors: any = {};
      
      if (!formData.first_name.trim()) {
        newErrors.first_name = 'El nombre es requerido';
      }
      
      if (!formData.last_name.trim()) {
        newErrors.last_name = 'El apellido es requerido';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'El email es requerido';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'El email no es válido';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Crear FormData para enviar archivo
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name);
      submitData.append('last_name', formData.last_name);
      submitData.append('email', formData.email);
      submitData.append('numero_empleado', formData.numero_empleado);
      
      if (profilePhotoFile) {
        submitData.append('profile_photo', profilePhotoFile);
        submitData.append('remove_profile_photo', 'false');
      } else if (removeProfilePhoto) {
        submitData.append('remove_profile_photo', 'true');
      } else {
        submitData.append('remove_profile_photo', 'false');
      }
      
      await sendFormData(submitData);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        showError('Error al actualizar el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFormData = async (submitData: FormData) => {
    try {
      // Actualizar usuario
      const response = await apiService.updateUserProfile(user.id, submitData);
      
      // Actualizar datos locales con la respuesta del servidor
      const updatedUser = {
        ...user,
        first_name: response.first_name,
        last_name: response.last_name,
        email: response.email,
        numero_empleado: response.numero_empleado,
        profile_photo: response.profile_photo,
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfilePhotoFile(null);
      setProfilePhotoPreview(response.profile_photo ? getMediaUrl(response.profile_photo) : null);
      setRemoveProfilePhoto(false);
      
      setIsEditing(false);
      showSuccess('Perfil actualizado exitosamente');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        showError('Error al actualizar el perfil');
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    loadUserData(); // Recargar datos originales
  };

  const getDisplayName = () => {
    if (!user) return 'Usuario';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else {
      return user.username;
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <h1>Mi Perfil</h1>
        <p>Gestiona tu información personal</p>
      </div>

      <div className="user-profile-content">
        {/* Información del Usuario */}
        <div className="profile-section">
          <div className="section-header">
            <FaUser className="section-icon" />
            <h2>Información Personal</h2>
            {!isEditing && isAdmin && (
              <button 
                className="btn-edit"
                onClick={startEditingProfile}
              >
                <FaEdit /> Editar
              </button>
            )}
          </div>

          <div className="profile-info">
            <div className="profile-photo-section">
              <div className="profile-photo-preview">
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Foto de perfil" />
                ) : (
                  <FaUser />
                )}
              </div>
              {isEditing && (
                <div className="profile-photo-actions">
                  <label className="btn-upload">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleProfilePhotoChange}
                    />
                    Cambiar foto
                  </label>
                  {profilePhotoFile && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={clearProfilePhotoSelection}
                    >
                      Cancelar selección
                    </button>
                  )}
                  {(profilePhotoPreview || user?.profile_photo) && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={handleRemoveProfilePhoto}
                    >
                      Eliminar foto
                    </button>
                  )}
                  {removeProfilePhoto && user?.profile_photo && (
                    <span className="photo-remove-note">
                      La foto se eliminará al guardar.
                    </span>
                  )}
                  {errors.profile_photo && (
                    <span className="error-message">{errors.profile_photo}</span>
                  )}
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={errors.first_name ? 'error' : ''}
                    />
                    {errors.first_name && (
                      <span className="error-message">{errors.first_name}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Apellido</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={errors.last_name ? 'error' : ''}
                    />
                    {errors.last_name && (
                      <span className="error-message">{errors.last_name}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && (
                      <span className="error-message">{errors.email}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Número de Empleado</label>
                    <input
                      type="text"
                      name="numero_empleado"
                      value={formData.numero_empleado}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <FaTimes /> Cancelar
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    <FaSave /> {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-display">
                <div className="info-item">
                  <label>Nombre Completo:</label>
                  <span>{getDisplayName()}</span>
                </div>
                <div className="info-item">
                  <label>Usuario:</label>
                  <span>{user?.username}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{user?.email}</span>
                </div>
                <div className="info-item">
                  <label>Número de Empleado:</label>
                  <span>{user?.numero_empleado || 'No asignado'}</span>
                </div>
                <div className="info-item">
                  <label>Rol:</label>
                  <span className="role-badge">{user?.role_display}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default UserProfile;
