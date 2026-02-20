import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  FaEraser,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { apiService, Area, Grupo, Posicion, User, ListaAsistencia, ListaAsistenciaCreate, FirmaEvaluacion, FirmaEvaluacionUsuario, EvaluacionUsuario, ProgresoNivel, getMediaUrl } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './Evaluaciones.css';

const calcularResumenNiveles = (
  evaluacionesLista: any[],
  guardadasMap: Record<number, EvaluacionUsuario>
) => {
  const stats: Record<number, { total: number; completadas: number }> = {};

  evaluacionesLista.forEach((evaluacion) => {
    const nivel =
      evaluacion.nivel_posicion_data?.nivel ??
      evaluacion.nivel ??
      null;

    if (typeof nivel !== 'number') {
      return;
    }

    if (!stats[nivel]) {
      stats[nivel] = { total: 0, completadas: 0 };
    }

    stats[nivel].total += 1;

    const evaluacionGuardada = guardadasMap[evaluacion.id];
    const estado = (evaluacionGuardada?.estado || '').toLowerCase();
    const estadoFirmasUsuario = (evaluacionGuardada?.estado_firmas_usuario || '').toLowerCase();
    const firmasCompletas = estadoFirmasUsuario === 'firmas_completas';

    if (firmasCompletas && (estado === 'completada' || evaluacionGuardada?.resultado_final !== null)) {
      stats[nivel].completadas += 1;
    }
  });

  const completados: Record<number, boolean> = {};
  Object.entries(stats).forEach(([nivel, valores]) => {
    const nivelNumero = Number(nivel);
    completados[nivelNumero] = valores.total > 0 && valores.total === valores.completadas;
  });

  return { stats, completados };
};

const calcularEstadoFirmasUsuario = (firmas: FirmaEvaluacionUsuario[] | undefined) => {
  if (!firmas || firmas.length === 0) {
    return {
      estado: 'pendiente_firmas',
      display: 'Pendiente de firmas',
    };
  }

  const total = firmas.length;
  const firmadas = firmas.filter((firma) => firma.esta_firmado).length;

  if (firmadas === total) {
    return {
      estado: 'firmas_completas',
      display: 'Firmas completas',
    };
  }

  if (firmadas > 0) {
    return {
      estado: 'en_proceso',
      display: 'En proceso de firmas',
    };
  }

  return {
    estado: 'pendiente_firmas',
    display: 'Pendiente de firmas',
  };
};

interface EvaluacionesProps {
  userRole?: string;
  currentUser?: Partial<User> | null;
}

const Evaluaciones: React.FC<EvaluacionesProps> = ({ userRole, currentUser }) => {
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
  const [evaluacionesUsuarioGuardadas, setEvaluacionesUsuarioGuardadas] = useState<Record<number, EvaluacionUsuario>>({});
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState<number | null>(null);
  const [evaluacionModoLectura, setEvaluacionModoLectura] = useState(false);
  const [evaluacionGuardadaInfo, setEvaluacionGuardadaInfo] = useState<EvaluacionUsuario | null>(null);
  const [nivelesDisponibles, setNivelesDisponibles] = useState<number[]>([]);
  const [nivelSeleccionado, setNivelSeleccionado] = useState<number | null>(null);
  const [nivelesCompletos, setNivelesCompletos] = useState<Record<number, boolean>>({});
  const [nivelesCompletosPorUsuario, setNivelesCompletosPorUsuario] = useState<Record<number, Record<number, boolean>>>({});
  const [guardandoFirma, setGuardandoFirma] = useState(false);
const [progresosNivel, setProgresosNivel] = useState<Record<number, Record<number, ProgresoNivel>>>({});
const [nivelFiltroUsuarios, setNivelFiltroUsuarios] = useState<number | 'todos'>('todos');
 
  // Referencia y estados para firmas dinámicas
const firmaCanvasRef = useRef<HTMLCanvasElement>(null);
const [isDrawing, setIsDrawing] = useState(false);
const [hasSignature, setHasSignature] = useState<Record<string, boolean>>({});
const [signatures, setSignatures] = useState<Record<string, string | null>>({});
const [firmasUsuario, setFirmasUsuario] = useState<Record<string, FirmaEvaluacionUsuario | null>>({});
const [firmasPendientes, setFirmasPendientes] = useState<Record<string, { imagen: string | null; usuario: number | null; usuarioNombre: string | null; nombre: string }>>({});
const [firmaModalAbierta, setFirmaModalAbierta] = useState<{ tipo: string; nombre: string } | null>(null);
const [firmaModalFirmante, setFirmaModalFirmante] = useState<number | null>(null);
const [onboardingUsuarioId, setOnboardingUsuarioId] = useState<number | null>(null);

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario de lista de asistencia
  const [formData, setFormData] = useState<ListaAsistenciaCreate>({
    nombre: '',
    supervisor: null,
    instructor: null,
    usuarios_regulares: [],
    area: 0,
    is_active: true
  });
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<User[]>([]);
  // Estado para fechas por usuario en la lista
  const [fechasUsuarios, setFechasUsuarios] = useState<Record<number, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingListaId, setEditingListaId] = useState<number | null>(null);

  const effectiveUserRole = useMemo(() => userRole || currentUser?.role || 'USUARIO', [userRole, currentUser]);
  const isRegularUser = effectiveUserRole === 'USUARIO';
  const currentUserId = currentUser?.id ?? null;

  const isSupervisorOrEntrenador = effectiveUserRole === 'SUPERVISOR' || effectiveUserRole === 'ENTRENADOR';
  const userAreaIds = useMemo(() => {
    const a = currentUser?.areas;
    if (!a || !Array.isArray(a)) return [];
    return a.map((id: unknown) => Number(id)).filter((n) => !Number.isNaN(n));
  }, [currentUser?.areas]);

  const visibleAreas = useMemo(() => {
    if (!isSupervisorOrEntrenador) return areas;
    if (userAreaIds.length === 0) return [];
    return areas.filter((area) => userAreaIds.includes(area.id));
  }, [areas, isSupervisorOrEntrenador, userAreaIds]);

  useEffect(() => {
    if (!isRegularUser) {
    loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegularUser]);

  useEffect(() => {
    const estadoGuardado = (evaluacionGuardadaInfo?.estado || '').toLowerCase();
    const estadoFirmasGuardado = (evaluacionGuardadaInfo?.estado_firmas_usuario || '').toLowerCase();
    const estadoFirmasActual = (evaluacionActual?.estado_firmas || '').toLowerCase();

    if (
      estadoGuardado === 'completada' ||
      estadoFirmasGuardado === 'firmas_completas' ||
      estadoFirmasActual === 'firmas_completas'
    ) {
      setEvaluacionModoLectura(true);
    }
  }, [evaluacionGuardadaInfo, evaluacionActual]);

  // Configurar los canvas para dibujar
  useEffect(() => {
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#e12026';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Funciones para dibujar en el canvas de firmas dinámicas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!firmaModalAbierta) return;
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !firmaModalAbierta) return;

    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(prev => ({
      ...prev,
      [firmaModalAbierta.tipo]: true
    }));
  };

  const stopDrawing = () => {
    if (!isDrawing || !firmaModalAbierta) return;
    setIsDrawing(false);

    const canvas = firmaCanvasRef.current;
    if (canvas && hasSignature[firmaModalAbierta.tipo]) {
      const dataURL = canvas.toDataURL('image/png');
      setSignatures(prev => ({
        ...prev,
        [firmaModalAbierta.tipo]: dataURL
      }));
    }
  };

  const handleOpenFirmaModal = (firma: FirmaEvaluacion) => {
    setFirmaModalAbierta({ tipo: firma.tipo_firma, nombre: firma.nombre });
    const firmaUsuario = firmasUsuario[firma.tipo_firma] ?? null;
    const firmaPendiente = firmasPendientes[firma.tipo_firma] ?? null;

    if (firma.tipo_firma === 'empleado') {
      setFirmaModalFirmante(selectedUser?.id ?? null);
    } else if (firmaPendiente?.usuario !== undefined && firmaPendiente?.usuario !== null) {
      setFirmaModalFirmante(firmaPendiente.usuario);
    } else if (firmaUsuario?.usuario) {
      setFirmaModalFirmante(firmaUsuario.usuario);
    } else if (firma.usuario) {
      setFirmaModalFirmante(firma.usuario);
    } else if (supervisorSeleccionado) {
      setFirmaModalFirmante(supervisorSeleccionado);
    } else if (supervisores.length > 0) {
      setFirmaModalFirmante(supervisores[0].id);
    } else {
      setFirmaModalFirmante(null);
    }
    setTimeout(() => {
      const canvas = firmaCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dataURL = signatures[firma.tipo_firma] ?? firmaUsuario?.imagen ?? firmaPendiente?.imagen ?? null;
      if (dataURL) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setHasSignature(prev => ({ ...prev, [firma.tipo_firma]: Boolean(dataURL) }));
        };
        img.src = dataURL;
      } else {
        setHasSignature(prev => ({ ...prev, [firma.tipo_firma]: false }));
      }
    }, 0);
  };

  const clearSignature = () => {
    if (!firmaModalAbierta) return;
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(prev => ({ ...prev, [firmaModalAbierta.tipo]: false }));
    setSignatures(prev => ({ ...prev, [firmaModalAbierta.tipo]: null }));
    setFirmasPendientes(prev => {
      if (evaluacionGuardadaInfo) {
        return prev;
      }
      const { [firmaModalAbierta.tipo]: _omit, ...rest } = prev;
      return rest;
    });
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
    if (!evaluacionActual || !evaluacionActual.firmas) {
      setFirmaModalAbierta(null);
      setFirmaModalFirmante(null);
      setSignatures({});
      setHasSignature({});
      setFirmasUsuario({});
      setFirmasPendientes({});
      return;
    }

    const firmasGuardadas = evaluacionGuardadaInfo?.firmas_usuario ?? [];
    const firmasGuardadasMap: Record<string, FirmaEvaluacionUsuario> = {};
    firmasGuardadas.forEach((firmaUsuario) => {
      firmasGuardadasMap[firmaUsuario.tipo_firma] = firmaUsuario;
    });

    if (evaluacionGuardadaInfo) {
      setFirmasPendientes({});
    }

    const signaturesIniciales: Record<string, string | null> = {};
    const hasIniciales: Record<string, boolean> = {};
    const mapaFirmasUsuario: Record<string, FirmaEvaluacionUsuario | null> = {};

    evaluacionActual.firmas.forEach((firma: FirmaEvaluacion) => {
      const slug = firma.tipo_firma;
      const firmaUsuario = firmasGuardadasMap[slug] ?? null;
      mapaFirmasUsuario[slug] = firmaUsuario;
      const imagen = firmaUsuario?.imagen ?? null;
      signaturesIniciales[slug] = imagen;
      hasIniciales[slug] = Boolean(firmaUsuario?.esta_firmado && imagen);
    });

    setFirmasUsuario(mapaFirmasUsuario);
    setSignatures(signaturesIniciales);
    setHasSignature(hasIniciales);
  }, [evaluacionActual, evaluacionGuardadaInfo]);

  useEffect(() => {
    // Filtrar usuarios en la vista de usuarios cuando cambie el término de búsqueda
    if (currentView === 'usuarios' && searchTerm) {
      const usuariosBase = usuarios.filter(user => {
        const tienePosicion = user.posicion === selectedPosicion?.id;
        const tieneArea = user.areas.includes(selectedArea?.id || 0);
        const tieneGrupo = user.grupo === selectedGrupo?.id;
        // Incluir usuarios regulares y entrenadores
        const esUsuarioValido = user.role === 'USUARIO' || user.role === 'ENTRENADOR';
        return tienePosicion && tieneArea && tieneGrupo && esUsuarioValido;
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
        // Incluir usuarios regulares y entrenadores
        const esUsuarioValido = user.role === 'USUARIO' || user.role === 'ENTRENADOR';
        return tienePosicion && tieneArea && tieneGrupo && esUsuarioValido;
      });
      setFilteredUsuarios(usuariosFiltrados);
    }
  }, [searchTerm, currentView, usuarios, selectedArea, selectedGrupo, selectedPosicion]);

  useEffect(() => {
    if (currentView !== 'usuarios') return;

    const usuariosPendientes = filteredUsuarios.filter(
      (usuario) => !nivelesCompletosPorUsuario[usuario.id]
    );

    if (usuariosPendientes.length === 0) {
      return;
    }

    let cancelado = false;

    const cargarResumenes = async () => {
      for (const usuario of usuariosPendientes) {
        try {
          // Obtener el área del usuario (puede ser un array o un número)
          const areaId = Array.isArray(usuario.areas) && usuario.areas.length > 0 
            ? usuario.areas[0] 
            : (typeof usuario.areas === 'number' ? usuario.areas : undefined);

          if (!areaId || !usuario.posicion) {
            // Si no tiene área o posición, saltar este usuario
            console.log(`Saltando usuario ${usuario.id}: sin área o posición`, { areaId, posicion: usuario.posicion });
            continue;
          }

          const [evaluaciones, evaluacionesGuardadas] = await Promise.all([
            apiService.getEvaluaciones({
              area_id: areaId,
              posicion_id: usuario.posicion,
              es_plantilla: false
            }),
            apiService.getEvaluacionesUsuario({
              usuario: usuario.id
            })
          ]);

          if (cancelado) {
            return;
          }

          const guardadasMap: Record<number, EvaluacionUsuario> = {};
          (evaluacionesGuardadas.results || []).forEach((registro) => {
            guardadasMap[registro.evaluacion] = registro;
          });

          const { completados } = calcularResumenNiveles(evaluaciones || [], guardadasMap);

          console.log(`Resumen de niveles para usuario ${usuario.id} (${usuario.full_name}):`, completados);

          if (!cancelado) {
            setNivelesCompletosPorUsuario((prev) => {
              // Siempre actualizar con los nuevos datos calculados
              return {
            ...prev,
            [usuario.id]: completados
              };
            });
          }
        } catch (prefetchError) {
          console.error('Error al precargar resumen de niveles para el usuario', usuario.id, prefetchError);
        }
      }
    };

    cargarResumenes();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, filteredUsuarios]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    const resumen = nivelesCompletosPorUsuario[selectedUser.id];
    if (resumen) {
      setNivelesCompletos(resumen);
    }
  }, [selectedUser, nivelesCompletosPorUsuario]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasData, gruposData, posicionesData, usuariosAll, listasData] = await Promise.all([
        apiService.getAreas({ is_active: true }),
        apiService.getGrupos({ is_active: true }),
        apiService.getPosiciones({ is_active: true }),
        apiService.getUsersAll({ is_active: true, evaluaciones: true }),
        apiService.getListasAsistencia({ is_active: true })
      ]);
      
      setAreas(areasData);
      setGrupos(gruposData);
      setPosiciones(posicionesData);
      const usuariosOrdenados = [...usuariosAll].sort((a, b) => {
        const na = a.numero_empleado ?? '';
        const nb = b.numero_empleado ?? '';
        if (!na && !nb) return 0;
        if (!na) return 1;
        if (!nb) return -1;
        return na.localeCompare(nb);
      });
      setUsuarios(usuariosOrdenados);
      setUsuariosRegulares(usuariosOrdenados.filter(user => user.role === 'USUARIO'));
      const esRolSupervisor = (role?: string | null) =>
        role === 'ADMIN' || role === 'ENTRENADOR' || role === 'SUPERVISOR';

      setSupervisores(usuariosOrdenados.filter(user => esRolSupervisor(user.role)));
      setInstructores(usuariosOrdenados.filter(user => esRolSupervisor(user.role)));
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

  const handleOnboardingClick = (usuarioId?: number | null) => {
    if (typeof usuarioId === 'number') {
      setOnboardingUsuarioId(usuarioId);
    } else if (selectedUser) {
      setOnboardingUsuarioId(selectedUser.id);
    } else {
      setOnboardingUsuarioId(null);
    }
    setCurrentView('onboarding');
  };

  const handlePosicionClick = (posicion: Posicion) => {
    setSelectedPosicion(posicion);
    setCurrentView('usuarios');
    setNivelFiltroUsuarios('todos');
    
    // Filtrar usuarios que tengan la posición seleccionada, pertenezcan al área, grupo y sean usuarios regulares
    const usuariosFiltrados = usuarios.filter(user => {
      const tienePosicion = user.posicion === posicion.id;
      const tieneArea = user.areas.includes(selectedArea?.id || 0);
      const tieneGrupo = user.grupo === selectedGrupo?.id;
      const esUsuarioRegular = user.role === 'USUARIO';
      return tienePosicion && tieneArea && tieneGrupo && esUsuarioRegular;
    });
    setFilteredUsuarios(usuariosFiltrados);
    loadProgresosNivel(posicion.id);
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
      const areaId = Array.isArray(user.areas) && user.areas.length > 0 ? user.areas[0] : undefined;
      const evaluacionesParams: {
        area_id?: number;
        posicion_id?: number;
        es_plantilla: boolean;
      } = {
        es_plantilla: false,
      };

      if (areaId) {
        evaluacionesParams.area_id = areaId;
      }

      if (user.posicion) {
        evaluacionesParams.posicion_id = user.posicion;
      }

      const [evaluaciones, evaluacionesGuardadas] = await Promise.all([
        apiService.getEvaluaciones(evaluacionesParams),
        apiService.getEvaluacionesUsuario({
          usuario: user.id
        })
      ]);

      const guardadasMap: Record<number, EvaluacionUsuario> = {};
      (evaluacionesGuardadas.results || []).forEach((registro) => {
        guardadasMap[registro.evaluacion] = registro;
      });

      setEvaluacionesUsuario(evaluaciones);
      setEvaluacionesUsuarioGuardadas(guardadasMap);

      const nivelesSet = new Set<number>();
      (evaluaciones || []).forEach((evaluacionItem: any) => {
        const nivelItem =
          evaluacionItem.nivel_posicion_data?.nivel ??
          evaluacionItem.nivel ??
          null;
        if (typeof nivelItem === 'number') {
          nivelesSet.add(nivelItem);
        }
      });

      const nivelesOrdenados = Array.from(nivelesSet).sort((a, b) => a - b);
      setNivelesDisponibles(nivelesOrdenados);
      setNivelSeleccionado((nivelPrevio) => {
        if (nivelPrevio && nivelesOrdenados.includes(nivelPrevio)) {
          return nivelPrevio;
        }
        return nivelesOrdenados.length > 0 ? nivelesOrdenados[0] : null;
      });
 
      const { completados } = calcularResumenNiveles(evaluaciones || [], guardadasMap);
      setNivelesCompletos(completados);
      setNivelesCompletosPorUsuario((prev) => ({
        ...prev,
        [user.id]: completados
      }));
    } catch (error: any) {
      console.error('Error loading evaluaciones:', error);
      showError('Error al cargar las evaluaciones del usuario');
      setEvaluacionesUsuario([]);
      setEvaluacionesUsuarioGuardadas({});
      setNivelesDisponibles([]);
      setNivelSeleccionado(null);
      setNivelesCompletos({});
      setNivelesCompletosPorUsuario((prev) => {
        if (!(user.id in prev)) return prev;
        const actualizado = { ...prev };
        delete actualizado[user.id];
        return actualizado;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isRegularUser) {
      return;
    }

    const initRegular = async () => {
      try {
        const usuarioDetalle = await apiService.getCurrentUser();
        setSelectedUser(usuarioDetalle as any);
        await loadEvaluacionesUsuario(usuarioDetalle as any);
        setEvaluacionModoLectura(true);
        setCurrentView('usuario-detalle');
      } catch (initError) {
        console.error('Error al cargar evaluaciones del usuario', initError);
        showError('No se pudieron cargar tus evaluaciones');
      }
    };

    initRegular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegularUser]);

  const loadProgresosNivel = async (posicionId?: number | null) => {
    try {
      const params = posicionId ? { posicion: posicionId } : undefined;
      const progresosResponse = await apiService.getProgresosNivel(params);
      const progresosLista = Array.isArray(progresosResponse)
        ? progresosResponse
        : Array.isArray((progresosResponse as any)?.results)
          ? (progresosResponse as any).results
          : [];
      const progresos = (progresosLista as ProgresoNivel[]);
 
      if (progresos.length === 0) {
        return;
      }

      const progresosAgrupados: Record<number, Record<number, ProgresoNivel>> = {};
      const completadosAgrupados: Record<number, Record<number, boolean>> = {};

      progresos.forEach((progreso) => {
        if (!progresosAgrupados[progreso.usuario]) {
          progresosAgrupados[progreso.usuario] = {};
        }
        progresosAgrupados[progreso.usuario][progreso.nivel] = progreso;

        if (!completadosAgrupados[progreso.usuario]) {
          completadosAgrupados[progreso.usuario] = {};
        }
        completadosAgrupados[progreso.usuario][progreso.nivel] = progreso.completado;
      });

      setProgresosNivel((prev) => ({
        ...prev,
        ...progresosAgrupados
      }));

      setNivelesCompletosPorUsuario((prev) => ({
        ...prev,
        ...completadosAgrupados
      }));
    } catch (error) {
      console.error('Error al cargar progresos de nivel:', error);
    }
  };

  const iniciarEvaluacion = async (evaluacion: any) => {
    try {
      setLoading(true);
      setEvaluacionActual(evaluacion);
      setEvaluacionModoLectura(isRegularUser);
      setEvaluacionGuardadaInfo(null);

      const nivelEvaluacion =
        evaluacion.nivel ??
        evaluacion.nivel_posicion_data?.nivel ??
        null;
      if (typeof nivelEvaluacion === 'number') {
        setNivelSeleccionado(nivelEvaluacion);
      }
      
      const rolesSupervision = 'ADMIN,ENTRENADOR,SUPERVISOR';
      const supervisoresData = await apiService.getUsers({ 
        role: rolesSupervision,
        is_active: true 
      });
      setSupervisores(supervisoresData.results);
      
      // Seleccionar supervisor por defecto: evaluación, grupo seleccionado o primer grupo del área
      let supervisorPorDefecto: number | null = null;
      if (evaluacion.supervisor) {
        supervisorPorDefecto = evaluacion.supervisor;
      } else if (!isRegularUser && selectedArea?.grupos?.length) {
        const grupoConSupervisor = selectedArea.grupos.find((g) => g.supervisores?.length);
        if (grupoConSupervisor?.supervisores?.[0]?.id) {
          supervisorPorDefecto = grupoConSupervisor.supervisores[0].id;
        }
      }
      if (
        supervisorPorDefecto &&
        supervisoresData.results.some((supervisor: User) => supervisor.id === supervisorPorDefecto)
      ) {
        setSupervisorSeleccionado(supervisorPorDefecto);
      } else {
        setSupervisorSeleccionado(null);
      }
      
      // Inicializar resultados vacíos para cada punto de evaluación
      const resultadosIniciales = evaluacion.puntos_evaluacion?.map((punto: any) => ({
        punto_evaluacion: punto.id,
        puntuacion: null,
        observaciones: ''
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

  const verEvaluacionGuardada = (evaluacion: any, detalle: EvaluacionUsuario) => {
    setEvaluacionActual(evaluacion);
    setEvaluacionModoLectura(true);
    setEvaluacionGuardadaInfo(detalle);
    setSupervisorSeleccionado(detalle.supervisor || null);

    const nivelEvaluacion =
      evaluacion.nivel ??
      evaluacion.nivel_posicion_data?.nivel ??
      null;
    if (typeof nivelEvaluacion === 'number') {
      setNivelSeleccionado(nivelEvaluacion);
    }

    const resultadosConsolidados =
      evaluacion.puntos_evaluacion?.map((punto: any) => {
        const resultado = detalle.resultados_puntos.find(
          (registro) => registro.punto_evaluacion === punto.id
        );
        return {
          punto_evaluacion: punto.id,
          puntuacion: resultado?.puntuacion ?? null,
          observaciones: resultado?.observaciones ?? ''
        };
      }) ?? [];

    setResultadosEvaluacion(resultadosConsolidados);
    setCurrentView('usuario-evaluacion');
  };

  const handlePuntuacionChange = (puntoId: number, puntuacion: number) => {
    if (evaluacionModoLectura) {
      return;
    }
    setResultadosEvaluacion(prev => 
      prev.map(resultado => 
        resultado.punto_evaluacion === puntoId 
          ? { ...resultado, puntuacion }
          : resultado
      )
    );
  };

  const puedeGuardarFirma = () => {
    if (!firmaModalAbierta) {
      return false;
    }

    if (firmaModalAbierta.tipo === 'empleado') {
      return Boolean(hasSignature[firmaModalAbierta.tipo]);
    }

    return Boolean(firmaModalFirmante);
  };

  const handleGuardarFirma = async () => {
    if (!firmaModalAbierta || !evaluacionActual) {
      return;
    }

    const tipoFirma = firmaModalAbierta.tipo;
    const esFirmaEmpleado = tipoFirma === 'empleado';

    if (esFirmaEmpleado && !selectedUser) {
      showError('No se pudo identificar al empleado para asignar la firma.');
      return;
    }

    if (!esFirmaEmpleado && !firmaModalFirmante) {
      showError('Selecciona a la persona que debe firmar.');
      return;
    }

    const canvas = firmaCanvasRef.current;
    let signatureData: string | null = null;
    if (hasSignature[tipoFirma] && canvas) {
      signatureData = canvas.toDataURL('image/png');
    } else if (signatures[tipoFirma]) {
      signatureData = signatures[tipoFirma];
    }

    if (esFirmaEmpleado && !signatureData) {
      showError('Debes capturar la firma del empleado.');
      return;
    }

    try {
      setGuardandoFirma(true);

      const payload: {
        tipo_firma: string;
        nombre?: string;
        usuario?: number | null;
        imagen?: string;
      } = {
        tipo_firma: tipoFirma,
      };

      const usuarioFirmanteId = esFirmaEmpleado
        ? selectedUser?.id ?? null
        : firmaModalFirmante ?? null;

      if (esFirmaEmpleado) {
        payload.usuario = selectedUser?.id ?? null;
      } else if (firmaModalFirmante) {
        payload.usuario = firmaModalFirmante;
      }

      if (signatureData) {
        payload.imagen = signatureData;
      }

      if (firmaModalAbierta.nombre) {
        payload.nombre = firmaModalAbierta.nombre;
      }

      const obtenerNombreFirmante = () => {
        if (esFirmaEmpleado) {
          return selectedUser?.full_name || selectedUser?.username || null;
        }
        const supervisor = supervisores.find((sup) => sup.id === usuarioFirmanteId);
        return supervisor?.full_name || supervisor?.username || null;
      };

      const firmanteNombre = obtenerNombreFirmante();

      if (!evaluacionGuardadaInfo) {
        setFirmasPendientes((prev) => ({
          ...prev,
          [tipoFirma]: {
            imagen: signatureData ?? null,
            usuario: usuarioFirmanteId,
            usuarioNombre: firmanteNombre,
            nombre: firmaModalAbierta.nombre,
          },
        }));

        setSignatures((prev) => ({
          ...prev,
          [tipoFirma]: signatureData ?? null,
        }));

        setHasSignature((prev) => ({
          ...prev,
          [tipoFirma]: Boolean(signatureData),
        }));

        setIsDrawing(false);
        setFirmaModalAbierta(null);
        setFirmaModalFirmante(null);
        const mensajeLocal = signatureData
          ? 'Firma guardada localmente. Guarda la evaluación para registrarla definitivamente.'
          : 'Asignación guardada localmente. Guarda la evaluación para registrar la firma.';
        showSuccess(mensajeLocal);
        return;
      }

      const firmaActualizada = await apiService.firmarEvaluacionUsuario(evaluacionGuardadaInfo.id, payload);

      setEvaluacionActual((prev: any) => {
        if (!prev) return prev;

        const firmasActualizadas = prev.firmas.map((firma: FirmaEvaluacion) =>
          firma.tipo_firma === firmaActualizada.tipo_firma
            ? {
                ...firma,
                nombre: firmaActualizada.nombre,
                usuario: firmaActualizada.usuario,
                usuario_nombre: firmaActualizada.usuario_nombre,
              }
            : firma
        );

        return {
          ...prev,
          firmas: firmasActualizadas,
        };
      });

      setFirmasUsuario((prev) => ({
        ...prev,
        [firmaActualizada.tipo_firma]: firmaActualizada,
      }));

      setFirmasPendientes((prev) => {
        const { [firmaActualizada.tipo_firma]: _omit, ...rest } = prev;
        return rest;
      });

      setSignatures((prev) => ({
        ...prev,
        [firmaActualizada.tipo_firma]: signatureData ?? firmaActualizada.imagen ?? null,
      }));

      setHasSignature((prev) => ({
        ...prev,
        [firmaActualizada.tipo_firma]: Boolean(signatureData ?? firmaActualizada.imagen),
      }));

      try {
        const evaluacionUsuarioActualizada = await apiService.getEvaluacionUsuario(evaluacionGuardadaInfo.id);
        setEvaluacionGuardadaInfo(evaluacionUsuarioActualizada);
        setEvaluacionesUsuarioGuardadas((prev) => ({
          ...prev,
          [evaluacionUsuarioActualizada.evaluacion]: evaluacionUsuarioActualizada,
        }));
      } catch (detalleError) {
        console.error('Error al actualizar la evaluación del usuario tras firmar', detalleError);
      }

      if (selectedPosicion?.id) {
        await loadProgresosNivel(selectedPosicion.id);
      } else {
        await loadProgresosNivel();
      }

      setIsDrawing(false);
      setFirmaModalAbierta(null);
      setFirmaModalFirmante(null);

      const mensajeExito = firmaActualizada.esta_firmado
        ? 'Firma guardada correctamente.'
        : 'Firmante asignado y marcado como pendiente.';
      showSuccess(mensajeExito);
    } catch (error: any) {
      console.error('Error al guardar la firma', error);
      showError(error.message || 'Error al guardar la firma');
    } finally {
      setGuardandoFirma(false);
    }
  };

  const registrarFirmasPendientes = async (evaluacionUsuarioId: number) => {
    const combinadasPendientes: Record<
      string,
      { imagen: string | null; usuario: number | null; usuarioNombre: string | null; nombre: string }
    > = { ...firmasPendientes };

    if (evaluacionActual) {
      evaluacionActual.firmas.forEach((firma: FirmaEvaluacion) => {
        const slug = firma.tipo_firma;
        if (!combinadasPendientes[slug]) {
          const imagenExistente = signatures[slug] ?? null;
          const firmaUsuario = firmasUsuario[slug] ?? null;
          const yaFirmada = Boolean(firmaUsuario?.esta_firmado || firma.esta_firmado);
          if (imagenExistente && !yaFirmada) {
            const usuarioFirmanteId =
              firmaUsuario?.usuario ??
              firma.usuario ??
              (slug === 'empleado' ? selectedUser?.id ?? null : null);
            const usuarioFirmanteNombre =
              firmaUsuario?.usuario_nombre ??
              firma.usuario_nombre ??
              (slug === 'empleado'
                ? selectedUser?.full_name || selectedUser?.username || null
                : null);

            combinadasPendientes[slug] = {
              imagen: imagenExistente,
              usuario: usuarioFirmanteId,
              usuarioNombre: usuarioFirmanteNombre,
              nombre: firmaUsuario?.nombre || firma.nombre,
            };
          }
        }
      });
    }

    const pendientesEntries = Object.entries(combinadasPendientes);
    if (pendientesEntries.length === 0) {
      return;
    }

    const pendientesRestantes: typeof firmasPendientes = {};
    const firmasActualizadas: Record<string, FirmaEvaluacionUsuario> = {};

    for (const [tipo_firma, datos] of pendientesEntries) {
      try {
        const firmaActualizada = await apiService.firmarEvaluacionUsuario(evaluacionUsuarioId, {
          tipo_firma,
          nombre: datos.nombre,
          usuario: datos.usuario ?? undefined,
          imagen: datos.imagen || undefined,
        });
        firmasActualizadas[tipo_firma] = firmaActualizada;
      } catch (error: any) {
        console.error(`Error al registrar la firma pendiente ${tipo_firma}`, error);
        showError(
          error?.message
            ? `Error al registrar la firma ${tipo_firma}: ${error.message}`
            : `Error al registrar la firma ${tipo_firma}.`
        );
        // Continuar con las demás firmas
        pendientesRestantes[tipo_firma] = datos;
      }
    }

    if (Object.keys(firmasActualizadas).length > 0) {
      setFirmasUsuario((prev) => ({
        ...prev,
        ...firmasActualizadas,
      }));

      setSignatures((prev) => {
        const updated = { ...prev };
        Object.entries(firmasActualizadas).forEach(([tipo, firma]) => {
          updated[tipo] = firma.imagen ?? prev[tipo] ?? null;
        });
        return updated;
      });

      setHasSignature((prev) => {
        const updated = { ...prev };
        Object.entries(firmasActualizadas).forEach(([tipo, firma]) => {
          updated[tipo] = Boolean(firma.imagen);
        });
        return updated;
      });
    }

    setFirmasPendientes(pendientesRestantes);

    if (Object.keys(pendientesRestantes).length === 0) {
      try {
        const evaluacionUsuarioActualizada = await apiService.getEvaluacionUsuario(evaluacionUsuarioId);
        setEvaluacionGuardadaInfo(evaluacionUsuarioActualizada);
        setEvaluacionesUsuarioGuardadas((prev) => ({
          ...prev,
          [evaluacionUsuarioActualizada.evaluacion]: evaluacionUsuarioActualizada,
        }));
      } catch (detalleError) {
        console.error('Error al refrescar la evaluación del usuario tras registrar firmas pendientes', detalleError);
      }
    }
  };

  const guardarEvaluacion = async () => {
    if (!selectedUser || !evaluacionActual || !supervisorSeleccionado) {
      showError('Por favor selecciona un supervisor');
      return;
    }

    if (evaluacionesUsuarioGuardadas[evaluacionActual.id]) {
      showError('Esta evaluación ya tiene un resultado guardado. Utiliza el botón "Ver" para consultarlo.');
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
      const evaluacionUsuarioCreada = await apiService.createEvaluacionUsuario({
        evaluacion: evaluacionActual.id,
        usuario: selectedUser.id,
        supervisor: supervisorSeleccionado,
        resultados_puntos: resultadosEvaluacion.map((resultado) => ({
          punto_evaluacion: resultado.punto_evaluacion,
          puntuacion: resultado.puntuacion,
          observaciones: resultado.observaciones || ''
        }))
      });

      if (evaluacionUsuarioCreada?.id) {
        await registrarFirmasPendientes(evaluacionUsuarioCreada.id);
      }

      showSuccess('Evaluación guardada exitosamente');
      await loadEvaluacionesUsuario(selectedUser);
      if (selectedPosicion?.id) {
        await loadProgresosNivel(selectedPosicion.id);
      } else {
        await loadProgresosNivel();
      }
      setCurrentView('usuario-detalle');
    } catch (error: any) {
      console.error('Error guardando evaluación:', error);
      showError(error.message || 'Error al guardar la evaluación');
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
    
    // Cargar fechas de usuarios desde la lista (si están disponibles)
    const fechasIniciales: Record<number, string> = {};
    if (lista.usuarios_fechas) {
      Object.keys(lista.usuarios_fechas).forEach(usuarioIdStr => {
        const usuarioId = parseInt(usuarioIdStr);
        fechasIniciales[usuarioId] = lista.usuarios_fechas![usuarioIdStr];
      });
    }
    // Si no hay fechas en la lista, usar fecha de hoy como default
    usuariosAsignados.forEach(user => {
      if (!fechasIniciales[user.id]) {
        fechasIniciales[user.id] = new Date().toISOString().split('T')[0];
      }
    });
    setFechasUsuarios(fechasIniciales);
  };

  const goBack = () => {
    if (isRegularUser) {
      if (currentView === 'usuario-evaluacion') {
        setCurrentView('usuario-detalle');
        setEvaluacionActual(null);
        setResultadosEvaluacion([]);
        setSupervisorSeleccionado(null);
        setEvaluacionModoLectura(true);
        setSignatures({});
        setHasSignature({});
        setFirmasUsuario({});
        setFirmasPendientes({});
      }
      return;
    }

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
        if (selectedPosicion?.id) {
          loadProgresosNivel(selectedPosicion.id);
        } else {
          loadProgresosNivel();
        }
        setSelectedUser(null);
        setCurrentView('usuarios');
        break;
      case 'usuario-evaluacion':
        setCurrentView('usuario-detalle');
        setEvaluacionActual(null);
        setResultadosEvaluacion([]);
        setSupervisorSeleccionado(null);
        // Limpiar firmas
        setSignatures({});
        setHasSignature({});
        setFirmasUsuario({});
        setFirmasPendientes({});
        if (selectedPosicion?.id) {
          loadProgresosNivel(selectedPosicion.id);
        } else {
          loadProgresosNivel();
        }
        break;
      case 'onboarding':
        if (onboardingUsuarioId) {
          // Si se entró desde el botón Onboarding del usuario, regresar al detalle del usuario
          // Primero intentar usar selectedUser si coincide con el ID
          let usuarioSeleccionado = selectedUser && selectedUser.id === onboardingUsuarioId
              ? selectedUser
            : null;
          
          // Si no coincide, buscar en la lista de usuarios
          if (!usuarioSeleccionado) {
            usuarioSeleccionado = usuarios.find((user) => user.id === onboardingUsuarioId) || null;
          }
          
          // Si aún no se encuentra, usar selectedUser como fallback
          if (!usuarioSeleccionado && selectedUser) {
            usuarioSeleccionado = selectedUser;
          }

          if (usuarioSeleccionado) {
            setSelectedUser(usuarioSeleccionado);
            setCurrentView('usuario-detalle');
            if (selectedPosicion?.id) {
              loadProgresosNivel(selectedPosicion.id);
          } else {
              loadProgresosNivel();
          }
        } else {
            // Si no se encuentra el usuario, ir a grupos
          setCurrentView('grupos');
        }
          setOnboardingUsuarioId(null);
        } else {
          // Si se entró desde la tarjeta ONBOARDING (sin usuario), regresar a grupos
          setCurrentView('grupos');
        }
        break;
      case 'lista-asistencia-form':
        setCurrentView(onboardingUsuarioId ? 'onboarding' : 'grupos');
        setFormData({
          nombre: '',
          supervisor: null,
          instructor: null,
          usuarios_regulares: [],
          area: 0,
          is_active: true
        });
        setUsuariosSeleccionados([]);
        setFechasUsuarios({});
        setIsEditing(false);
        setEditingListaId(null);
        if (selectedPosicion?.id) {
          loadProgresosNivel(selectedPosicion.id);
        } else {
          loadProgresosNivel();
        }
        break;
    }
  };

  interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
    isClickable: boolean;
  }

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Áreas',
        onClick: () => {
          setCurrentView('areas');
          setSelectedArea(null);
          setSelectedGrupo(null);
          setSelectedPosicion(null);
          setSelectedUser(null);
        },
        isClickable: currentView !== 'areas'
      }
    ];

    if (selectedArea) {
      items.push({
        label: selectedArea.name,
        onClick: () => {
          setCurrentView('grupos');
          setSelectedGrupo(null);
          setSelectedPosicion(null);
          setSelectedUser(null);
        },
        isClickable: currentView !== 'grupos' && currentView !== 'areas'
      });

      if (currentView === 'grupos') {
        items.push({
          label: 'Grupos',
          isClickable: false
        });
      } else if (currentView === 'posiciones' || currentView === 'usuarios' || currentView === 'usuario-detalle' || currentView === 'usuario-evaluacion') {
        items.push({
          label: 'Grupos',
          onClick: () => {
            setCurrentView('grupos');
            setSelectedPosicion(null);
            setSelectedUser(null);
          },
          isClickable: true
        });

        if (selectedGrupo) {
          items.push({
            label: selectedGrupo.name,
            onClick: () => {
              setCurrentView('posiciones');
              setSelectedPosicion(null);
              setSelectedUser(null);
            },
            isClickable: currentView !== 'posiciones'
          });
        }

        items.push({
          label: 'Posiciones',
          onClick: () => {
            setCurrentView('posiciones');
            setSelectedUser(null);
          },
          isClickable: currentView !== 'posiciones'
        });

        if (selectedPosicion && (currentView === 'usuarios' || currentView === 'usuario-detalle' || currentView === 'usuario-evaluacion')) {
          items.push({
            label: selectedPosicion.name,
            onClick: () => {
              setCurrentView('usuarios');
              setSelectedUser(null);
            },
            isClickable: currentView !== 'usuarios'
          });

          items.push({
            label: 'Usuarios',
            onClick: () => {
              setCurrentView('usuarios');
              setSelectedUser(null);
            },
            isClickable: currentView !== 'usuarios'
          });

          if (selectedUser && (currentView === 'usuario-detalle' || currentView === 'usuario-evaluacion')) {
            items.push({
              label: selectedUser.full_name || 'Usuario',
              onClick: () => {
                setCurrentView('usuario-detalle');
                setEvaluacionActual(null);
                setResultadosEvaluacion([]);
                setSupervisorSeleccionado(null);
                setEvaluacionModoLectura(true);
                setSignatures({});
                setHasSignature({});
                setFirmasUsuario({});
                setFirmasPendientes({});
              },
              isClickable: currentView !== 'usuario-detalle'
            });
          }
        }
      } else if (currentView === 'onboarding') {
        items.push({
          label: 'ONBOARDING',
          isClickable: false
        });
      } else if (currentView === 'lista-asistencia-form') {
        items.push({
          label: 'ONBOARDING',
          onClick: () => {
            setCurrentView('onboarding');
          },
          isClickable: true
        });
        items.push({
          label: 'Crear Lista de Asistencia',
          isClickable: false
        });
      }
    }

    return items;
  };

  const renderBreadcrumb = () => {
    const items = getBreadcrumbItems();
    return (
      <div className="breadcrumb">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.isClickable && item.onClick ? (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ) : (
              <span className="breadcrumb-text">{item.label}</span>
            )}
            {index < items.length - 1 && <span className="breadcrumb-separator"> &gt; </span>}
          </React.Fragment>
        ))}
      </div>
    );
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
      // Eliminar la fecha del usuario cuando se quita de la lista
      setFechasUsuarios(prev => {
        const newFechas = { ...prev };
        delete newFechas[usuario.id];
        return newFechas;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        usuarios_regulares: [...prev.usuarios_regulares, usuario.id]
      }));
      // Asignar fecha de hoy por defecto al agregar usuario
      setFechasUsuarios(prev => ({
        ...prev,
        [usuario.id]: new Date().toISOString().split('T')[0]
      }));
    }
  };

  const handleFechaUsuarioChange = (usuarioId: number, fecha: string) => {
    setFechasUsuarios(prev => ({
      ...prev,
      [usuarioId]: fecha
    }));
  };

  const handleSubmitLista = async () => {
    try {
      setLoading(true);
      
      // Preparar el objeto de fechas por usuario
      const usuarios_fechas: Record<string, string> = {};
      formData.usuarios_regulares.forEach(usuarioId => {
        if (fechasUsuarios[usuarioId]) {
          usuarios_fechas[usuarioId.toString()] = fechasUsuarios[usuarioId];
        }
      });
      
      const payload = {
          nombre: formData.nombre,
          supervisor: formData.supervisor,
          instructor: formData.instructor,
          usuarios_regulares: formData.usuarios_regulares,
        usuarios_fechas: usuarios_fechas,
        area: formData.area,
          is_active: formData.is_active
      };
      
      if (isEditing && editingListaId) {
        // Actualizar lista existente
        await apiService.updateListaAsistencia(editingListaId, payload);
        showSuccess('Lista de asistencia actualizada exitosamente');
      } else {
        // Crear nueva lista
        await apiService.createListaAsistencia(payload);
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
      {visibleAreas.length === 0 && isSupervisorOrEntrenador ? (
        <div className="no-areas-message">
          <p>No tienes áreas asignadas. Contacta al administrador.</p>
        </div>
      ) : (
        <div className="areas-grid">
          {visibleAreas.map((area) => (
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
      )}
    </div>
  );

  const renderGrupos = () => {
    const gruposDelArea = grupos.filter(grupo => grupo.area === selectedArea?.id);
    
    const nivelActual =
      evaluacionActual?.nivel ??
      evaluacionActual?.nivel_posicion_data?.nivel ??
      null;
    
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>Grupos - {selectedArea?.name}</h2>
          <p>Selecciona un grupo para ver sus posiciones o ONBOARDING para listas de asistencia</p>
        </div>
        <div className="grupos-grid">
          {/* Botón de ONBOARDING - solo si el área lo incluye */}
          {(selectedArea as Area & { include_onboarding?: boolean })?.include_onboarding !== false && (
            <div 
              className="grupo-card onboarding-card"
              onClick={() => handleOnboardingClick(null)}
            >
              <div className="card-content">
                <h3>ONBOARDING</h3>
                <p>Listas de Asistencia</p>
              </div>
            </div>
          )}
          
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
            <div className="nivel-filter">
              <label htmlFor="nivel-filter-select">Nivel</label>
              <select
                id="nivel-filter-select"
                value={nivelFiltroUsuarios === 'todos' ? 'todos' : nivelFiltroUsuarios.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'todos') {
                    setNivelFiltroUsuarios('todos');
                  } else {
                    const parsed = parseInt(value, 10);
                    setNivelFiltroUsuarios(Number.isNaN(parsed) ? 'todos' : parsed);
                  }
                }}
              >
                <option value="todos">Todos los niveles</option>
                {[1, 2, 3, 4].map((nivel) => (
                  <option key={nivel} value={nivel}>
                    Nivel {nivel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="usuarios-list">
          {(() => {
            const usuariosPorNivel = filteredUsuarios.filter((user) => {
              if (nivelFiltroUsuarios === 'todos') {
                return true;
              }
              const progresoUsuario = progresosNivel[user.id];
              if (!progresoUsuario) {
                return false;
              }
              const progresoNivel = progresoUsuario[nivelFiltroUsuarios];
              return progresoNivel ? progresoNivel.completado : false;
            });

            return usuariosPorNivel.length > 0 ? (
              usuariosPorNivel.map((user) => (
              <div 
                key={user.id} 
                className="usuario-item clickeable"
                onClick={() => handleUserClick(user)}
              >
                <div className="usuario-avatar">
                  {user.profile_photo ? (
                    <img
                      src={getMediaUrl(user.profile_photo)}
                      alt={`Foto de ${user.full_name}`}
                    />
                  ) : (
                    <FaUsers />
                  )}
                </div>
                <div className="usuario-info">
                  <h3>{user.full_name}</h3>
                  {user.numero_empleado && <p className="numero-empleado">#{user.numero_empleado}</p>}
                  {user.fecha_ingreso && <p className="fecha-ingreso">{new Date(user.fecha_ingreso).toLocaleDateString('es-ES')}</p>}
                </div>
                <div className="usuario-cuadro">
                  {[4, 1, 3, 2].map((nivel) => {
                    // Usar niveles_completos del backend como fuente principal
                    let completado = Boolean(user.niveles_completos?.[nivel]);
                    
                    // Fallback: usar nivelesCompletosPorUsuario si no viene del backend
                    if (!completado) {
                    const resumenUsuario = nivelesCompletosPorUsuario[user.id] || {};
                      completado = Boolean(resumenUsuario[nivel]);
                    }
                    
                    // Último fallback: usar progresosNivel
                    if (!completado && progresosNivel[user.id]) {
                      const progresoUsuario = progresosNivel[user.id];
                      if (progresoUsuario && progresoUsuario[nivel] !== undefined) {
                        completado = progresoUsuario[nivel].completado;
                      }
                    }
                    
                    const esActivo = selectedUser?.id === user.id && nivelSeleccionado === nivel;
                    const clases = [
                      'cuadro-item',
                      completado ? 'cuadro-completado' : '',
                      esActivo ? 'cuadro-activo' : ''
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return <div key={nivel} className={clases}></div>;
                  })}
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
            );
          })()}
        </div>
      </div>
    );
  };

  const renderUsuarioDetalle = () => {
    if (!selectedUser) return null;

    const nivelActual = nivelSeleccionado;
    const fechaActual = new Date().toLocaleDateString('es-ES');
    const resumenActual = selectedUser
      ? (nivelesCompletosPorUsuario[selectedUser.id] || nivelesCompletos)
      : nivelesCompletos;

    const indiceNivelActual = nivelActual
      ? nivelesDisponibles.findIndex((nivel) => nivel === nivelActual)
      : -1;
    const hayNivelAnterior = indiceNivelActual > 0;
    const hayNivelSiguiente =
      indiceNivelActual !== -1 && indiceNivelActual < nivelesDisponibles.length - 1;

    const cambiarNivel = (direccion: 'anterior' | 'siguiente') => {
      if (nivelActual === null) return;
      const indiceActual = nivelesDisponibles.findIndex((nivel) => nivel === nivelActual);
      if (indiceActual === -1) return;
      const nuevoIndice = direccion === 'anterior' ? indiceActual - 1 : indiceActual + 1;
      if (nuevoIndice < 0 || nuevoIndice >= nivelesDisponibles.length) return;
      setNivelSeleccionado(nivelesDisponibles[nuevoIndice]);
    };

    const evaluacionesDelNivel = evaluacionesUsuario.filter((evaluacion) => {
      if (nivelActual === null) {
        return true;
      }
      const nivelEvaluacion =
        evaluacion.nivel_posicion_data?.nivel ??
        evaluacion.nivel ??
        null;
      return nivelEvaluacion === nivelActual;
    });

    const isNivelCompleto = (nivel: number): boolean => {
      if (!selectedUser) {
        return false;
      }

      // Usar niveles_completos del backend como fuente principal
      if (selectedUser.niveles_completos && selectedUser.niveles_completos[nivel] !== undefined) {
        return Boolean(selectedUser.niveles_completos[nivel]);
      }

      // Fallback: usar nivelesCompletosPorUsuario si no viene del backend
      const resumenUsuario = nivelesCompletosPorUsuario[selectedUser.id];
      if (resumenUsuario && resumenUsuario[nivel] !== undefined) {
        return Boolean(resumenUsuario[nivel]);
      }

      // Si no hay datos en nivelesCompletosPorUsuario, intentar con progresosNivel
      const progresoUsuario = progresosNivel[selectedUser.id];
      if (progresoUsuario && progresoUsuario[nivel] !== undefined) {
        return progresoUsuario[nivel].completado;
      }

      // Fallback: usar la lógica basada en evaluaciones si no hay datos precargados
      const evaluacionUsuarioCompletas = Object.values(evaluacionesUsuarioGuardadas).filter(
        (registro) => registro.usuario === selectedUser.id
      );

      const evaluacionesNivel = evaluacionesUsuario.filter((evaluacion) => {
        const nivelEvaluacion =
          evaluacion.nivel_posicion_data?.nivel ??
          evaluacion.nivel ??
          null;
        return nivelEvaluacion === nivel;
      });

      if (evaluacionesNivel.length > 0) {
        return evaluacionesNivel.every((evaluacion) => {
          const registro = evaluacionUsuarioCompletas.find(
            (detalle) => detalle.evaluacion === evaluacion.id
          );

          if (!registro) {
            return false;
          }

          const estado = (registro.estado || '').toLowerCase();
          const estadoFirmasUsuario = (registro.estado_firmas_usuario || '').toLowerCase();
          const firmasCompletasUsuario = estadoFirmasUsuario === 'firmas_completas';
          return (
            firmasCompletasUsuario &&
            (estado === 'completada' || registro.resultado_final !== null)
          );
        });
      }

      // Último fallback: usar resumenActual
      return Boolean(resumenActual[nivel]);
    };

    return (
      <div className="evaluaciones-section">
        <div className="usuario-detalle-header">
          <div className="usuario-info-header">
            <div className="usuario-avatar-large">
              {selectedUser.profile_photo ? (
                <img
                  src={getMediaUrl(selectedUser.profile_photo)}
                  alt={`Foto de ${selectedUser.full_name}`}
                />
              ) : (
                <FaUsers />
              )}
            </div>
            <div className="usuario-details">
              <h2>{selectedUser.full_name}</h2>
              <p className="usuario-id">#{selectedUser.numero_empleado || selectedUser.id}</p>
            </div>
            <div className="usuario-actions">
              <button className="action-btn">
                <FaDownload />
              </button>
              <button className="action-btn">
                <FaPrint />
              </button>
            </div>
            <div className="usuario-controles">
              {!isRegularUser && (
                  <button
                    className="btn-onboarding"
                    type="button"
                    onClick={() => handleOnboardingClick(selectedUser?.id ?? null)}
                  >
                Onboarding
              </button>
              )}
              <span className="usuario-fecha">{fechaActual}</span>
              <div className="nivel-navegacion">
                <button
                  type="button"
                  className="nivel-arrow"
                  onClick={() => cambiarNivel('anterior')}
                  disabled={!hayNivelAnterior}
                  aria-label="Nivel anterior"
                >
                  <FaChevronLeft />
                </button>
                <div className="status-grid">
                  {[4, 1, 3, 2].map((nivel) => (
                    <div
                      key={nivel}
                      className={`status-item nivel-${nivel} ${
                        isNivelCompleto(nivel) ? 'completed' : ''
                      } ${nivelActual === nivel ? 'active' : ''}`}
                      aria-label={`Nivel ${nivel}${
                        nivelActual === nivel ? ' seleccionado' : ''
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="nivel-arrow"
                  onClick={() => cambiarNivel('siguiente')}
                  disabled={!hayNivelSiguiente}
                  aria-label="Nivel siguiente"
                >
                  <FaChevronRight />
                </button>
              </div>
              <div className="nivel-indicador">
                {nivelActual ? `Nivel ${nivelActual}` : 'Sin nivel'}
              </div>
            </div>
          </div>
        </div>

        <div className="usuario-info-content">
          <div className="info-section">
            <h3>Evaluaciones Asignadas</h3>
            {loading ? (
              <div className="loading-message">
                <p>Cargando evaluaciones...</p>
              </div>
            ) : evaluacionesDelNivel.length > 0 ? (
              <div className="evaluaciones-list">
                {evaluacionesDelNivel.map((evaluacion) => {
                  const evaluacionGuardada = evaluacionesUsuarioGuardadas[evaluacion.id];
                  const evaluacionRegistrada = Boolean(evaluacionGuardada);
                  const estadoFirmasUsuario = evaluacionGuardada?.estado_firmas_usuario || 'pendiente_firmas';
                  const textoEstadoFirmasUsuario =
                    evaluacionGuardada?.estado_firmas_usuario_display || 'Pendiente de firmas';
                  const todasFirmasCompletas = estadoFirmasUsuario === 'firmas_completas';
                  const estaCompletada =
                    evaluacionRegistrada &&
                    (evaluacionGuardada?.estado === 'completada' || todasFirmasCompletas);
                  const estaPendienteFirmas = evaluacionRegistrada && !todasFirmasCompletas;
                  return (
                    <div
                      key={evaluacion.id}
                      className={`evaluacion-item-simple ${
                        estaCompletada ? 'completada' : evaluacionRegistrada ? 'en-proceso' : 'pendiente'
                      }`}
                    >
                      <div className="evaluacion-content">
                        <div className="evaluacion-header">
                          <h4>{evaluacion.nombre}</h4>
                          <span
                            className={`evaluacion-status ${
                              estaPendienteFirmas
                                ? 'status-pendiente-firmas'
                                : estaCompletada
                                ? 'status-completada'
                                : 'status-pendiente'
                            }`}
                          >
                            {estaPendienteFirmas
                              ? textoEstadoFirmasUsuario
                              : estaCompletada
                              ? 'Completada'
                              : 'Pendiente'}
                          </span>
                        </div>
                        <div className="evaluacion-actions">
                          {estaCompletada ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => verEvaluacionGuardada(evaluacion, evaluacionGuardada)}
                            >
                              Ver
                            </button>
                          ) : (
                            <button 
                              className={`btn btn-${isRegularUser ? 'secondary' : 'primary'} btn-sm`}
                              onClick={() => iniciarEvaluacion(evaluacion)}
                            >
                              {isRegularUser ? 'Firmar' : 'Evaluar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

    const nivelActual =
      evaluacionActual.nivel ??
      evaluacionActual.nivel_posicion_data?.nivel ??
      null;
    const resultadoFinalGuardado = evaluacionGuardadaInfo?.resultado_final ?? null;
    const fechaCompletadaGuardada = evaluacionGuardadaInfo?.fecha_completada
      ? new Date(evaluacionGuardadaInfo.fecha_completada).toLocaleString('es-ES')
      : null;

    return (
      <div className="evaluaciones-section">

        <div className="evaluation-content">
          <div className={`evaluation-form ${evaluacionModoLectura ? 'read-only' : ''}`}>
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
                                className={`status-item nivel-${nivel} ${nivelActual === nivel ? 'active' : ''}`}
                                aria-label={`Nivel ${nivel}${nivelActual === nivel ? ' seleccionado' : ''}`}
                              />
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

            {evaluacionGuardadaInfo && (
              <div className="evaluation-result-summary">
                <span className="summary-badge">
                  Resultado final:{' '}
                  {resultadoFinalGuardado !== null ? `${resultadoFinalGuardado}%` : 'Sin resultado'}
                </span>
                {fechaCompletadaGuardada && (
                  <span className="summary-badge">
                    Registrado: {fechaCompletadaGuardada}
                  </span>
                )}
              </div>
            )}
            </div>

            <div className="form-section">
              <h4>Supervisor</h4>
              <div className="form-group">
                <select 
                  value={supervisorSeleccionado || ''}
                  onChange={(e) => setSupervisorSeleccionado(parseInt(e.target.value) || null)}
                  className="form-control"
                  disabled={evaluacionModoLectura}
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
                            onClick={() => {
                              if (!evaluacionModoLectura) {
                                handlePuntuacionChange(punto.id, puntuacion);
                              }
                            }}
                          >
                            <label className="puntuacion-option">
                                <input
                                  type="radio"
                                  name={`puntuacion-${punto.id}`}
                                  value={puntuacion}
                                  checked={resultado?.puntuacion === puntuacion}
                                  onChange={() => handlePuntuacionChange(punto.id, puntuacion)}
                                  disabled={evaluacionModoLectura}
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
                  const divisor = evaluacionActual.formula_divisor ?? (evaluacionActual.puntos_evaluacion?.length || 1);
                  const multiplicador = evaluacionActual.formula_multiplicador ?? 100;
                  const resultado = divisor > 0 ? (puntosObtenidos / divisor) * multiplicador : 0;
                  return (
                    <div className="resultado-content">
                      <div className="resultado-formula">
                        <span className="resultado-label">Puntos Obtenidos:</span>
                        <span className="resultado-value">{puntosObtenidos}</span>
                      </div>
                      <div className="resultado-formula">
                        <span className="resultado-label">Fórmula:</span>
                        <span className="resultado-value">
                          ( {puntosObtenidos} / {divisor} ) * {multiplicador} = {resultado.toFixed(2)}%
                        </span>
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
                {evaluacionActual.firmas && evaluacionActual.firmas.length > 0 ? (
                  evaluacionActual.firmas.map((firma: FirmaEvaluacion) => {
                    const slug = firma.tipo_firma;
                    const nombreFirma = firma.nombre || firma.tipo_firma_display || slug;
                    const firmaUsuario = firmasUsuario[slug] ?? null;
                    const firmaPendiente = firmasPendientes[slug] ?? null;
                    const firmaImagen = signatures[slug] ?? firmaUsuario?.imagen ?? firmaPendiente?.imagen ?? null;
                    const tieneFirma = Boolean(firmaImagen);
                    const estaFirmada = firmaUsuario?.esta_firmado ?? Boolean(firmaPendiente?.imagen);
                    const firmanteNombre =
                      firmaUsuario?.usuario_nombre ??
                      firmaPendiente?.usuarioNombre ??
                      firma.usuario_nombre ??
                      null;
                    const estadoDisplay =
                      firmaUsuario?.estado_display ||
                      (firmaPendiente
                        ? firmaPendiente.imagen
                          ? `Firma capturada (${firmaPendiente.usuarioNombre || 'sin firmante asignado'})`
                          : firmaPendiente.usuarioNombre
                            ? `Pendiente de firma de ${firmaPendiente.usuarioNombre}`
                            : 'Pendiente de asignación'
                        : firmanteNombre
                          ? `Pendiente de firma de ${firmanteNombre}`
                          : 'Pendiente de asignación');
                    const estadoEvaluacionCompletada = (
                      (evaluacionGuardadaInfo?.estado || '').toLowerCase() === 'completada' ||
                      (evaluacionGuardadaInfo?.estado_firmas_usuario || '').toLowerCase() === 'firmas_completas' ||
                      (evaluacionActual.estado_firmas || '').toLowerCase() === 'firmas_completas'
                    );

                    const usuarioAsignadoFirma =
                      firmaUsuario?.usuario ??
                      firmaPendiente?.usuario ??
                      firma.usuario ??
                      (firma.tipo_firma === 'empleado' ? selectedUser?.id ?? null : null);

                    const esFirmanteActual =
                      currentUserId !== null && usuarioAsignadoFirma === currentUserId;

                    const puedeFirmarPendiente = esFirmanteActual && !estaFirmada;
                    const puedeEditarPorRol = !evaluacionModoLectura && !estadoEvaluacionCompletada;
                    const puedeEditarFirma = puedeFirmarPendiente || puedeEditarPorRol;

                    return (
                      <div key={slug} className="firma-item">
                        <label className="firma-label">{nombreFirma}</label>
                        <span className={`firma-estado ${estaFirmada ? 'firmada' : 'pendiente'}`}>
                          {estadoDisplay}
                        </span>
                        {tieneFirma ? (
                          <div className="firma-preview-container">
                            <div className="firma-preview">
                              <img
                                src={firmaImagen || ''}
                                alt={`Firma ${nombreFirma}`}
                              />
                            </div>
                            {puedeEditarFirma && (
                            <button
                              type="button"
                              className="btn-editar-firma"
                              onClick={() => handleOpenFirmaModal(firma)}
                            >
                              <FaEdit /> Editar Firma
                            </button>
                            )}
                          </div>
                        ) : (
                          puedeEditarFirma && (
                          <button
                            type="button"
                            className="btn-agregar-firma"
                            onClick={() => handleOpenFirmaModal(firma)}
                          >
                            <FaPlus /> Agregar Firma
                          </button>
                          )
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="field-helper">
                    Esta evaluación no tiene firmas configuradas.
                  </div>
                )}
              </div>
            </div>

            {/* Modal de Firma */}
            {firmaModalAbierta && (
              <div className="modal-overlay" onClick={() => {
                setIsDrawing(false);
                setFirmaModalAbierta(null);
                setFirmaModalFirmante(null);
              }}>
                <div className="modal modal-firma" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Firma - {firmaModalAbierta.nombre}</h3>
                    <button 
                      className="modal-close"
                      onClick={() => {
                        setIsDrawing(false);
                        setFirmaModalAbierta(null);
                        setFirmaModalFirmante(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    {firmaModalAbierta.tipo === 'empleado' ? (
                      <div className="firma-firmante-info">
                        Firmante: <strong>{selectedUser?.full_name || 'Empleado'}</strong>
                      </div>
                    ) : (
                      <div className="firma-firmante-select">
                        <label>Selecciona firmante</label>
                        {supervisores.length > 0 ? (
                          <select
                            value={firmaModalFirmante ?? ''}
                            onChange={(e) =>
                              setFirmaModalFirmante(e.target.value ? parseInt(e.target.value, 10) : null)
                            }
                          >
                            <option value="">Selecciona un firmante</option>
                            {supervisores
                              .filter((supervisor) => supervisor.role !== 'USUARIO')
                              .map((supervisor) => (
                                <option key={supervisor.id} value={supervisor.id}>
                                  {supervisor.full_name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="firma-firmante-info">
                            No hay supervisores disponibles para firmar.
                          </div>
                        )}
                      </div>
                    )}
                    <div className="firma-canvas-wrapper">
                      <canvas
                        ref={firmaCanvasRef}
                        width={600}
                        height={250}
                        className="firma-canvas"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <div className="firma-controls">
                      <button
                        type="button"
                        className="btn-clear-firma"
                        onClick={clearSignature}
                        disabled={!firmaModalAbierta || !hasSignature[firmaModalAbierta.tipo]}
                      >
                        <FaEraser /> Limpiar
                      </button>
                      <button
                        type="button"
                        className="btn-guardar-firma"
                        onClick={async () => {
                          stopDrawing();
                          await handleGuardarFirma();
                        }}
                        disabled={guardandoFirma || !puedeGuardarFirma()}
                      >
                        <FaSave /> {guardandoFirma ? 'Guardando...' : 'Guardar Firma'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="evaluation-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setEvaluacionModoLectura(false);
                  setEvaluacionGuardadaInfo(null);
                  setCurrentView('usuario-detalle');
                }}
              >
                {evaluacionModoLectura ? 'Volver' : 'Cancelar'}
              </button>
              {!evaluacionModoLectura && (
                <button 
                  className="btn btn-primary"
                  onClick={guardarEvaluacion}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOnboarding = () => {
    const listasDelArea = listasAsistencia.filter(lista => lista.area === selectedArea?.id);
    const usuarioOnboarding = onboardingUsuarioId
      ? usuarios.find((user) => user.id === onboardingUsuarioId) || null
      : null;
    const listasFiltradas = listasDelArea.filter(lista => {
      // Filtrar por usuario si hay uno seleccionado
      if (usuarioOnboarding && !lista.usuarios_regulares.includes(usuarioOnboarding.id)) {
        return false;
      }
      
      // Filtrar por término de búsqueda
      if (searchTerm) {
        const nombreMatch = lista.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return nombreMatch;
      }
      
      return true;
    });
    
    // Solo mostrar el botón "Añadir nueva lista" si se entró desde la tarjeta ONBOARDING (no desde el botón Onboarding del usuario)
    const mostrarBotonCrearLista = !onboardingUsuarioId && selectedArea !== null;
    
    return (
      <div className="evaluaciones-section">
        <div className="section-header">
          <h2>
            ONBOARDING - {selectedArea?.name}
            {usuarioOnboarding ? ` / ${usuarioOnboarding.full_name}` : ''}
          </h2>
          {usuarioOnboarding && (
            <p className="onboarding-subtitle">
              Listas de asistencia en las que participa el empleado seleccionado.
            </p>
          )}
        </div>
        
        <div className="onboarding-actions">
          {mostrarBotonCrearLista && (
          <div 
            className="btn-crear-lista-card"
            onClick={handleCrearListaAsistencia}
          >
            <div className="card-content">
              <FaPlus />
              <h3>Añadir nueva lista</h3>
            </div>
          </div>
          )}
          
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
          {listasFiltradas.length > 0 ? (
            listasFiltradas.map((lista) => {
              // Obtener la fecha del usuario en esta lista
              const fechaUsuario = usuarioOnboarding && lista.usuarios_fechas 
                ? lista.usuarios_fechas[usuarioOnboarding.id.toString()] 
                : null;
              
              return (
              <div 
                key={lista.id} 
                className="lista-card-simple"
                onClick={() => handleEditarLista(lista)}
              >
                <div className="card-content">
                  <h3>{lista.nombre}</h3>
                    {fechaUsuario && (
                      <div className="lista-fecha-usuario">
                        <span className="fecha-label">Fecha:</span>
                        <span className="fecha-value">
                          {new Date(fechaUsuario).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                </div>
                    )}
              </div>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <FaClipboardList />
              <h3>No hay listas de asistencia</h3>
              <p>
                {usuarioOnboarding
                  ? 'Este empleado no está asignado a listas de asistencia en esta área.'
                  : 'No se encontraron listas de asistencia para esta área.'}
              </p>
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
                    {(effectiveUserRole === 'ADMIN' || effectiveUserRole === 'ENTRENADOR') && (
                      <div className="usuario-fecha-input">
                        <label>Fecha:</label>
                        <input
                          type="date"
                          value={fechasUsuarios[usuario.id] || new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleFechaUsuarioChange(usuario.id, e.target.value)}
                          className="fecha-usuario-input"
                        />
                      </div>
                    )}
                    {effectiveUserRole !== 'ADMIN' && effectiveUserRole !== 'ENTRENADOR' && (
                      <div className="usuario-fecha-display">
                        <span>Fecha: {fechasUsuarios[usuario.id] ? new Date(fechasUsuarios[usuario.id]).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
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
        {isRegularUser ? (
        <div className="breadcrumb">
            <span>Mis Evaluaciones</span>
        </div>
        ) : (
          renderBreadcrumb()
        )}
        {!isRegularUser && currentView !== 'areas' && (
          <button className="back-button" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
        )}
        {isRegularUser && currentView === 'usuario-evaluacion' && (
          <button className="back-button" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
        )}
      </div>

      {/* Contenido principal */}
      <div className="evaluaciones-content">
        {!isRegularUser && currentView === 'areas' && renderAreas()}
        {!isRegularUser && currentView === 'grupos' && renderGrupos()}
        {!isRegularUser && currentView === 'posiciones' && renderPosiciones()}
        {!isRegularUser && currentView === 'usuarios' && renderUsuarios()}
        {currentView === 'usuario-detalle' && renderUsuarioDetalle()}
        {currentView === 'usuario-evaluacion' && renderUsuarioEvaluacion()}
        {!isRegularUser && currentView === 'onboarding' && renderOnboarding()}
        {!isRegularUser && currentView === 'lista-asistencia-form' && renderListaAsistenciaForm()}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default Evaluaciones;
