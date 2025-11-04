import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaEdit, FaSave, FaTimes, FaSignature, FaEraser, FaCheck } from 'react-icons/fa';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import { apiService, getMediaUrl } from '../services/api';
import './UserProfile.css';

interface UserProfileProps {}

const UserProfile: React.FC<UserProfileProps> = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    numero_empleado: '',
    signature: null as File | null
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Referencias para el canvas de firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Configurar el canvas para dibujar
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar el estilo del pincel
    ctx.strokeStyle = '#e12026';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
          numero_empleado: parsedUser.numero_empleado || '',
          signature: null
        });
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

  // Funciones para el canvas de firma
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setLoading(true);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'signature.png', { type: 'image/png' });
          
          // Crear FormData solo con la firma
          const signatureData = new FormData();
          signatureData.append('signature', file);
          
          // Enviar solo la firma al backend
          const response = await apiService.updateUserProfile(user.id, signatureData);
          
          // Actualizar datos locales
          const updatedUser = {
            ...user,
            signature: response.signature
          };
          
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Limpiar formData.signature ya que ahora está guardada en user.signature
          setFormData(prev => ({
            ...prev,
            signature: null
          }));
          
          // Limpiar el canvas también
          setHasSignature(false);
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
          
          showSuccess('Firma guardada exitosamente');
        }
      }, 'image/png');
      
    } catch (error: any) {
      console.error('Error saving signature:', error);
      showError('Error al guardar la firma');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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
      
      // Si hay una firma dibujada pero no guardada, guardarla automáticamente
      if (hasSignature && !formData.signature) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'signature.png', { type: 'image/png' });
              submitData.append('signature', file);
              // Continuar con el envío
              sendFormData(submitData);
            }
          }, 'image/png');
          return; // Salir aquí, el envío continuará en el callback
        }
      }
      
      // Si ya hay una firma guardada o no hay firma, enviar directamente
      if (formData.signature) {
        submitData.append('signature', formData.signature);
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
        signature: response.signature
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
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
        <p>Gestiona tu información personal y firma digital</p>
      </div>

      <div className="user-profile-content">
        {/* Información del Usuario */}
        <div className="profile-section">
          <div className="section-header">
            <FaUser className="section-icon" />
            <h2>Información Personal</h2>
            {!isEditing && (
              <button 
                className="btn-edit"
                onClick={() => setIsEditing(true)}
              >
                <FaEdit /> Editar
              </button>
            )}
          </div>

          <div className="profile-info">
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

        {/* Firma Digital */}
        <div className="profile-section">
          <div className="section-header">
            <FaSignature className="section-icon" />
            <h2>Firma Digital</h2>
          </div>

          <div className="signature-section">
            <div className="signature-canvas-container">
              <div className="canvas-wrapper">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="signature-canvas"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              
              <div className="signature-controls">
                <button 
                  className="btn-clear"
                  onClick={clearSignature}
                  disabled={!hasSignature}
                >
                  <FaEraser /> Limpiar
                </button>
                
                <button 
                  className="btn-save-signature"
                  onClick={saveSignature}
                  disabled={!hasSignature || loading}
                >
                  <FaCheck /> {loading ? 'Guardando...' : 'Guardar Firma'}
                </button>
              </div>
            </div>

            {formData.signature && (
              <div className="signature-preview">
                <h3>Firma Guardada:</h3>
                <div className="preview-container">
                  <img 
                    src={URL.createObjectURL(formData.signature)} 
                    alt="Vista previa de la firma"
                    className="signature-preview-img"
                  />
                </div>
              </div>
            )}

            {user?.signature && (
              <div className="current-signature">
                <h3>Firma Actual:</h3>
                <div className="signature-display">
                  <img 
                    src={getMediaUrl(user.signature)} 
                    alt="Firma actual"
                    className="signature-img"
                  />
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
