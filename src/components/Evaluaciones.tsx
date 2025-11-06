import React, { useState, useEffect, useRef } from 'react';
import {
  FaArrowLeft,
  FaUsers,
  FaBuilding,
  FaLayerGroup,
  FaUserTag,
  FaSearch,
  FaFilter,
  FaTimes,
  FaPlus,
  FaSave,
  FaDownload,
  FaPrint,
  FaCalendarAlt,
  FaClipboardList,
  FaEdit,
  FaEraser
} from 'react-icons/fa';
import { apiService, Area, Grupo, Posicion, User, ListaAsistencia, ListaAsistenciaCreate } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './Evaluaciones.css';

const Evaluaciones: React.FC = () => {
  // Hook para manejar toasts
  const { toasts, removeToast, showSuccess, showError } = useToast();

  // Estados para la navegación jerárquica
  const [currentView, setCurrentView] = useState<'areas' | 'grupos' | 'posiciones' | 'usuarios' | 'usuario-detalle' | 'usuario-evaluacion' | 'onboarding' | 'lista-asistencia-form'>('areas');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [selectedPosicion, setSelectedPosicion] = useState<Posicion | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estados para los datos
  const [areas, setAreas] = useState<Area[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [usuariosRegulares, setUsuariosRegulares] = useState<User[]>([]);
  const [supervisores, setSupervisores] = useState<User[]>([]);
  const [instructores, setInstructores] = useState<User[]>([]);
  const [listasAsistencia, setListasAsistencia] = useState<ListaAsistencia[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<User[]>([]);
  const [evaluacionesUsuario, setEvaluacionesUsuario] = useState<any[]>([]);
  const [evaluacionActual, setEvaluacionActual] = useState<any>(null);
  const [resultadosEvaluacion, setResultadosEvaluacion] = useState<any[]>([]);
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState<number | null>(null);
  
  // Referencias para los canvas de firmas
  const empleadoCanvasRef = useRef<HTMLCanvasElement>(null);
  const evaluadorCanvasRef = useRef<HTMLCanvasElement>(null);
  const calidadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<{ [key: string]: boolean }>({});
  const [hasSignature, setHasSignature] = useState<{ [key: string]: boolean }>({});
  const [signatures, setSignatures] = useState<{ [key: string]: string | null }>({
    empleado: null,
    evaluador: null,
    calidad: null
  });
  const [showFirmaModal, setShowFirmaModal] = useState<{ [key: string]: boolean }>({
    empleado: false,
    evaluador: false,
    calidad: false
  });
  const [currentFirmaTipo, setCurrentFirmaTipo] = useState<string>('');

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario de lista de asistencia
  const [formData, setFormData] = useState<ListaAsistenciaCreate>({
    nombre: '',
    supervisor: null,
    instructor: null,
    fecha: new Date().toISOString().split('T')[0],
    usuarios_regulares: [],
    area: 0,
    is_active: true
  });
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingListaId, setEditingListaId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Configurar los canvas para dibujar
  useEffect(() => {
    const configCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#e12026';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    configCanvas(empleadoCanvasRef.current);
    configCanvas(evaluadorCanvasRef.current);
    configCanvas(calidadCanvasRef.current);
  }, []);

  // Funciones para dibujar en los canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, tipo: string) => {
    const canvas = tipo === 'empleado' ? empleadoCanvasRef.current : tipo === 'evaluador' ? evaluadorCanvasRef.current : calidadCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing({ ...isDrawing, [tipo]: true });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, tipo: string) => {
    if (!isDrawing[tipo]) return;

    const canvas = tipo === 'empleado' ? empleadoCanvasRef.current : tipo === 'evaluador' ? evaluadorCanvasRef.current : calidadCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature({ ...hasSignature, [tipo]: true });
  };

  const stopDrawing = (tipo: string) => {
    setIsDrawing({ ...isDrawing, [tipo]: false });
    // Guardar la firma como imagen automáticamente
    const canvas = tipo === 'empleado' ? empleadoCanvasRef.current : tipo === 'evaluador' ? evaluadorCanvasRef.current : calidadCanvasRef.current;
    if (canvas && hasSignature[tipo]) {
      const dataURL = canvas.toDataURL('image/png');
      setSignatures({ ...signatures, [tipo]: dataURL });
    }
  };

  const handleOpenFirmaModal = (tipo: string) => {
    setCurrentFirmaTipo(tipo);
    setShowFirmaModal({ ...showFirmaModal, [tipo]: true });
    
    // Cargar firma existente si hay una
    if (signatures[tipo]) {
      const canvas = tipo === 'empleado' ? empleadoCanvasRef.current : tipo === 'evaluador' ? evaluadorCanvasRef.current : calidadCanvasRef.current;
      if (canvas) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature({ ...hasSignature, [tipo]: true });
          }
        };
        img.src = signatures[tipo] || '';
      }
    }
  };

  const clearSignature = (tipo: string) => {
    const canvas = tipo === 'empleado' ? empleadoCanvasRef.current : tipo === 'evaluador' ? evaluadorCanvasRef.current : calidadCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature({ ...hasSignature, [tipo]: false });
    setSignatures({ ...signatures, [tipo]: null });
  };

  useEffect(() => {
    // Filtrar usuarios cuando cambie el término de búsqueda
    if (searchTerm) {
      const filtered = usuariosRegulares.filter(user => 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setUsuariosSeleccionados(filtered);
    } else {
      setUsuariosSeleccionados(usuariosRegulares);
    }
  }, [searchTerm, usuariosRegulares]);

  useEffect(() => {
    // Filtrar usuarios en la vista de usuarios cuando cambie el término de búsqueda
    if (currentView === 'usuarios' && searchTerm) {
      const usuariosBase = usuarios.filter(user => {
        const tienePosicion = user.posicion === selectedPosicion?.id;
        const tieneArea = user.areas.includes(selectedArea?.id || 0);
        const tieneGrupo = user.grupo === selectedGrupo?.id;
        const esUsuarioRegular = user.role === 'USUARIO';
        return tienePosicion && tieneArea && tieneGrupo && esUsuarioRegular;
      });
      
      const filtered = usuariosBase.filter(user => 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsuarios(filtered);
    } else if (currentView === 'usuarios' && !searchTerm) {
      // Si no hay término de búsqueda, mostrar todos los usuarios filtrados por área/grupo/posición y rol
      const usuariosFiltrados = usuarios.filter(user => {
        const tienePosicion = user.posicion === selectedPosicion?.id;
        const tieneArea = user.areas.includes(selectedArea?.id || 0);
        const tieneGrupo = user.grupo === selectedGrupo?.id;
        const esUsuarioRegular = user.role === 'USUARIO';
        return tienePosicion && tieneArea && tieneGrupo && esUsuarioRegular;
      });
      setFilteredUsuarios(usuariosFiltrados);
    }
  }, [searchTerm, currentView, usuarios, selectedArea, selectedGrupo, selectedPosicion]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasData, gruposData, posicionesData, usuariosData, listasData] = await Promise.all([
        apiService.getAreas({ is_active: true }),
        apiService.getGrupos({ is_active: true }),
        apiService.getPosiciones({ is_active: true }),
        apiService.getUsers({ is_active: true }),
        apiService.getListasAsistencia({ is_active: true })
      ]);
      
      setAreas(areasData.results);
      setGrupos(gruposData.results);
      setPosiciones(posicionesData.results);
      setUsuarios(usuariosData.results);
      setUsuariosRegulares(usuariosData.results.filter(user => user.role === 'USUARIO'));
      setSupervisores(usuariosData.results.filter(user => user.role === 'ADMIN' || user.role === 'EVALUADOR'));
      setInstructores(usuariosData.results.filter(user => user.role === 'ADMIN' || user.role === 'EVALUADOR'));
      setListasAsistencia(listasData.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navegación entre vistas
  const handleAreaClick = (area: Area) => {
    setSelectedArea(area);
    setCurrentView('grupos');
  };

  const handleGrupoClick = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setCurrentView('posiciones');
  };

  const handleOnboardingClick = () => {
    setCurrentView('onboarding');
  };

  const handlePosicionClick = (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setCurrentView('usuarios');
    
    // Filtrar usuarios que tengan la posición seleccionada, pertenezcan al área, grupo y sean usuarios regulares
    const usuariosFiltrados = usuarios.filter(user => {
      const tienePosicion = user.posicion === posicion.id;
      const tieneArea = user.areas.includes(selectedArea?.id || 0);
      const tieneGrupo = user.grupo === selectedGrupo?.id;
      const esUsuarioRegular = user.role === 'USUARIO';
      return tienePosicion && tieneArea && tieneGrupo && esUsuarioRegular;
    });
    setFilteredUsuarios(usuariosFiltrados);
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setCurrentView('usuario-detalle');
    loadEvaluacionesUsuario(user);
  };

  const loadEvaluacionesUsuario = async (user: User) => {
    try {
      setLoading(true);
      // Obtener evaluaciones que coincidan con el área y posición del usuario
      const evaluaciones = await apiService.getEvaluaciones({
        area_id: user.areas[0], // Usar la primera área del usuario
        posicion_id: user.posicion || undefined
      });
      setEvaluacionesUsuario(evaluaciones.results);
    } catch (error: any) {
      console.error('Error loading evaluaciones:', error);
      showError('Error al cargar las evaluaciones del usuario');
      setEvaluacionesUsuario([]);
    } finally {
      setLoading(false);
    }
  };

  const iniciarEvaluacion = async (evaluacion: any) => {
    try {
      setLoading(true);
      setEvaluacionActual(evaluacion);
      
      // Cargar supervisores disponibles
      const supervisoresData = await apiService.getUsers({ 
        role: 'ADMIN,EVALUADOR',
        is_active: true 
      });
      setSupervisores(supervisoresData.results);
      
      // Inicializar resultados vacíos para cada punto de evaluación
      const resultadosIniciales = evaluacion.puntos_evaluacion?.map((punto: any) => ({
        punto_evaluacion: punto.id,
        puntuacion: null
      })) || [];
      setResultadosEvaluacion(resultadosIniciales);
      
      setCurrentView('usuario-evaluacion');
    } catch (error: any) {
      console.error('Error iniciando evaluación:', error);
      showError('Error al iniciar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handlePuntuacionChange = (puntoId: number, puntuacion: number) => {
    setResultadosEvaluacion(prev => 
      prev.map(resultado => 
        resultado.punto_evaluacion === puntoId 
          ? { ...resultado, puntuacion }
          : resultado
      )
    );
  };


  const guardarEvaluacion = async () => {
    if (!selectedUser || !evaluacionActual || !supervisorSeleccionado) {
      showError('Por favor selecciona un supervisor');
      return;
    }

    // Verificar que todos los puntos tengan puntuación
    const puntosSinPuntuar = resultadosEvaluacion.filter(r => r.puntuacion === null);
    if (puntosSinPuntuar.length > 0) {
      showError('Por favor evalúa todos los puntos de evaluación');
      return;
    }

    try {
      setLoading(true);
      
      // Aquí iría la lógica para guardar la evaluación
      // Por ahora solo mostramos un mensaje de éxito
      showSuccess('Evaluación guardada exitosamente');
      
      // Volver a la vista de detalle del usuario
      setCurrentView('usuario-detalle');
      
    } catch (error: any) {
      console.error('Error guardando evaluación:', error);
      showError('Error al guardar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearListaAsistencia = () => {
    setFormData(prev => ({ ...prev, area: selectedArea?.id || 0 }));
    setIsEditing(false);
    setEditingListaId(null);
    setCurrentView('lista-asistencia-form');
  };

  const handleEditarLista = (lista: ListaAsistencia) => {
    setFormData({
      nombre: lista.nombre,
      supervisor: lista.supervisor,
      instructor: lista.instructor,
      fecha: lista.fecha,
      usuarios_regulares: lista.usuarios_regulares,
      area: lista.area,
      is_active: lista.is_active
    });
    setIsEditing(true);
    setEditingListaId(lista.id);
    setCurrentView('lista-asistencia-form');
    
    // Cargar usuarios asignados a esta lista
    const usuariosAsignados = usuariosRegulares.filter(user => 
      lista.usuarios_regulares.includes(user.id)
    );
    setUsuariosSeleccionados(usuariosAsignados);
  };

  const goBack = () => {
    switch (currentView) {
      case 'grupos':
        setCurrentView('areas');
        setSelectedArea(null);
        break;
      case 'posiciones':
        setCurrentView('grupos');
        setSelectedGrupo(null);
        break;
      case 'usuarios':
        setCurrentView('posiciones');
        setSelectedPosicion(null);
        break;
      case 'usuario-detalle':
        setCurrentView('usuarios');
        setSelectedUser(null);
        break;
      case 'usuario-evaluacion':
        setCurrentView('usuario-detalle');
        setEvaluacionActual(null);
        setResultadosEvaluacion([]);
        setSupervisorSeleccionado(null);
        // Limpiar firmas
        setSignatures({
          empleado: null,
          evaluador: null,
          calidad: null
        });
        setHasSignature({
          empleado: false,
          evaluador: false,
          calidad: false
        });
        break;
      case 'onboarding':
        setCurrentView('grupos');
        break;
      case 'lista-asistencia-form':
        setCurrentView('onboarding');
        setFormData({
          nombre: '',
          supervisor: null,
          instructor: null,
          fecha: new Date().toISOString().split('T')[0],
          usuarios_regulares: [],
          area: 0,
          is_active: true
        });
        setUsuariosSeleccionados([]);
        setIsEditing(false);
        setEditingListaId(null);
        break;
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Áreas'];
    if (selectedArea) {
      parts.push(selectedArea.name);
      if (currentView === 'grupos') {
        parts.push('Grupos');
      } else if (currentView === 'posiciones') {
        parts.push('Grupos', selectedGrupo?.name || 'Grupo', 'Posiciones');
      } else if (currentView === 'usuarios') {
        parts.push('Grupos', selectedGrupo?.name || 'Grupo', 'Posiciones', selectedPosicion?.name || 'Posición', 'Usuarios');
      } else if (currentView === 'usuario-detalle') {
        parts.push('Grupos', selectedGrupo?.name || 'Grupo', 'Posiciones', selectedPosicion?.name || 'Posición', 'Usuarios', selectedUser?.full_name || 'Usuario');
      } else if (currentView === 'onboarding') {
        parts.push('ONBOARDING');
      } else if (currentView === 'lista-asistencia-form') {
        parts.push('ONBOARDING', 'Crear Lista de Asistencia');
      }
    }
    return parts.join(' > ');
  };

  const handleFormChange = (field: keyof ListaAsistenciaCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUsuarioToggle = (usuario: User) => {
    const isSelected = formData.usuarios_regulares.includes(usuario.id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        usuarios_regulares: prev.usuarios_regulares.filter(id => id !== usuario.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        usuarios_regulares: [...prev.usuarios_regulares, usuario.id]
      }));
    }
  };

  const handleSubmitLista = async () => {
    try {
      setLoading(true);
      
      if (isEditing && editingListaId) {
        // Actualizar lista existente
        await apiService.updateListaAsistencia(editingListaId, {
          nombre: formData.nombre,
          supervisor: formData.supervisor,
          instructor: formData.instructor,
          fecha: formData.fecha,
          usuarios_regulares: formData.usuarios_regulares,
          is_active: formData.is_active
        });
        showSuccess('Lista de asistencia actualizada exitosamente');
      } else {
        // Crear nueva lista
        await apiService.createListaAsistencia(formData);
        showSuccess('Lista de asistencia creada exitosamente');
      }
      
      await loadData(); // Recargar datos
      setCurrentView('onboarding'); // Volver al onboarding
    } catch (error: any) {
      console.error('Error al guardar lista de asistencia:', error);
      showError('Error al guardar la lista de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const renderAreas = () => (
    <div className="evaluaciones-section">
      <div className="section-header">
        <h2>Áreas</h2>
        <p>Selecciona un área para continuar</p>
      </div>
      <div className="areas-grid">
        {areas.map((area) => (
          <div 
            key={area.id} 
            className={`area-card ${selectedArea?.id === area.id ? 'active' : ''}`}
            onClick={() => handleAreaClick(area)}
          >
            <div className="card-content">
              <h3>{area.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGrupos = () => {
    const gruposDelArea = grupos.filter(grupo => grupo.area === selectedArea?.id);
    
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>Grupos - {selectedArea?.name}</h2>
          <p>Selecciona un grupo para ver sus posiciones o ONBOARDING para listas de asistencia</p>
        </div>
        <div className="grupos-grid">
          {/* Botón fijo de ONBOARDING */}
          <div 
            className="grupo-card onboarding-card"
            onClick={handleOnboardingClick}
          >
            <div className="card-content">
              <h3>ONBOARDING</h3>
              <p>Listas de Asistencia</p>
            </div>
          </div>
          
          {/* Grupos del área */}
          {gruposDelArea.map((grupo) => (
            <div 
              key={grupo.id} 
              className={`grupo-card ${selectedGrupo?.id === grupo.id ? 'active' : ''} ${!grupo.is_active ? 'inactive' : ''}`}
              onClick={() => handleGrupoClick(grupo)}
            >
              <div className="card-content">
                <h3>{grupo.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPosiciones = () => {
    const posicionesDelArea = posiciones.filter(posicion => posicion.area === selectedArea?.id);
    
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>Posiciones - {selectedArea?.name}</h2>
          <p>Selecciona una posición para ver los usuarios asignados</p>
        </div>
        <div className="posiciones-grid">
          {posicionesDelArea.map((posicion) => (
            <div 
              key={posicion.id} 
              className={`posicion-card ${selectedPosicion?.id === posicion.id ? 'active' : ''} ${!posicion.is_active ? 'inactive' : ''}`}
              onClick={() => handlePosicionClick(posicion)}
            >
              <div className="card-content">
                <h3>{posicion.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUsuarios = () => {
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>Usuarios - {selectedArea?.name} &gt; {selectedGrupo?.name} &gt; {selectedPosicion?.name}</h2>
          <p>Usuarios asignados a esta posición</p>
          <div className="search-filters">
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="usuarios-list">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.map((user) => (
              <div 
                key={user.id} 
                className="usuario-item clickeable"
                onClick={() => handleUserClick(user)}
              >
                <div className="usuario-avatar">
                  <FaUsers />
                </div>
                <div className="usuario-info">
                  <h3>{user.full_name}</h3>
                  {user.numero_empleado && <p className="numero-empleado">#{user.numero_empleado}</p>}
                  {user.fecha_ingreso && <p className="fecha-ingreso">{new Date(user.fecha_ingreso).toLocaleDateString('es-ES')}</p>}
                </div>
                <div className="usuario-cuadro">
                  <div className="cuadro-item cuadro-verde"></div>
                  <div className="cuadro-item"></div>
                  <div className="cuadro-item"></div>
                  <div className="cuadro-item"></div>
                </div>
                <div className="usuario-arrow">
                  <FaArrowLeft style={{ transform: 'rotate(180deg)' }} />
                </div>
              </div>
            ))
          ) : (
          <div className="no-results">
            <FaUsers />
            <h3>No hay usuarios asignados</h3>
            <p>No se encontraron usuarios asignados para esta área, grupo y posición</p>
          </div>
          )}
        </div>
      </div>
    );
  };

  const renderUsuarioDetalle = () => {
    if (!selectedUser) return null;

    return (
      <div className="evaluaciones-section">
        <div className="usuario-detalle-header">
          <div className="usuario-info-header">
            <div className="usuario-avatar-large">
              <FaUsers />
            </div>
            <div className="usuario-details">
              <h2>{selectedUser.full_name}</h2>
              <p className="usuario-id">#{selectedUser.numero_empleado || selectedUser.id}</p>
              <p className="usuario-fecha">{new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div className="usuario-actions">
              <button className="action-btn">
                <FaDownload />
              </button>
              <button className="action-btn">
                <FaPrint />
              </button>
            </div>
            <div className="usuario-status">
              <div className="status-grid">
                <div className="status-item active"></div>
                <div className="status-item"></div>
                <div className="status-item"></div>
                <div className="status-item"></div>
              </div>
              <div className="status-arrow">
                <FaArrowLeft style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="usuario-info-content">
          <div className="info-section">
            <h3>Información del Usuario</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Email:</strong> {selectedUser.email}
              </div>
              <div className="info-item">
                <strong>Rol:</strong> {selectedUser.role_display}
              </div>
              <div className="info-item">
                <strong>Número de Empleado:</strong> {selectedUser.numero_empleado || 'No asignado'}
              </div>
              <div className="info-item">
                <strong>Fecha de Ingreso:</strong> {selectedUser.fecha_ingreso ? new Date(selectedUser.fecha_ingreso).toLocaleDateString('es-ES') : 'No asignada'}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Evaluaciones Asignadas</h3>
            {loading ? (
              <div className="loading-message">
                <p>Cargando evaluaciones...</p>
              </div>
            ) : evaluacionesUsuario.length > 0 ? (
              <div className="evaluaciones-list">
                {evaluacionesUsuario.map((evaluacion) => (
                  <div key={evaluacion.id} className="evaluacion-item-simple">
                    <div className="evaluacion-content">
                      <h4>{evaluacion.nombre}</h4>
                      <div className="evaluacion-actions">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => iniciarEvaluacion(evaluacion)}
                        >
                          Evaluar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-evaluations">
                <p>No hay evaluaciones asignadas para este usuario</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUsuarioEvaluacion = () => {
    if (!selectedUser || !evaluacionActual) return null;

    return (
      <div className="evaluaciones-section">

        <div className="evaluation-content">
          <div className="evaluation-form">
            <div className="form-section">
              <h4>{evaluacionActual.nombre}</h4>
              <div className="evaluation-info-table-container">
                <table className="evaluation-info-table">
                  <tbody>
                    <tr>
                      <td>Nombre del empleado: {selectedUser.full_name}</td>
                      <td>No empleado: {selectedUser.numero_empleado ? `#${selectedUser.numero_empleado}` : 'No asignado'}</td>
                    </tr>
                    <tr>
                      <td>Puesto: {evaluacionActual.posicion_name}</td>
                      <td>Fecha de Ingreso: {selectedUser.fecha_ingreso ? new Date(selectedUser.fecha_ingreso).toLocaleDateString('es-ES') : 'No asignada'}</td>
                    </tr>
                    <tr>
                      <td>Área: {evaluacionActual.area_name}</td>
                      <td>Nombre de la operación y/o habilidad a evaluar: {evaluacionActual.nombre}</td>
                    </tr>
                    <tr>
                      <td>Nivel de la habilidad a evaluar: {evaluacionActual.nivel_display}</td>
                      <td rowSpan={2} className="nivel-status-cell">
                        <div className="nivel-status-container">
                          <div className="nivel-box">
                            {evaluacionActual.nivel_display}
                          </div>
                          <div className="status-grid">
                            {[
                              { pos: 1, nivel: 4 }, // Superior izquierda
                              { pos: 2, nivel: 1 }, // Superior derecha
                              { pos: 3, nivel: 3 }, // Inferior izquierda
                              { pos: 4, nivel: 2 }  // Inferior derecha
                            ].map(({ pos, nivel }) => (
                              <div 
                                key={pos} 
                                className={`status-item ${evaluacionActual.nivel === nivel ? 'active' : ''}`}
                              >
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>Se recomienda Observar al operador durante 5 ciclos</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-section">
              <h4>Supervisor</h4>
              <div className="form-group">
                <select 
                  value={supervisorSeleccionado || ''}
                  onChange={(e) => setSupervisorSeleccionado(parseInt(e.target.value) || null)}
                  className="form-control"
                >
                  <option value="">Selecciona un supervisor</option>
                  {supervisores.map(supervisor => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="puntos-evaluacion-table-container">
                <table className="puntos-evaluacion-table">
                  <thead>
                    <tr>
                      <th>Puntos a Evaluar</th>
                      <th className="calificacion-header">Bajo (1)</th>
                      <th className="calificacion-header">Medio (2)</th>
                      <th className="calificacion-header">Alto (3)</th>
                    </tr>
                  </thead>
                <tbody>
                  {evaluacionActual.puntos_evaluacion?.map((punto: any, index: number) => {
                    const resultado = resultadosEvaluacion.find(r => r.punto_evaluacion === punto.id);
                    return (
                      <tr key={punto.id}>
                        <td className="punto-pregunta">
                          <span className="punto-numero">{index + 1}.</span>
                          {punto.pregunta}
                        </td>
                        {[1, 2, 3].map(puntuacion => (
                          <td 
                            key={puntuacion}
                            className={`punto-calificacion ${resultado?.puntuacion === puntuacion ? 'selected' : ''}`}
                            onClick={() => handlePuntuacionChange(punto.id, puntuacion)}
                          >
                            <label className="puntuacion-option">
                              <input
                                type="radio"
                                name={`puntuacion-${punto.id}`}
                                value={puntuacion}
                                checked={resultado?.puntuacion === puntuacion}
                                onChange={() => handlePuntuacionChange(punto.id, puntuacion)}
                              />
                              {resultado?.puntuacion === puntuacion && (
                                <span className="checkmark">✓</span>
                              )}
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="form-section">
              <h4>Criterios de Evaluación</h4>
              <div className="criterios-evaluacion-table-container">
                <table className="criterios-evaluacion-table">
                  <tbody>
                    {evaluacionActual.criterios_evaluacion && evaluacionActual.criterios_evaluacion.length > 0 ? (
                      <>
                        {evaluacionActual.criterios_evaluacion.map((criterio: any) => (
                          <tr key={criterio.id}>
                            <td className="criterio-definition">
                              <span className="criterio-texto">{criterio.criterio}</span>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="criterio-formula">
                            <strong>EVALUACIÓN = ( PUNTOS OBTENIDOS / 17 ) * 80</strong>
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="criterio-definition">
                          <span className="criterio-texto">No hay criterios definidos</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-section">
              <h4>Resultado</h4>
              <div className="resultado-evaluacion">
                {(() => {
                  const puntosObtenidos = resultadosEvaluacion.reduce((sum, resultado) => {
                    return sum + (resultado.puntuacion || 0);
                  }, 0);
                  const resultado = (puntosObtenidos / 17) * 80;
                  return (
                    <div className="resultado-content">
                      <div className="resultado-formula">
                        <span className="resultado-label">Puntos Obtenidos:</span>
                        <span className="resultado-value">{puntosObtenidos}</span>
                      </div>
                      <div className="resultado-formula">
                        <span className="resultado-label">Fórmula:</span>
                        <span className="resultado-value">( {puntosObtenidos} / 17 ) * 80 = {resultado.toFixed(2)}%</span>
                      </div>
                      <div className="resultado-final">
                        <strong>Resultado: {resultado.toFixed(2)}%</strong>
                      </div>
                      <div className="minimo-aprobatorio">
                        Mínimo aprobatorio para este nivel: {evaluacionActual.minimo_aprobatorio || 80}%
                      </div>
                      <div className="fecha-evaluacion">
                        Fecha de evaluación: {new Date().toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                </div>
                  );
                })()}
              </div>
            </div>

            <div className="form-section">
              <h4>Firmas</h4>
              <div className="firmas-container">
                {['empleado', 'evaluador', 'calidad'].map((tipo) => {
                  const tipoLabel = tipo === 'empleado' ? 'Empleado' : tipo === 'evaluador' ? 'Evaluador' : 'Calidad';
                  
                  return (
                    <div key={tipo} className="firma-item">
                      <label className="firma-label">{tipoLabel}</label>
                      {signatures[tipo] ? (
                        <div className="firma-preview-container">
                          <div className="firma-preview">
                            <img src={signatures[tipo] || ''} alt={`Firma ${tipoLabel}`} />
                          </div>
                          <button
                            type="button"
                            className="btn-editar-firma"
                            onClick={() => handleOpenFirmaModal(tipo)}
                          >
                            <FaEdit /> Editar Firma
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-agregar-firma"
                          onClick={() => handleOpenFirmaModal(tipo)}
                        >
                          <FaPlus /> Agregar Firma
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal de Firma */}
            {showFirmaModal.empleado || showFirmaModal.evaluador || showFirmaModal.calidad ? (
              <div className="modal-overlay" onClick={() => setShowFirmaModal({ empleado: false, evaluador: false, calidad: false })}>
                <div className="modal modal-firma" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Firma - {currentFirmaTipo === 'empleado' ? 'Empleado' : currentFirmaTipo === 'evaluador' ? 'Evaluador' : 'Calidad'}</h3>
                    <button 
                      className="modal-close"
                      onClick={() => setShowFirmaModal({ empleado: false, evaluador: false, calidad: false })}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="firma-canvas-wrapper">
                      <canvas
                        ref={currentFirmaTipo === 'empleado' ? empleadoCanvasRef : currentFirmaTipo === 'evaluador' ? evaluadorCanvasRef : calidadCanvasRef}
                        width={600}
                        height={250}
                        className="firma-canvas"
                        onMouseDown={(e) => startDrawing(e, currentFirmaTipo)}
                        onMouseMove={(e) => draw(e, currentFirmaTipo)}
                        onMouseUp={() => stopDrawing(currentFirmaTipo)}
                        onMouseLeave={() => stopDrawing(currentFirmaTipo)}
                      />
                    </div>
                    <div className="firma-controls">
                      <button
                        type="button"
                        className="btn-clear-firma"
                        onClick={() => clearSignature(currentFirmaTipo)}
                        disabled={!hasSignature[currentFirmaTipo]}
                      >
                        <FaEraser /> Limpiar
                      </button>
                      <button
                        type="button"
                        className="btn-guardar-firma"
                        onClick={() => {
                          stopDrawing(currentFirmaTipo);
                          setShowFirmaModal({ empleado: false, evaluador: false, calidad: false });
                        }}
                        disabled={!hasSignature[currentFirmaTipo]}
                      >
                        <FaSave /> Guardar Firma
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="evaluation-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentView('usuario-detalle')}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={guardarEvaluacion}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar Evaluación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOnboarding = () => {
    const listasDelArea = listasAsistencia.filter(lista => lista.area === selectedArea?.id);
    
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>ONBOARDING - {selectedArea?.name}</h2>
        </div>
        
        <div className="onboarding-actions">
          <div 
            className="btn-crear-lista-card"
            onClick={handleCrearListaAsistencia}
          >
            <div className="card-content">
              <FaPlus />
              <h3>Añadir nueva lista</h3>
            </div>
          </div>
          
          <div className="search-container">
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="listas-grid">
          {listasDelArea.length > 0 ? (
            listasDelArea.map((lista) => (
              <div 
                key={lista.id} 
                className="lista-card-simple"
                onClick={() => handleEditarLista(lista)}
              >
                <div className="card-content">
                  <h3>{lista.nombre}</h3>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <FaClipboardList />
              <h3>No hay listas de asistencia</h3>
              <p>No se encontraron listas de asistencia para esta área</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderListaAsistenciaForm = () => {
    // Obtener usuarios asignados y no asignados
    const usuariosAsignados = usuariosRegulares.filter(user => 
      formData.usuarios_regulares.includes(user.id)
    );
    const usuariosDisponibles = usuariosRegulares.filter(user => 
      !formData.usuarios_regulares.includes(user.id)
    );

    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>{isEditing ? 'Editar Lista de Asistencia' : 'Crear Lista de Asistencia'} - {selectedArea?.name}</h2>
          <p>Completa los datos para {isEditing ? 'actualizar' : 'crear'} la lista de asistencia</p>
        </div>

        <div className="lista-form-container">
          {/* Información básica y personal asignado */}
          <div className="form-section">
            <h3>Información de la Lista</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre de la lista de asistencia:</label>
                <input
                  type="text"
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleFormChange('nombre', e.target.value)}
                  placeholder="Ej: Lista de Asistencia - Enero 2024"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha">Fecha:</label>
                <input
                  type="date"
                  id="fecha"
                  value={formData.fecha}
                  onChange={(e) => handleFormChange('fecha', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="supervisor">Supervisor:</label>
                <select
                  id="supervisor"
                  value={formData.supervisor || ''}
                  onChange={(e) => handleFormChange('supervisor', e.target.value ? parseInt(e.target.value) : null)}
                  className="form-select"
                >
                  <option value="">Seleccionar supervisor</option>
                  {supervisores.map(supervisor => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="instructor">Instructor:</label>
                <select
                  id="instructor"
                  value={formData.instructor || ''}
                  onChange={(e) => handleFormChange('instructor', e.target.value ? parseInt(e.target.value) : null)}
                  className="form-select"
                >
                  <option value="">Seleccionar instructor</option>
                  {instructores.map(instructor => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Usuarios */}
          <div className="form-section">
            <h3>Usuarios</h3>
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar usuarios regulares..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="usuarios-lista">
              {/* Usuarios asignados primero */}
              {usuariosAsignados.map((usuario) => (
                <div key={usuario.id} className="usuario-card-item usuario-asignado">
                  <div className="usuario-info-lista">
                    <span className="usuario-nombre">
                      {usuario.full_name} ({usuario.posicion ? 
                        posiciones.find(p => p.id === usuario.posicion)?.name || 'Sin posición' 
                        : 'Sin posición'
                      })
                    </span>
                  </div>
                  <button
                    className="btn-quitar-usuario"
                    onClick={() => handleUsuarioToggle(usuario)}
                    title="Quitar de la lista"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
              
              {/* Usuarios disponibles */}
              {usuariosDisponibles
                .filter(usuario => 
                  usuario.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((usuario) => (
                <div key={usuario.id} className="usuario-card-item">
                  <div className="usuario-info-lista">
                    <span className="usuario-nombre">
                      {usuario.full_name} ({usuario.posicion ? 
                        posiciones.find(p => p.id === usuario.posicion)?.name || 'Sin posición' 
                        : 'Sin posición'
                      })
                    </span>
                  </div>
                  <button
                    className="btn-agregar-usuario"
                    onClick={() => handleUsuarioToggle(usuario)}
                    title="Agregar a la lista"
                  >
                    <FaPlus />
                  </button>
                </div>
              ))}
              
              {usuariosAsignados.length === 0 && usuariosDisponibles.length === 0 && (
                <div className="no-usuarios">
                  <p>No hay usuarios disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              className="btn-cancelar"
              onClick={goBack}
            >
              Cancelar
            </button>
            <button
              className="btn-guardar"
              onClick={handleSubmitLista}
              disabled={!formData.nombre || !formData.supervisor || !formData.instructor || formData.usuarios_regulares.length === 0}
            >
              <FaSave /> Guardar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="evaluaciones-container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluaciones-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="evaluaciones-container">
      {/* Header con navegación */}
      <div className="evaluaciones-header">
        <div className="breadcrumb">
          <span>{getBreadcrumb()}</span>
        </div>
        {currentView !== 'areas' && (
          <button className="back-button" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
        )}
      </div>

      {/* Contenido principal */}
      <div className="evaluaciones-content">
        {currentView === 'areas' && renderAreas()}
        {currentView === 'grupos' && renderGrupos()}
        {currentView === 'posiciones' && renderPosiciones()}
        {currentView === 'usuarios' && renderUsuarios()}
        {currentView === 'usuario-detalle' && renderUsuarioDetalle()}
        {currentView === 'usuario-evaluacion' && renderUsuarioEvaluacion()}
        {currentView === 'onboarding' && renderOnboarding()}
        {currentView === 'lista-asistencia-form' && renderListaAsistenciaForm()}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default Evaluaciones;
