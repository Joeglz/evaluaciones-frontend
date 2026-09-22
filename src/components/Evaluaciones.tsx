import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FaChevronLeft,
  FaChevronRight,
  FaTrashAlt,
  FaPen,
  FaRedo,
  FaEllipsisV,
} from 'react-icons/fa';
import { apiService, Area, Grupo, Posicion, User, ListaAsistencia, ListaAsistenciaCreate, FirmaEvaluacion, FirmaEvaluacionUsuario, EvaluacionUsuario, ProgresoNivel, getMediaUrl } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import ToastContainer from './ToastContainer';
import Fase2ExamenNivel from './fase2/Fase2ExamenNivel';
import { useTopbarOverride } from '../contexts/TopbarContext';
import FirmaModal from './evaluaciones/FirmaModal';
import { crearDocPdfA4, capturarElementoComoImagen, agregarImagenAjustadaAPagina } from './evaluaciones/pdfEvaluaciones';
import './Evaluaciones.css';

import {
  formatFechaIngreso,
  evaluacionCumpleMinimo,
  evaluacionUsuarioTieneAvanceBorrable,
  areaUsaNavegacionPorTecnologia,
  textoBloqueoCandadoFase2,
  etiquetaCortaBloqueoFase2,
  posicionPrincipalId,
  resolverAreaDeUsuario,
  etiquetaChipGrupo,
  agruparEvaluacionesPorTecnologia,
  calcularResumenNiveles,
  TIPO_FIRMA_EMPLEADO,
  TIPO_FIRMA_PRODUCCION,
  filtrarUsuariosPorArea,
  buscarUsuarioEnRolesSupervision,
  esUsuarioSupervisor,
  ordenarUsuariosPorNombre,
  particionarUsuariosSupervision,
  opcionesFirmantePorTipoFirma,
  firmantePermitidoParaTipoFirma,
  compararEvaluacionesOrdenListaAsignadas,
} from './evaluaciones/helpers';
import type { ContextoListaEvaluaciones } from './evaluaciones/helpers';


interface EvaluacionesProps {
  userRole?: string;
  currentUser?: Partial<User> | null;
  evaluacionUsuarioIdParaAbrir?: number | null;
  onAbiertoEvaluacionParaFirmar?: () => void;
  /** Si true, «Volver» desde la evaluación regresa al listado de notificaciones (Dashboard). */
  firmaDesdeNotificaciones?: boolean;
  onVolverNotificaciones?: () => void;
}

const Evaluaciones: React.FC<EvaluacionesProps> = ({
  userRole,
  currentUser,
  evaluacionUsuarioIdParaAbrir,
  onAbiertoEvaluacionParaFirmar,
  firmaDesdeNotificaciones = false,
  onVolverNotificaciones,
}) => {
  // Hook para manejar toasts
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const resultadosBaselineRef = useRef<string>('');

  // Estados para la navegación jerárquica
  const [currentView, setCurrentView] = useState<'areas' | 'grupos' | 'posiciones' | 'usuarios' | 'usuario-detalle' | 'usuario-evaluacion' | 'onboarding' | 'lista-asistencia-form'>('areas');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [selectedPosicion, setSelectedPosicion] = useState<Posicion | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [verTodasTechs, setVerTodasTechs] = useState(false);
  /** Menú ⋯ de acciones secundarias (Editar / Borrar) por evaluación — tablet. */
  const [menuAccionesEvalId, setMenuAccionesEvalId] = useState<number | null>(null);
  /** Panel Detalle / Opciones en ficha persona (tablet planta). */
  const [panelDetallePersona, setPanelDetallePersona] = useState(false);
  const [panelOpcionesLista, setPanelOpcionesLista] = useState(false);
  /** Filtro de lista por grupo tech (tronco / Crusader / …). `todas` = sin filtro. */
  const [filtroGrupoEval, setFiltroGrupoEval] = useState<string>('todas');
  const [indicadorN4, setIndicadorN4] = useState<{
    basicas: number;
    complejas: number;
    requeridas_basicas: number;
    requeridas_complejas: number;
    cumple: boolean;
  } | null>(null);
  const [examenPendiente, setExamenPendiente] = useState<{
    id: number;
    nivel: number;
    estado: string;
  } | null>(null);

  // Estados para los datos
  const [areas, setAreas] = useState<Area[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [usuariosRegulares, setUsuariosRegulares] = useState<User[]>([]);
  const [supervisores, setSupervisores] = useState<User[]>([]);
  const [instructores, setInstructores] = useState<User[]>([]);
  /** ADMIN, ENTRENADOR y SUPERVISOR: firmas cuyo tipo no es empleado/producción/evaluador. */
  const [usuariosFirmasRolesMixtos, setUsuariosFirmasRolesMixtos] = useState<User[]>([]);
  const [listasAsistencia, setListasAsistencia] = useState<ListaAsistencia[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<User[]>([]);
  const [evaluacionesUsuario, setEvaluacionesUsuario] = useState<any[]>([]);
  const [evaluacionActual, setEvaluacionActual] = useState<any>(null);
  const [resultadosEvaluacion, setResultadosEvaluacion] = useState<any[]>([]);
  const [evaluacionesUsuarioGuardadas, setEvaluacionesUsuarioGuardadas] = useState<Record<number, EvaluacionUsuario>>({});
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState<number | null>(null);
  const [evaluacionModoLectura, setEvaluacionModoLectura] = useState(false);
  /** Entrenador: solo capturar firmas (no editar puntos), p. ej. antes de que el empleado firme en bloque. */
  const [modoSoloFirmasEntrenador, setModoSoloFirmasEntrenador] = useState(false);
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
  const firmaPointerIdRef = useRef<number | null>(null);
  const firmaHuboTrazoRef = useRef(false);
  const isDrawingRef = useRef(false);
  const abriendoParaEditarAdminRef = useRef(false);
  const editandoEvaluacionComoAdminRef = useRef(false);
  /** Evita que initRegular del usuario regular pise el flujo abierto desde notificaciones. */
  const inicializacionRegularListaRef = useRef(false);
  const printContentRef = useRef<HTMLDivElement>(null);
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
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  
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
  const isVisor = effectiveUserRole === 'VISOR';
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

  const areasProduccion = useMemo(
    () => visibleAreas.filter((a) => (a.tipo_area ?? 'produccion') === 'produccion'),
    [visibleAreas]
  );
  const areasSoporte = useMemo(
    () => visibleAreas.filter((a) => a.tipo_area === 'soporte'),
    [visibleAreas]
  );

  /** Área de la evaluación en curso: navegación o posición de la plantilla. */
  const areaIdContextoEvaluacion = useMemo(() => {
    if (selectedArea?.id != null) {
      return selectedArea.id;
    }
    const posicionId =
      evaluacionActual?.posicion ?? evaluacionActual?.nivel_posicion_data?.posicion ?? null;
    if (typeof posicionId === 'number' && posiciones.length > 0) {
      const pos = posiciones.find((p: Posicion) => p.id === posicionId);
      if (pos?.area != null) {
        return pos.area;
      }
    }
    return null;
  }, [selectedArea?.id, evaluacionActual, posiciones]);

  const supervisoresParaFirmasPorArea = useMemo(
    () => filtrarUsuariosPorArea(supervisores, areaIdContextoEvaluacion),
    [supervisores, areaIdContextoEvaluacion]
  );

  const instructoresParaFirmasPorArea = useMemo(
    () => filtrarUsuariosPorArea(instructores, areaIdContextoEvaluacion),
    [instructores, areaIdContextoEvaluacion]
  );

  // Combo Supervisor al iniciar evaluación: solo usuarios con rol SUPERVISOR.
  const opcionesSupervisorParaFormulario = useMemo(() => {
    return [...supervisores];
  }, [supervisores]);

  // Modal de firma: opciones según tipo_firma de la plantilla (producción / evaluador / otros).
  const opcionesFirmanteParaModalFirma = useMemo(() => {
    if (!firmaModalAbierta || firmaModalAbierta.tipo === TIPO_FIRMA_EMPLEADO) {
      return [];
    }
    const tipo = firmaModalAbierta.tipo;
    const nombreFirma = firmaModalAbierta.nombre;
    const base = opcionesFirmantePorTipoFirma(
      tipo,
      supervisoresParaFirmasPorArea,
      instructoresParaFirmasPorArea,
      usuariosFirmasRolesMixtos,
      nombreFirma
    );
    const id = firmaModalFirmante;
    if (id != null && !base.some((u) => u.id === id)) {
      const found = buscarUsuarioEnRolesSupervision(
        id,
        usuariosFirmasRolesMixtos,
        supervisores,
        instructores
      );
      if (found && firmantePermitidoParaTipoFirma(tipo, found, nombreFirma)) {
        return ordenarUsuariosPorNombre([...base, found]);
      }
    }
    return base;
  }, [
    firmaModalAbierta,
    firmaModalFirmante,
    supervisoresParaFirmasPorArea,
    instructoresParaFirmasPorArea,
    supervisores,
    instructores,
    usuariosFirmasRolesMixtos,
  ]);

  useEffect(() => {
    if (!isRegularUser) {
    loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegularUser]);

  useEffect(() => {
    setMenuAccionesEvalId(null);
    setPanelDetallePersona(false);
    setPanelOpcionesLista(false);
    setFiltroGrupoEval('todas');
  }, [currentView, selectedUser?.id, nivelSeleccionado]);

  // Ficha persona (tablet): layout flex + scroll solo en la lista, no en toda la página
  useEffect(() => {
    const activa = currentView === 'usuario-detalle';
    document.documentElement.classList.toggle('evaluaciones-ficha-activa', activa);
    return () => {
      document.documentElement.classList.remove('evaluaciones-ficha-activa');
    };
  }, [currentView]);

  useEffect(() => {
    if (menuAccionesEvalId == null) {
      return undefined;
    }
    const cerrar = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.evaluacion-actions-more')) {
        return;
      }
      setMenuAccionesEvalId(null);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuAccionesEvalId]);

  useEffect(() => {
    if (evaluacionUsuarioIdParaAbrir == null || !onAbiertoEvaluacionParaFirmar) return;

    const abrirDesdeNotificacion = async () => {
      try {
        setLoading(true);
        let areasParaContexto = areas;
        if (!isRegularUser) {
          areasParaContexto = await loadData();
        }
        const detalle = await apiService.getEvaluacionUsuario(evaluacionUsuarioIdParaAbrir);
        const [user, evaluacion, supervisoresData] = await Promise.all([
          apiService.getUser(detalle.usuario),
          apiService.getEvaluacion(detalle.evaluacion),
          apiService.getUsers({ role: 'ADMIN,ENTRENADOR,SUPERVISOR', is_active: true })
        ]);
        const particion = particionarUsuariosSupervision(supervisoresData.results || []);
        setSupervisores(particion.supervisores);
        setInstructores(particion.instructores);
        setUsuariosFirmasRolesMixtos(particion.rolesMixtosFirmas);

        const nivelEvaluacion =
          evaluacion.nivel ??
          (evaluacion as any).nivel_posicion_data?.nivel ??
          null;
        if (typeof nivelEvaluacion === 'number') {
          setNivelSeleccionado(nivelEvaluacion);
        }

        const resultadosConsolidados =
          (evaluacion as any).puntos_evaluacion?.map((punto: any) => {
            const resultado = (detalle.resultados_puntos ?? []).find(
              (r: any) => r.punto_evaluacion === punto.id
            );
            return {
              punto_evaluacion: punto.id,
              puntuacion: resultado?.puntuacion ?? null,
              observaciones: resultado?.observaciones ?? ''
            };
          }) ?? [];

        if (isRegularUser && areasParaContexto.length === 0) {
          areasParaContexto = await apiService.getAreas({ is_active: true });
          setAreas(areasParaContexto);
        }
        const areaContexto = resolverAreaDeUsuario(user as User, areasParaContexto);
        if (areaContexto) {
          setSelectedArea(areaContexto);
        }

        setSelectedUser(user);
        setEvaluacionActual(evaluacion);
        setEvaluacionGuardadaInfo(detalle);
        setSupervisorSeleccionado(detalle.supervisor ?? null);
        setResultadosEvaluacion(resultadosConsolidados);
        setEvaluacionModoLectura(isRegularUser || isVisor);
        await loadEvaluacionesUsuario(user as User, {
          area: areaContexto,
          posicionId: posicionPrincipalId(user as User),
        });
        if (isRegularUser) {
          inicializacionRegularListaRef.current = true;
        }
        setCurrentView('usuario-evaluacion');
        onAbiertoEvaluacionParaFirmar();
      } catch (err: any) {
        console.error('Error abriendo evaluación desde notificación:', err);
        showError(err.message || 'No se pudo abrir la evaluación.');
        onAbiertoEvaluacionParaFirmar();
      } finally {
        setLoading(false);
      }
    };

    abrirDesdeNotificacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluacionUsuarioIdParaAbrir, onAbiertoEvaluacionParaFirmar]);

  useEffect(() => {
    if (abriendoParaEditarAdminRef.current) {
      abriendoParaEditarAdminRef.current = false;
      return;
    }
    if (editandoEvaluacionComoAdminRef.current) {
      return;
    }
    const estadoGuardado = (evaluacionGuardadaInfo?.estado || '').toLowerCase();

    // Solo lectura cuando el registro ya está cerrado en BD (guardado de evaluación), no por firmas solas.
    if (estadoGuardado === 'completada') {
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

  // Canvas de firma: Pointer Events (ratón, tacto, lápiz) + captura del puntero para tabletas
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!firmaModalAbierta || !e.isPrimary) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    firmaPointerIdRef.current = e.pointerId;
    firmaHuboTrazoRef.current = false;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !firmaModalAbierta || !e.isPrimary) return;
    if (
      firmaPointerIdRef.current !== null &&
      e.pointerId !== firmaPointerIdRef.current
    ) {
      return;
    }
    e.preventDefault();
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    firmaHuboTrazoRef.current = true;
    setHasSignature((prev) => ({
      ...prev,
      [firmaModalAbierta.tipo]: true,
    }));
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = firmaCanvasRef.current;
    const idToRelease = e?.pointerId ?? firmaPointerIdRef.current;
    if (canvas !== null && idToRelease !== null) {
      try {
        if (canvas.hasPointerCapture(idToRelease)) {
          canvas.releasePointerCapture(idToRelease);
        }
      } catch {
        /* noop */
      }
    }
    firmaPointerIdRef.current = null;

    if (!isDrawingRef.current || !firmaModalAbierta) return;
    isDrawingRef.current = false;

    const tipo = firmaModalAbierta.tipo;
    const huboTrazo = firmaHuboTrazoRef.current || Boolean(hasSignature[tipo]);
    firmaHuboTrazoRef.current = false;
    if (canvas && huboTrazo) {
      const dataURL = canvas.toDataURL('image/png');
      setSignatures((prev) => ({
        ...prev,
        [tipo]: dataURL,
      }));
    }
  };

  const handleOpenFirmaModal = (firma: FirmaEvaluacion) => {
    setFirmaModalAbierta({ tipo: firma.tipo_firma, nombre: firma.nombre });
    const firmaUsuario = firmasUsuario[firma.tipo_firma] ?? null;
    const firmaPendiente = firmasPendientes[firma.tipo_firma] ?? null;
    const tipo = firma.tipo_firma;

    let firmanteId: number | null = null;
    let saltarValidacionRolFirmante = false;

    if (tipo === TIPO_FIRMA_EMPLEADO) {
      firmanteId = selectedUser?.id ?? null;
    } else if (modoSoloFirmasEntrenador && effectiveUserRole === 'ENTRENADOR' && currentUserId) {
      firmanteId = currentUserId;
      saltarValidacionRolFirmante = true;
    } else if (firmaPendiente?.usuario !== undefined && firmaPendiente?.usuario !== null) {
      firmanteId = firmaPendiente.usuario;
    } else if (firmaUsuario?.usuario) {
      firmanteId = firmaUsuario.usuario;
    } else if (
      tipo === TIPO_FIRMA_PRODUCCION &&
      supervisorSeleccionado &&
      supervisores.some((s) => s.id === supervisorSeleccionado)
    ) {
      // Prioridad sobre firma.usuario de plantilla: el supervisor elegido en el formulario.
      firmanteId = supervisorSeleccionado;
    } else if (firma.usuario) {
      firmanteId = firma.usuario;
    }

    const opcionesFirma = opcionesFirmantePorTipoFirma(
      tipo,
      supervisoresParaFirmasPorArea,
      instructoresParaFirmasPorArea,
      usuariosFirmasRolesMixtos,
      firma.nombre
    );

    if (
      !saltarValidacionRolFirmante &&
      tipo !== TIPO_FIRMA_EMPLEADO &&
      firmanteId != null
    ) {
      const usuarioCandidato = buscarUsuarioEnRolesSupervision(
        firmanteId,
        usuariosFirmasRolesMixtos,
        supervisores,
        instructores
      );
      if (!firmantePermitidoParaTipoFirma(tipo, usuarioCandidato, firma.nombre)) {
        firmanteId = null;
      }
    }

    if (
      !saltarValidacionRolFirmante &&
      tipo !== TIPO_FIRMA_EMPLEADO &&
      firmanteId == null &&
      opcionesFirma.length > 0
    ) {
      firmanteId = opcionesFirma[0].id;
    }

    setFirmaModalFirmante(firmanteId);
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
    firmaHuboTrazoRef.current = false;
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
        const requierePosicion = !areaUsaNavegacionPorTecnologia(selectedArea);
        const tienePosicion =
          !requierePosicion ||
          (selectedPosicion?.id != null &&
            (user.posiciones?.some((p) => p.posicion_id === selectedPosicion?.id) ||
              user.posicion === selectedPosicion?.id));
        const tieneArea = user.areas.includes(selectedArea?.id || 0);
        const tieneGrupo =
          selectedGrupo?.id != null &&
          (user.grupos?.some((g) => g.grupo_id === selectedGrupo.id) ||
            user.grupo === selectedGrupo.id ||
            Number(user.grupo) === selectedGrupo.id);
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
        const requierePosicion = !areaUsaNavegacionPorTecnologia(selectedArea);
        const tienePosicion =
          !requierePosicion ||
          (selectedPosicion?.id != null &&
            (user.posiciones?.some((p) => p.posicion_id === selectedPosicion?.id) ||
              user.posicion === selectedPosicion?.id));
        const tieneArea = user.areas.includes(selectedArea?.id || 0);
        const tieneGrupo =
          selectedGrupo?.id != null &&
          (user.grupos?.some((g) => g.grupo_id === selectedGrupo.id) ||
            user.grupo === selectedGrupo.id ||
            Number(user.grupo) === selectedGrupo.id);
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

    const abortController = new AbortController();
    const CONCURRENCY = 4;

    const cargarResumenUsuario = async (usuario: User) => {
      if (abortController.signal.aborted) return;

      const areaId = Array.isArray(usuario.areas) && usuario.areas.length > 0
        ? usuario.areas[0]
        : (typeof usuario.areas === 'number' ? usuario.areas : undefined);

      const posicionParaResumen = selectedPosicion?.id ?? usuario.posicion;
      if (!areaId || !posicionParaResumen) {
        console.log(`Saltando usuario ${usuario.id}: sin área o posición`, {
          areaId,
          posicion: posicionParaResumen,
        });
        return;
      }

      const [evaluaciones, evaluacionesGuardadas] = await Promise.all([
        apiService.getEvaluaciones({
          area_id: areaId,
          posicion_id: posicionParaResumen,
          es_plantilla: false
        }),
        apiService.getEvaluacionesUsuarioAll({
          usuario: usuario.id,
          posicion_id: posicionParaResumen,
        })
      ]);

      if (abortController.signal.aborted) return;

      const guardadasMap: Record<number, EvaluacionUsuario> = {};
      evaluacionesGuardadas.forEach((registro) => {
        guardadasMap[registro.evaluacion] = registro;
      });

      const { completados } = calcularResumenNiveles(evaluaciones || [], guardadasMap);

      if (!abortController.signal.aborted) {
        setNivelesCompletosPorUsuario((prev) => ({
          ...prev,
          [usuario.id]: completados
        }));
      }
    };

    const cargarResumenes = async () => {
      for (let i = 0; i < usuariosPendientes.length; i += CONCURRENCY) {
        if (abortController.signal.aborted) return;
        const lote = usuariosPendientes.slice(i, i + CONCURRENCY);
        await Promise.all(
          lote.map(async (usuario) => {
            try {
              await cargarResumenUsuario(usuario);
            } catch (prefetchError) {
              if (!abortController.signal.aborted) {
                console.error(
                  'Error al precargar resumen de niveles para el usuario',
                  usuario.id,
                  prefetchError
                );
              }
            }
          })
        );
      }
    };

    void cargarResumenes();

    return () => {
      abortController.abort();
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

  const ordenarUsuariosPorEmpleado = (lista: User[]) =>
    [...lista].sort((a, b) => {
      const na = a.numero_empleado ?? '';
      const nb = b.numero_empleado ?? '';
      if (!na && !nb) return 0;
      if (!na) return 1;
      if (!nb) return -1;
      return na.localeCompare(nb);
    });

  const snapshotResultadosBaseline = (resultados: unknown[]) => {
    resultadosBaselineRef.current = JSON.stringify(resultados);
  };

  const tieneCambiosEvaluacionSinGuardar = () => {
    if (evaluacionModoLectura) return false;
    if (currentView !== 'usuario-evaluacion') return false;
    return JSON.stringify(resultadosEvaluacion) !== resultadosBaselineRef.current;
  };

  const confirmarSalidaSiHayCambios = async (): Promise<boolean> => {
    if (!tieneCambiosEvaluacionSinGuardar()) return true;
    return confirm({
      title: 'Cambios sin guardar',
      message:
        'Hay cambios sin guardar en la evaluación. Si sales ahora, se perderán. ¿Deseas continuar?',
      confirmLabel: 'Salir sin guardar',
      cancelLabel: 'Seguir editando',
      danger: true,
    });
  };

  const loadProgresosNivel = async (posicionId?: number | null) => {
    try {
      const params = posicionId ? { posicion: posicionId } : undefined;
      const progresosLista = await apiService.getProgresosNivelAll(params);
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

      setProgresosNivel((prev) => {
        const next = { ...prev };
        Object.entries(progresosAgrupados).forEach(([usuarioIdStr, nivelesPorNivel]) => {
          const usuarioId = Number(usuarioIdStr);
          next[usuarioId] = {
            ...(prev[usuarioId] ?? {}),
            ...(nivelesPorNivel as Record<number, ProgresoNivel>),
          };
        });
        return next;
      });

      setNivelesCompletosPorUsuario((prev) => {
        const next = { ...prev };
        Object.entries(completadosAgrupados).forEach(([usuarioIdStr, nivelesApi]) => {
          const usuarioId = Number(usuarioIdStr);
          const anterior = prev[usuarioId] ?? {};
          const fusionado: Record<number, boolean> = { ...anterior };
          Object.entries(nivelesApi).forEach(([nivelStr, apiCompletado]) => {
            const nivel = Number(nivelStr);
            const prevCompletado = anterior[nivel];
            /* ProgresoNivel (backend) y calcularResumenNiveles (firmas en EvaluacionUsuario)
             * pueden discrepar; no bajar un nivel ya marcado completo por el resumen de evaluaciones. */
            if (prevCompletado === true && apiCompletado === false) {
              fusionado[nivel] = true;
            } else {
              fusionado[nivel] = Boolean(apiCompletado);
            }
          });
          next[usuarioId] = fusionado;
        });
        return next;
      });
    } catch (error) {
      console.error('Error al cargar progresos de nivel:', error);
    }
  };

  const loadUsuariosEvaluacionesContext = async (
    area: Area | null | undefined,
    grupo: Grupo | null | undefined,
    posicion?: Posicion | null,
    options?: { manageLoading?: boolean }
  ) => {
    const manageLoading = options?.manageLoading !== false;
    if (!area || !grupo) {
      return;
    }
    try {
      if (manageLoading) {
        setLoading(true);
      }
      const params: {
        is_active: boolean;
        evaluaciones: boolean;
        area_id: number;
        grupo_id: number;
        posicion_id?: number;
      } = {
        is_active: true,
        evaluaciones: true,
        area_id: area.id,
        grupo_id: grupo.id,
      };
      if (posicion?.id != null) {
        params.posicion_id = posicion.id;
      }
      const usuariosAll = await apiService.getUsersAll(params);
      const usuariosOrdenados = ordenarUsuariosPorEmpleado(usuariosAll);
      setUsuarios(usuariosOrdenados);
      setUsuariosRegulares(usuariosOrdenados.filter((user) => user.role === 'USUARIO'));
      if (posicion?.id != null) {
        await loadProgresosNivel(posicion.id);
      } else {
        await loadProgresosNivel();
      }
    } catch (err) {
      console.error('Error al cargar usuarios para evaluaciones:', err);
      showError('No se pudieron cargar los usuarios para este contexto');
      setUsuarios([]);
      setUsuariosRegulares([]);
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  };

  /**
   * Usuarios regulares del área para listas de asistencia (ONBOARDING).
   * No depende de posición/grupo; el backend admite evaluaciones=1 solo con area_id.
   */
  const loadUsuariosRegularesPorArea = async (area: Area): Promise<User[]> => {
    const usuariosAll = await apiService.getUsersAll({
      is_active: true,
      evaluaciones: true,
      area_id: area.id,
      role: 'USUARIO',
    });
    const ordenados = ordenarUsuariosPorEmpleado(usuariosAll);
    const regulares = ordenados.filter((user) => user.role === 'USUARIO');
    setUsuariosRegulares(regulares);
    return regulares;
  };

  const loadData = async (): Promise<Area[]> => {
    try {
      setLoading(true);
      const [areasData, gruposData, posicionesData, supervisoresData, listasAll] = await Promise.all([
        apiService.getAreas({ is_active: true }),
        apiService.getGrupos({ is_active: true }),
        apiService.getPosiciones({ is_active: true }),
        apiService.getUsers({
          is_active: true,
          role: 'ADMIN,ENTRENADOR,SUPERVISOR',
          minimal: true,
        }),
        apiService.getListasAsistenciaAll({ is_active: true }),
      ]);

      setAreas(areasData);
      setGrupos(gruposData);
      setPosiciones(posicionesData);
      setUsuarios([]);
      setUsuariosRegulares([]);
      setFilteredUsuarios([]);

      const supList = supervisoresData.results ?? [];
      const particion = particionarUsuariosSupervision(supList);
      setSupervisores(particion.supervisores);
      setInstructores(particion.instructores);
      setUsuariosFirmasRolesMixtos(particion.rolesMixtosFirmas);
      setListasAsistencia(listasAll);
      if (selectedArea && selectedGrupo && selectedPosicion) {
        await loadUsuariosEvaluacionesContext(selectedArea, selectedGrupo, selectedPosicion, {
          manageLoading: false,
        });
      }
      return areasData;
    } catch (err: any) {
      setError(err.message);
      return [];
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
    if (areaUsaNavegacionPorTecnologia(selectedArea)) {
      setSelectedPosicion(null);
      setCurrentView('usuarios');
      setNivelFiltroUsuarios('todos');
      void loadUsuariosEvaluacionesContext(selectedArea, grupo, null);
      return;
    }
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
    void loadUsuariosEvaluacionesContext(selectedArea, selectedGrupo, posicion);
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setVerTodasTechs(false);
    setCurrentView('usuario-detalle');
    loadEvaluacionesUsuario(user);
  };

  const loadEvaluacionesUsuario = async (
    user: User,
    contexto?: ContextoListaEvaluaciones,
    verTodasOverride?: boolean
  ) => {
    try {
      setLoading(true);
      // Área y posición del contexto de navegación (Área > Grupo > Posición > Usuario);
      // si no hay contexto (ej. usuario regular), usar datos del perfil.
      const area = contexto?.area ?? selectedArea ?? undefined;
      const areaId =
        area?.id ??
        (Array.isArray(user.areas) && user.areas.length > 0 ? user.areas[0] : undefined);
      const posicionId =
        contexto?.posicionId ?? selectedPosicion?.id ?? posicionPrincipalId(user);
      const evaluacionesParams: {
        area_id?: number;
        posicion_id?: number;
        es_plantilla: boolean;
        usuario_id?: number;
        ver_todas_techs?: boolean;
      } = {
        es_plantilla: false,
      };

      if (areaId) {
        evaluacionesParams.area_id = areaId;
      }

      if (posicionId) {
        evaluacionesParams.posicion_id = posicionId;
      }

      if (area?.fase2_activa) {
        evaluacionesParams.usuario_id = user.id;
        if (verTodasOverride ?? verTodasTechs) {
          evaluacionesParams.ver_todas_techs = true;
        }
      }

      const [evaluaciones, evaluacionesGuardadasList] = await Promise.all([
        apiService.getEvaluaciones(evaluacionesParams),
        apiService.getEvaluacionesUsuarioAll({
          usuario: user.id,
          ...(posicionId != null ? { posicion_id: posicionId } : {}),
        }),
      ]);

      const guardadasMap: Record<number, EvaluacionUsuario> = {};
      (evaluacionesGuardadasList || []).forEach((registro) => {
        guardadasMap[registro.evaluacion] = registro;
      });

      const ordenadas = [...(evaluaciones || [])].sort((a, b) =>
        compararEvaluacionesOrdenListaAsignadas(a, b, guardadasMap)
      );
      setEvaluacionesUsuario(ordenadas);
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

      if (area?.fase2_activa && areaId) {
        try {
          const indicador = await apiService.getIndicadorN4(user.id, areaId);
          setIndicadorN4(indicador);
        } catch {
          setIndicadorN4(null);
        }
        try {
          const pendientes = await apiService.getExamenesNivel({
            usuario: user.id,
            area_id: areaId,
            pendiente: true,
          });
          setExamenPendiente(pendientes[0] ?? null);
        } catch {
          setExamenPendiente(null);
        }
      } else {
        setIndicadorN4(null);
        setExamenPendiente(null);
      }
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
    if (evaluacionUsuarioIdParaAbrir != null) {
      return;
    }
    if (inicializacionRegularListaRef.current) {
      return;
    }

    const initRegular = async () => {
      try {
        const usuarioDetalle = await apiService.getCurrentUser();
        const areasData = await apiService.getAreas({ is_active: true });
        setAreas(areasData);
        const areaContexto = resolverAreaDeUsuario(usuarioDetalle as User, areasData);
        if (areaContexto) {
          setSelectedArea(areaContexto);
        }
        const posicionId = posicionPrincipalId(usuarioDetalle as User);
        const posicionContexto =
          posicionId != null
            ? areaContexto?.posiciones?.find((p) => p.id === posicionId)
            : undefined;
        if (posicionContexto) {
          setSelectedPosicion(posicionContexto);
        }
        setSelectedUser(usuarioDetalle as User);
        await loadEvaluacionesUsuario(usuarioDetalle as User, {
          area: areaContexto,
          posicionId,
        });
        setEvaluacionModoLectura(true);
        setCurrentView('usuario-detalle');
        inicializacionRegularListaRef.current = true;
      } catch (initError) {
        console.error('Error al cargar evaluaciones del usuario', initError);
        showError('No se pudieron cargar tus evaluaciones');
      }
    };

    initRegular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegularUser, evaluacionUsuarioIdParaAbrir]);

  const iniciarEvaluacion = async (evaluacion: any) => {
    const mensajeBloqueo = textoBloqueoCandadoFase2(
      evaluacion,
      evaluacionesUsuario,
      evaluacionesUsuarioGuardadas,
      selectedArea?.fase2_activa,
      selectedUser?.tecnologia_ids
    );
    if (mensajeBloqueo) {
      showError(mensajeBloqueo);
      return;
    }
    try {
      setLoading(true);
      setModoSoloFirmasEntrenador(false);
      setEvaluacionActual(evaluacion);
      setEvaluacionModoLectura(isRegularUser || isVisor);
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
      const resultadosCarga = supervisoresData.results ?? [];
      const particion = particionarUsuariosSupervision(resultadosCarga);
      setSupervisores(particion.supervisores);
      setInstructores(particion.instructores);
      setUsuariosFirmasRolesMixtos(particion.rolesMixtosFirmas);
      
      // Supervisor por defecto: plantilla/evaluación; si no, primer supervisor del grupo de navegación o del primer grupo del área que tenga
      let supervisorPorDefecto: number | null = null;
      if (evaluacion.supervisor) {
        supervisorPorDefecto = evaluacion.supervisor;
      } else if (!isRegularUser && selectedArea?.grupos?.length) {
        const grupoNav =
          selectedGrupo &&
          selectedArea.grupos.find((g: { id: number }) => g.id === selectedGrupo.id);
        const supsGrupoNav = grupoNav?.supervisores?.length ? grupoNav.supervisores : null;
        const supsFallback = selectedArea.grupos.find(
          (g: { supervisores?: { id: number }[] }) => g.supervisores?.length
        )?.supervisores;
        const sups = supsGrupoNav ?? supsFallback;
        if (sups?.[0]?.id) {
          supervisorPorDefecto = sups[0].id;
        }
      }
      const idsSupervisorRol = new Set(
        resultadosCarga.filter(esUsuarioSupervisor).map((u: User) => u.id)
      );
      if (supervisorPorDefecto != null && idsSupervisorRol.has(supervisorPorDefecto)) {
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
      snapshotResultadosBaseline(resultadosIniciales);
      
      setCurrentView('usuario-evaluacion');
    } catch (error: any) {
      console.error('Error iniciando evaluación:', error);
      showError('Error al iniciar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre una evaluación que ya tiene registro guardado (ej. Pendiente de firmas) para que
   * el supervisor o firmante pueda firmar. Carga evaluacionGuardadaInfo para poder enviar
   * las firmas al backend.
   */
  const abrirEvaluacionParaFirmar = async (evaluacion: any, detalle: EvaluacionUsuario) => {
    try {
      setLoading(true);
      setModoSoloFirmasEntrenador(false);
      abriendoParaEditarAdminRef.current = false;
      setEvaluacionActual(evaluacion);
      setEvaluacionModoLectura(isRegularUser || isVisor);
      setEvaluacionGuardadaInfo(detalle);
      setSupervisorSeleccionado(detalle.supervisor ?? null);

      const nivelEvaluacion =
        evaluacion.nivel ??
        evaluacion.nivel_posicion_data?.nivel ??
        null;
      if (typeof nivelEvaluacion === 'number') {
        setNivelSeleccionado(nivelEvaluacion);
      }

      const resultadosConsolidados =
        evaluacion.puntos_evaluacion?.map((punto: any) => {
          const resultado = (detalle.resultados_puntos ?? []).find(
            (registro) => registro.punto_evaluacion === punto.id
          );
          return {
            punto_evaluacion: punto.id,
            puntuacion: resultado?.puntuacion ?? null,
            observaciones: resultado?.observaciones ?? ''
          };
        }) ?? [];
      setResultadosEvaluacion(resultadosConsolidados);

      const rolesSupervision = 'ADMIN,ENTRENADOR,SUPERVISOR';
      const supervisoresData = await apiService.getUsers({
        role: rolesSupervision,
        is_active: true
      });
      const particion = particionarUsuariosSupervision(supervisoresData.results ?? []);
      setSupervisores(particion.supervisores);
      setInstructores(particion.instructores);
      setUsuariosFirmasRolesMixtos(particion.rolesMixtosFirmas);

      setCurrentView('usuario-evaluacion');
    } catch (error: any) {
      console.error('Error abriendo evaluación para firmar:', error);
      showError('Error al abrir la evaluación');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Entrenador: abre la evaluación en solo lectura para puntajes y permite firmar solo slots no empleado
   * (tablet/PC), sin pasar por "Editar" completo.
   */
  const abrirSoloFirmasEntrenador = async (evaluacion: any, detalle: EvaluacionUsuario) => {
    try {
      setLoading(true);
      setModoSoloFirmasEntrenador(true);
      abriendoParaEditarAdminRef.current = false;
      setEvaluacionActual(evaluacion);
      setEvaluacionModoLectura(true);
      setEvaluacionGuardadaInfo(detalle);
      setSupervisorSeleccionado(detalle.supervisor ?? null);

      const nivelEvaluacion =
        evaluacion.nivel ?? evaluacion.nivel_posicion_data?.nivel ?? null;
      if (typeof nivelEvaluacion === 'number') {
        setNivelSeleccionado(nivelEvaluacion);
      }

      const resultadosConsolidados =
        evaluacion.puntos_evaluacion?.map((punto: any) => {
          const resultado = (detalle.resultados_puntos ?? []).find(
            (registro: { punto_evaluacion: number }) => registro.punto_evaluacion === punto.id
          );
          return {
            punto_evaluacion: punto.id,
            puntuacion: resultado?.puntuacion ?? null,
            observaciones: resultado?.observaciones ?? '',
          };
        }) ?? [];
      setResultadosEvaluacion(resultadosConsolidados);

      const supervisoresData = await apiService.getUsers({
        role: 'ADMIN,ENTRENADOR,SUPERVISOR',
        is_active: true,
      });
      const particion = particionarUsuariosSupervision(supervisoresData.results ?? []);
      setSupervisores(particion.supervisores);
      setInstructores(particion.instructores);
      setUsuariosFirmasRolesMixtos(particion.rolesMixtosFirmas);

      setCurrentView('usuario-evaluacion');
    } catch (error: unknown) {
      console.error('Error al abrir solo firmas:', error);
      showError('No se pudo abrir la firma de la evaluación');
      setModoSoloFirmasEntrenador(false);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = effectiveUserRole === 'ADMIN';
  const isEntrenador = effectiveUserRole === 'ENTRENADOR';
  const isSupervisorRol = effectiveUserRole === 'SUPERVISOR';
  const puedeRegistrarNuevoIntento =
    (isAdmin || isSupervisorOrEntrenador) && !isVisor && !isRegularUser;

  const iniciarNuevoIntentoEvaluacion = async (evaluacion: any, detalle: EvaluacionUsuario) => {
    if (!selectedUser || !evaluacion) {
      return;
    }
    const mensajeBloqueo = textoBloqueoCandadoFase2(
      evaluacion,
      evaluacionesUsuario,
      evaluacionesUsuarioGuardadas,
      selectedArea?.fase2_activa,
      selectedUser.tecnologia_ids
    );
    if (mensajeBloqueo) {
      showError(mensajeBloqueo);
      return;
    }
    try {
      setLoading(true);
      const actualizado = await apiService.nuevoIntentoEvaluacionUsuario(detalle.id);
      setEvaluacionesUsuarioGuardadas((prev) => ({
        ...prev,
        [evaluacion.id]: actualizado,
      }));
      setEvaluacionActual(evaluacion);
      setEvaluacionGuardadaInfo(actualizado);
      setEvaluacionModoLectura(false);
      setModoSoloFirmasEntrenador(false);
      setSupervisorSeleccionado(actualizado.supervisor ?? null);
      const nivelEvaluacion =
        evaluacion.nivel ?? evaluacion.nivel_posicion_data?.nivel ?? null;
      if (typeof nivelEvaluacion === 'number') {
        setNivelSeleccionado(nivelEvaluacion);
      }
      const resultadosIniciales =
        evaluacion.puntos_evaluacion?.map((punto: any) => ({
          punto_evaluacion: punto.id,
          puntuacion: null,
          observaciones: '',
        })) ?? [];
      setResultadosEvaluacion(resultadosIniciales);
      snapshotResultadosBaseline(resultadosIniciales);
      setCurrentView('usuario-evaluacion');
      showSuccess(
        'Nuevo intento: se invalidaron las firmas del intento anterior. Completa la evaluación de nuevo.'
      );
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'No se pudo iniciar un nuevo intento.');
    } finally {
      setLoading(false);
    }
  };

  const borrarAvanceEvaluacion = async (evaluacion: { nombre?: string }, detalle: EvaluacionUsuario) => {
    const nombre = evaluacion?.nombre || 'esta evaluación';
    const ok = await confirm({
      title: 'Eliminar avance',
      message: `¿Eliminar el avance de "${nombre}"?\n\nSe borrarán las puntuaciones y las firmas capturadas. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar avance',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      setLoading(true);
      await apiService.reiniciarAvanceEvaluacionUsuario(detalle.id);
      if (selectedUser) {
        await loadEvaluacionesUsuario(selectedUser);
      }
      if (selectedPosicion?.id) {
        await loadProgresosNivel(selectedPosicion.id);
      }
      showSuccess('Avance de la evaluación reiniciado.');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'No se pudo reiniciar el avance de la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const verEvaluacionGuardada = async (evaluacion: any, detalle: EvaluacionUsuario) => {
    setModoSoloFirmasEntrenador(false);
    abriendoParaEditarAdminRef.current = false;
    setEvaluacionActual(evaluacion);
    setEvaluacionModoLectura(true);
    setSupervisorSeleccionado(detalle.supervisor || null);

    const nivelEvaluacion =
      evaluacion.nivel ??
      evaluacion.nivel_posicion_data?.nivel ??
      null;
    if (typeof nivelEvaluacion === 'number') {
      setNivelSeleccionado(nivelEvaluacion);
    }

    let detalleActualizado: EvaluacionUsuario = detalle;
    try {
      setLoading(true);
      detalleActualizado = await apiService.getEvaluacionUsuario(detalle.id);
      setEvaluacionesUsuarioGuardadas((prev) => ({
        ...prev,
        [evaluacion.id]: detalleActualizado,
      }));
    } catch (e) {
      console.error('Error al cargar el detalle de la evaluación', e);
      setEvaluacionGuardadaInfo(detalle);
      const resultadosFallback =
        evaluacion.puntos_evaluacion?.map((punto: any) => {
          const resultado = (detalle.resultados_puntos ?? []).find(
            (registro) => registro.punto_evaluacion === punto.id
          );
          return {
            punto_evaluacion: punto.id,
            puntuacion: resultado?.puntuacion ?? null,
            observaciones: resultado?.observaciones ?? '',
          };
        }) ?? [];
      setResultadosEvaluacion(resultadosFallback);
      setCurrentView('usuario-evaluacion');
      return;
    } finally {
      setLoading(false);
    }

    setEvaluacionGuardadaInfo(detalleActualizado);

    const resultadosConsolidados =
      evaluacion.puntos_evaluacion?.map((punto: any) => {
        const resultado = (detalleActualizado.resultados_puntos ?? []).find(
          (registro) => registro.punto_evaluacion === punto.id
        );
        return {
          punto_evaluacion: punto.id,
          puntuacion: resultado?.puntuacion ?? null,
          observaciones: resultado?.observaciones ?? '',
        };
      }) ?? [];

    setResultadosEvaluacion(resultadosConsolidados);
    snapshotResultadosBaseline(resultadosConsolidados);
    setCurrentView('usuario-evaluacion');
  };

  const editarEvaluacionGuardada = (evaluacion: any, detalle: EvaluacionUsuario | undefined) => {
    if (!detalle || !evaluacion) return;
    setModoSoloFirmasEntrenador(false);
    abriendoParaEditarAdminRef.current = true;
    editandoEvaluacionComoAdminRef.current = true;
    setEvaluacionActual(evaluacion);
    setEvaluacionModoLectura(false);
    setEvaluacionGuardadaInfo(detalle);
    setSupervisorSeleccionado(detalle.supervisor ?? null);

    const nivelEvaluacion =
      evaluacion.nivel ??
      evaluacion.nivel_posicion_data?.nivel ??
      null;
    if (typeof nivelEvaluacion === 'number') {
      setNivelSeleccionado(nivelEvaluacion);
    }

    const resultadosConsolidados =
      evaluacion.puntos_evaluacion?.map((punto: any) => {
        const resultado = (detalle.resultados_puntos ?? []).find(
          (registro) => registro.punto_evaluacion === punto.id
        );
        return {
          punto_evaluacion: punto.id,
          puntuacion: resultado?.puntuacion ?? null,
          observaciones: resultado?.observaciones ?? ''
        };
      }) ?? [];

    setResultadosEvaluacion(resultadosConsolidados);
    snapshotResultadosBaseline(resultadosConsolidados);
    setCurrentView('usuario-evaluacion');
  };

  const generarPdfEvaluacionesNivel = async (): Promise<{ doc: import('jspdf').jsPDF; lista: any[] } | null> => {
    if (!selectedUser) return null;
    const nivel = nivelSeleccionado ?? null;
    const lista = evaluacionesUsuario
      .filter((evaluacion: any) => {
        const n = evaluacion.nivel_posicion_data?.nivel ?? evaluacion.nivel ?? null;
        return n === nivel;
      })
      .sort((a, b) => compararEvaluacionesOrdenListaAsignadas(a, b, evaluacionesUsuarioGuardadas));
    if (lista.length === 0) return null;

    const viewAnterior = currentView;
    const doc = await crearDocPdfA4();

    for (let i = 0; i < lista.length; i++) {
      const evaluacion = lista[i];
      const detalle = evaluacionesUsuarioGuardadas[evaluacion.id];

      setEvaluacionActual(evaluacion);
      setEvaluacionModoLectura(true);
      setEvaluacionGuardadaInfo(detalle ?? null);
      setSupervisorSeleccionado(detalle?.supervisor ?? null);

      const nivelEval = evaluacion.nivel ?? evaluacion.nivel_posicion_data?.nivel ?? null;
      if (typeof nivelEval === 'number') {
        setNivelSeleccionado(nivelEval);
      }

      const resultadosConsolidados = evaluacion.puntos_evaluacion
        ? evaluacion.puntos_evaluacion.map((punto: any) => {
            const resultado = detalle?.resultados_puntos?.find(
              (r: any) => r.punto_evaluacion === punto.id
            );
            return {
              punto_evaluacion: punto.id,
              puntuacion: resultado?.puntuacion ?? null,
              observaciones: resultado?.observaciones ?? '',
            };
          })
        : [];
      setResultadosEvaluacion(resultadosConsolidados);
      setCurrentView('usuario-evaluacion');

      await new Promise((r) => setTimeout(r, 550));

      const el = printContentRef.current;
      if (!el) continue;
      try {
        const { imgData, width, height } = await capturarElementoComoImagen(el);
        if (i > 0) doc.addPage();
        agregarImagenAjustadaAPagina(doc, imgData, width, height);
      } catch (err) {
        console.error('Error capturando evaluación para PDF', err);
      }
    }

    setCurrentView(viewAnterior);
    return { doc, lista };
  };

  const handlePrintEvaluaciones = async () => {
    setDescargandoPdf(true);
    try {
      const result = await generarPdfEvaluacionesNivel();
      if (!result) {
        showError('No hay evaluaciones en este nivel para imprimir.');
        return;
      }
      const blob = result.doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWin = window.open('', '_blank', 'noopener,noreferrer');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(`
          <!DOCTYPE html>
          <html><head><title>Imprimir evaluaciones</title></head>
          <body style="margin:0;">
            <iframe id="pdfFrame" src="${url}" style="width:100%;height:100vh;border:none;" title="PDF"></iframe>
          </body></html>
        `);
        printWin.document.close();
        const iframe = printWin.document.getElementById('pdfFrame');
        let printed = false;
        const doPrint = () => {
          if (printed) return;
          printed = true;
          try {
            printWin.print();
          } finally {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        };
        if (iframe) {
          iframe.onload = () => setTimeout(doPrint, 600);
        }
        setTimeout(doPrint, 2500);
        showSuccess(`Listo para imprimir: ${result.lista.length} evaluación(es).`);
      } else {
        URL.revokeObjectURL(url);
        showError('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio e intenta de nuevo, o descarga el PDF y imprímelo desde ahí.');
      }
    } catch (err) {
      console.error('Error al abrir impresión', err);
      showError('No se pudo abrir el diálogo de impresión.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const handleDownloadEvaluaciones = async () => {
    setDescargandoPdf(true);
    try {
      const result = await generarPdfEvaluacionesNivel();
      if (!result) {
        showError('No hay evaluaciones en este nivel para descargar.');
        return;
      }
      const nivel = nivelSeleccionado ?? null;
      const nivelTitulo = nivel != null ? `_Nivel_${nivel}` : '';
      const fileName = `Evaluaciones_${selectedUser!.full_name.replace(/\s+/g, '_')}${nivelTitulo}_${new Date().toISOString().slice(0, 10)}.pdf`;
      result.doc.save(fileName);
      showSuccess(`PDF descargado: ${result.lista.length} evaluación(es).`);
    } catch (err) {
      console.error('Error al descargar PDF', err);
      showError('No se pudo descargar el PDF.');
    } finally {
      setDescargandoPdf(false);
    }
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
        if (usuarioFirmanteId == null) {
          return null;
        }
        const firmante = buscarUsuarioEnRolesSupervision(
          usuarioFirmanteId,
          usuariosFirmasRolesMixtos,
          supervisores,
          instructores
        );
        return firmante?.full_name || firmante?.username || null;
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

        isDrawingRef.current = false;
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

      isDrawingRef.current = false;
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

    const puntosSinPuntuar = resultadosEvaluacion.filter(r => r.puntuacion === null);
    if (puntosSinPuntuar.length > 0) {
      showError('Por favor evalúa todos los puntos de evaluación');
      return;
    }

    const minimoEv = evaluacionActual.minimo_aprobatorio ?? 70;
    const estadoEu = (evaluacionGuardadaInfo?.estado || '').toLowerCase();
    const aprobadaGuardada = evaluacionCumpleMinimo(minimoEv, evaluacionGuardadaInfo?.resultado_final);
    const permiteActualizarSinSerAdmin =
      Boolean(evaluacionGuardadaInfo) &&
      !aprobadaGuardada &&
      (estadoEu === 'en_progreso' || estadoEu === 'pendiente');

    const esEdicionAdmin = isAdmin && evaluacionGuardadaInfo != null;
    if (
      evaluacionesUsuarioGuardadas[evaluacionActual.id] &&
      !esEdicionAdmin &&
      !permiteActualizarSinSerAdmin
    ) {
      showError('Esta evaluación ya tiene un resultado guardado. Utiliza el botón "Ver" para consultarlo.');
      return;
    }

    try {
      setLoading(true);
      if (esEdicionAdmin) {
        const divisor = evaluacionActual.formula_divisor ?? (evaluacionActual.puntos_evaluacion?.length || 1);
        const multiplicador = evaluacionActual.formula_multiplicador ?? 100;
        const puntosObtenidos = resultadosEvaluacion.reduce((sum, r) => sum + (r.puntuacion || 0), 0);
        const resultadoFinal = divisor > 0 ? Math.round((puntosObtenidos / divisor) * multiplicador * 100) / 100 : null;
        await apiService.updateEvaluacionUsuario(evaluacionGuardadaInfo!.id, {
          supervisor: supervisorSeleccionado,
          resultado_final: resultadoFinal ?? undefined,
          resultados_puntos: resultadosEvaluacion.map((r) => ({
            punto_evaluacion: r.punto_evaluacion,
            puntuacion: r.puntuacion,
            observaciones: r.observaciones || ''
          }))
        });
        showSuccess('Evaluación actualizada correctamente');
      } else if (permiteActualizarSinSerAdmin && evaluacionGuardadaInfo) {
        const divisor = evaluacionActual.formula_divisor ?? (evaluacionActual.puntos_evaluacion?.length || 1);
        const multiplicador = evaluacionActual.formula_multiplicador ?? 100;
        const puntosObtenidos = resultadosEvaluacion.reduce((sum, r) => sum + (r.puntuacion || 0), 0);
        const resultadoFinal = divisor > 0 ? Math.round((puntosObtenidos / divisor) * multiplicador * 100) / 100 : null;
        await apiService.updateEvaluacionUsuario(evaluacionGuardadaInfo.id, {
          supervisor: supervisorSeleccionado,
          estado: 'completada',
          fecha_completada: new Date().toISOString(),
          resultado_final: resultadoFinal ?? undefined,
          resultados_puntos: resultadosEvaluacion.map((r) => ({
            punto_evaluacion: r.punto_evaluacion,
            puntuacion: r.puntuacion,
            observaciones: r.observaciones || ''
          }))
        });
        await registrarFirmasPendientes(evaluacionGuardadaInfo.id);
        showSuccess('Evaluación guardada exitosamente');
      } else {
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
      }

      if (selectedPosicion?.id) {
        await loadProgresosNivel(selectedPosicion.id);
      } else {
        await loadProgresosNivel();
      }
      await loadEvaluacionesUsuario(selectedUser);
      setCurrentView('usuario-detalle');
    } catch (error: any) {
      console.error('Error guardando evaluación:', error);
      showError(
        (Array.isArray(error?.errorData?.detail)
          ? error.errorData.detail[0]
          : error?.errorData?.detail) ||
          error.message ||
          'Error al guardar la evaluación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCrearListaAsistencia = async () => {
    if (isVisor) {
      showError('No tienes permisos para crear listas de asistencia.');
      return;
    }
    if (!selectedArea) {
      showError('No hay área seleccionada.');
      return;
    }
    try {
      setLoading(true);
      await loadUsuariosRegularesPorArea(selectedArea);
      setFormData((prev) => ({ ...prev, area: selectedArea.id }));
      setIsEditing(false);
      setEditingListaId(null);
      setCurrentView('lista-asistencia-form');
    } catch (err) {
      console.error('Error al cargar usuarios para la lista de asistencia:', err);
      showError('No se pudieron cargar los usuarios del área.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarLista = async (lista: ListaAsistencia) => {
    if (isVisor) {
      showError('No tienes permisos para editar listas de asistencia.');
      return;
    }
    const areaParaUsuarios =
      selectedArea?.id === lista.area ? selectedArea : areas.find((a) => a.id === lista.area);
    if (!areaParaUsuarios) {
      showError('No se encontró el área de esta lista.');
      return;
    }
    try {
      setLoading(true);
      const regulares = await loadUsuariosRegularesPorArea(areaParaUsuarios);
      setFormData({
        nombre: lista.nombre,
        supervisor: lista.supervisor,
        instructor: lista.instructor,
        usuarios_regulares: lista.usuarios_regulares,
        area: lista.area,
        is_active: lista.is_active,
      });
      setIsEditing(true);
      setEditingListaId(lista.id);
      setCurrentView('lista-asistencia-form');

      const usuariosAsignados = regulares.filter((user) =>
        lista.usuarios_regulares.includes(user.id)
      );
      setUsuariosSeleccionados(usuariosAsignados);

      const fechasIniciales: Record<number, string> = {};
      if (lista.usuarios_fechas) {
        Object.keys(lista.usuarios_fechas).forEach((usuarioIdStr) => {
          const usuarioId = parseInt(usuarioIdStr, 10);
          fechasIniciales[usuarioId] = lista.usuarios_fechas![usuarioIdStr];
        });
      }
      usuariosAsignados.forEach((user) => {
        if (!fechasIniciales[user.id]) {
          fechasIniciales[user.id] = new Date().toISOString().split('T')[0];
        }
      });
      setFechasUsuarios(fechasIniciales);
    } catch (err) {
      console.error('Error al cargar usuarios para editar lista:', err);
      showError('No se pudieron cargar los usuarios del área.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = async () => {
    if (isRegularUser) {
      if (currentView === 'usuario-evaluacion') {
        if (!(await confirmarSalidaSiHayCambios())) return;
        if (firmaDesdeNotificaciones && onVolverNotificaciones) {
          onVolverNotificaciones();
          return;
        }
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
        if (areaUsaNavegacionPorTecnologia(selectedArea)) {
          setCurrentView('grupos');
          setSelectedGrupo(null);
        } else {
          setCurrentView('posiciones');
          setSelectedPosicion(null);
        }
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
      case 'usuario-evaluacion': {
        if (!(await confirmarSalidaSiHayCambios())) return;
        if (firmaDesdeNotificaciones && onVolverNotificaciones) {
          onVolverNotificaciones();
          return;
        }
        editandoEvaluacionComoAdminRef.current = false;
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
      }
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
        const navF2 = areaUsaNavegacionPorTecnologia(selectedArea);
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
              if (navF2) {
                setCurrentView('usuarios');
              } else {
                setCurrentView('posiciones');
              }
              setSelectedPosicion(null);
              setSelectedUser(null);
            },
            isClickable: navF2
              ? currentView !== 'usuarios'
              : currentView !== 'posiciones'
          });
        }

        if (!navF2) {
          items.push({
            label: 'Posiciones',
            onClick: () => {
              setCurrentView('posiciones');
              setSelectedUser(null);
            },
            isClickable: currentView !== 'posiciones'
          });
        }

        if ((navF2 || selectedPosicion) && (currentView === 'usuarios' || currentView === 'usuario-detalle' || currentView === 'usuario-evaluacion')) {
          if (!navF2 && selectedPosicion) {
            items.push({
              label: selectedPosicion.name,
              onClick: () => {
                setCurrentView('usuarios');
                setSelectedUser(null);
              },
              isClickable: currentView !== 'usuarios'
            });
          }

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
                void (async () => {
                  if (currentView === 'usuario-evaluacion') {
                    if (!(await confirmarSalidaSiHayCambios())) return;
                    if (firmaDesdeNotificaciones && onVolverNotificaciones) {
                      onVolverNotificaciones();
                      return;
                    }
                  }
                  setCurrentView('usuario-detalle');
                  setEvaluacionActual(null);
                  setResultadosEvaluacion([]);
                  setSupervisorSeleccionado(null);
                  setEvaluacionModoLectura(true);
                  setSignatures({});
                  setHasSignature({});
                  setFirmasUsuario({});
                  setFirmasPendientes({});
                })();
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

  const evaluacionesTopbarOverride = useMemo(() => {
    if (isRegularUser) {
      if (
        currentView === 'usuario-detalle' ||
        currentView === 'usuario-evaluacion'
      ) {
        return { hideHeader: true };
      }
      return null;
    }

    if (
      currentView === 'usuario-detalle' ||
      currentView === 'usuario-evaluacion'
    ) {
      return { hideHeader: true };
    }

    if (currentView === 'areas') {
      return null;
    }

    return {
      breadcrumb: getBreadcrumbItems().map(({ label, onClick, isClickable }) => ({
        label,
        onClick,
        isClickable,
      })),
      onBack: goBack,
      backLabel: 'Volver',
    };
  }, [
    isRegularUser,
    currentView,
    selectedArea?.id,
    selectedArea?.name,
    selectedGrupo?.id,
    selectedGrupo?.name,
    selectedPosicion?.id,
    selectedPosicion?.name,
    selectedUser?.id,
    selectedUser?.full_name,
    onboardingUsuarioId,
    firmaDesdeNotificaciones,
  ]);

  useTopbarOverride(evaluacionesTopbarOverride, [
    evaluacionesTopbarOverride,
  ]);

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
        <>
          {areasProduccion.length > 0 && (
            <div className="areas-tipo-block">
              <h3 className="areas-tipo-title">Producción</h3>
              <div className="areas-grid">
                {areasProduccion.map((area) => (
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
          )}
          {areasSoporte.length > 0 && (
            <div className="areas-tipo-block">
              <h3 className="areas-tipo-title">Soporte</h3>
              <div className="areas-grid">
                {areasSoporte.map((area) => (
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
          )}
        </>
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
          <p>
            {areaUsaNavegacionPorTecnologia(selectedArea)
              ? 'Selecciona un grupo para ver empleados (catálogo por tecnología asignada)'
              : 'Selecciona un grupo para ver sus posiciones o ONBOARDING para listas de asistencia'}
          </p>
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
          <h2>
            Usuarios - {selectedArea?.name} &gt; {selectedGrupo?.name}
            {selectedPosicion?.name ? ` > ${selectedPosicion.name}` : ''}
          </h2>
          <p>
            {areaUsaNavegacionPorTecnologia(selectedArea)
              ? 'Empleados del grupo; el catálogo se filtra por tecnologías asignadas'
              : 'Usuarios asignados a esta posición'}
          </p>
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
                  {user.fecha_ingreso && <p className="fecha-ingreso">{formatFechaIngreso(user.fecha_ingreso)}</p>}
                  {(!user.areas || (Array.isArray(user.areas) && user.areas.length === 0)) && (
                    <p className="usuario-aviso">Sin área asignada</p>
                  )}
                  {!user.posicion && !selectedPosicion && (
                    <p className="usuario-aviso">Sin posición asignada</p>
                  )}
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
                    return (
                      <div key={nivel} className={clases}>
                        <span className="cuadro-nivel-numero">{nivel}</span>
                      </div>
                    );
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
                {filteredUsuarios.length > 0 && nivelFiltroUsuarios !== 'todos' ? (
                  <>
                    <h3>Ningún usuario con el nivel filtrado</h3>
                    <p>
                      Hay {filteredUsuarios.length} usuario(s) en esta ubicación, pero ninguno
                      tiene completado el Nivel {nivelFiltroUsuarios}. Prueba con «Todos los niveles».
                    </p>
                  </>
                ) : searchTerm.trim() ? (
                  <>
                    <h3>Sin resultados de búsqueda</h3>
                    <p>No hay usuarios que coincidan con «{searchTerm.trim()}» en esta ubicación.</p>
                  </>
                ) : (
                  <>
                    <h3>No hay usuarios asignados</h3>
                    <p>No se encontraron usuarios asignados para esta área, grupo y posición</p>
                  </>
                )}
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

    const evaluacionesDelNivel = evaluacionesUsuario
      .filter((evaluacion) => {
        if (nivelActual === null) {
          return true;
        }
        const nivelEvaluacion =
          evaluacion.nivel_posicion_data?.nivel ??
          evaluacion.nivel ??
          null;
        return nivelEvaluacion === nivelActual;
      })
      .sort((a, b) => compararEvaluacionesOrdenListaAsignadas(a, b, evaluacionesUsuarioGuardadas));

    const gruposEvaluacionesNivel = agruparEvaluacionesPorTecnologia(
      evaluacionesDelNivel,
      Boolean(selectedArea?.fase2_activa)
    );
    const filtroGrupoEfectivo =
      filtroGrupoEval === 'todas' ||
      gruposEvaluacionesNivel.some((grupo) => grupo.clave === filtroGrupoEval)
        ? filtroGrupoEval
        : 'todas';
    const gruposEvaluacionesFiltrados =
      filtroGrupoEfectivo === 'todas'
        ? gruposEvaluacionesNivel
        : gruposEvaluacionesNivel.filter((grupo) => grupo.clave === filtroGrupoEfectivo);
    const mostrarFiltrosTech =
      Boolean(selectedArea?.fase2_activa) && gruposEvaluacionesNivel.length > 0;

    const posicionVistaDetalle =
      selectedPosicion?.id ?? selectedUser.posicion ?? null;
    const nivelesBackendMismaPosicion =
      posicionVistaDetalle == null ||
      selectedUser.posicion == null ||
      Number(selectedUser.posicion) === Number(posicionVistaDetalle);

    const isNivelCompleto = (nivel: number): boolean => {
      if (!selectedUser) {
        return false;
      }

      // Resumen calculado al cargar evaluaciones para la posición del breadcrumb
      if (Object.prototype.hasOwnProperty.call(nivelesCompletos, nivel)) {
        return Boolean(nivelesCompletos[nivel]);
      }

      const resumenUsuario = nivelesCompletosPorUsuario[selectedUser.id];
      if (resumenUsuario && resumenUsuario[nivel] !== undefined) {
        return Boolean(resumenUsuario[nivel]);
      }

      // niveles_completos del usuario es solo para la posición principal; no usarlo
      // si estamos viendo otra posición asignada (varias posiciones).
      if (
        nivelesBackendMismaPosicion &&
        selectedUser.niveles_completos &&
        selectedUser.niveles_completos[nivel] !== undefined
      ) {
        return Boolean(selectedUser.niveles_completos[nivel]);
      }

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

          const estadoFirmasUsuario = (registro.estado_firmas_usuario || '').toLowerCase();
          const firmasCompletasUsuario = estadoFirmasUsuario === 'firmas_completas';
          const minimo = evaluacion.minimo_aprobatorio ?? 70;
          const aprobada = evaluacionCumpleMinimo(minimo, registro.resultado_final);
          return firmasCompletasUsuario && aprobada;
        });
      }

      // Último fallback: usar resumenActual
      return Boolean(resumenActual[nivel]);
    };

    return (
      <div className="evaluaciones-section usuario-detalle-vista" ref={printContentRef}>
        {/* Barra planta: identidad + nivel (siempre visible) */}
        <header className="usuario-barra-planta">
          <div className="usuario-barra-planta__identidad">
            {!isRegularUser && (
              <button
                type="button"
                className="btn-volver-icono"
                onClick={goBack}
                aria-label="Volver"
                title="Volver"
              >
                <FaArrowLeft aria-hidden />
              </button>
            )}
            <h2 className="usuario-barra-planta__nombre">
              {selectedUser.full_name}
              <span className="usuario-barra-planta__emp">
                #{selectedUser.numero_empleado || selectedUser.id}
              </span>
            </h2>
            <div className="usuario-barra-planta__tools">
              <button
                type="button"
                className={`btn-barra-secundario${panelDetallePersona ? ' is-active' : ''}`}
                aria-expanded={panelDetallePersona}
                onClick={() => {
                  setPanelDetallePersona((v) => !v);
                  setPanelOpcionesLista(false);
                }}
              >
                Detalle
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={handleDownloadEvaluaciones}
                title="Descargar evaluaciones"
                aria-label="Descargar evaluaciones"
              >
                <FaDownload />
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={handlePrintEvaluaciones}
                title="Imprimir"
                aria-label="Imprimir"
              >
                <FaPrint />
              </button>
            </div>
          </div>
          <div className="usuario-barra-planta__nivel">
            <button
              type="button"
              className="nivel-arrow"
              onClick={() => cambiarNivel('anterior')}
              disabled={!hayNivelAnterior}
              aria-label="Nivel anterior"
            >
              <FaChevronLeft />
            </button>
            <div className="status-grid" aria-hidden>
              {[4, 1, 3, 2].map((nivel) => (
                <div
                  key={nivel}
                  className={`status-item nivel-${nivel} ${
                    isNivelCompleto(nivel) ? 'completed' : ''
                  } ${nivelActual === nivel ? 'active' : ''}`}
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
            <div className="nivel-indicador">
              {nivelActual ? `Nivel ${nivelActual}` : 'Sin nivel'}
            </div>
          </div>
        </header>

        {/* Detalle poco frecuente: foto, onboarding, fecha, N4 */}
        {panelDetallePersona && (
          <div className="usuario-detalle-panel">
            <div className="usuario-detalle-panel__row">
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
              <div className="usuario-detalle-panel__meta">
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
                {selectedArea?.fase2_activa && indicadorN4 && (
                  <p className="indicador-n4-resumen">
                    N4 en tecnologías asignadas:{' '}
                    {indicadorN4.basicas}/{indicadorN4.requeridas_basicas} básicas
                    {' · '}
                    {indicadorN4.complejas}/{indicadorN4.requeridas_complejas} complejas
                    {indicadorN4.cumple ? ' (cumplido)' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="usuario-info-content">
          <div className="info-section">
            <div className="evaluaciones-toolbar">
              <h3 className="evaluaciones-toolbar__titulo">Evaluaciones</h3>
              {(selectedArea?.fase2_activa ||
                (!isRegularUser && (isAdmin || isEntrenador || isSupervisorRol))) && (
                <div className="evaluaciones-toolbar__mas">
                  <button
                    type="button"
                    className={`btn-more btn-touch${panelOpcionesLista ? ' is-open' : ''}`}
                    aria-expanded={panelOpcionesLista}
                    aria-haspopup="true"
                    aria-label="Opciones de lista"
                    title="Opciones"
                    onClick={() => {
                      setPanelOpcionesLista((v) => !v);
                      setPanelDetallePersona(false);
                    }}
                  >
                    <FaEllipsisV aria-hidden />
                  </button>
                </div>
              )}
              {mostrarFiltrosTech && (
                <div
                  className="evaluaciones-filtros-tech"
                  role="tablist"
                  aria-label="Filtrar por tecnología"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filtroGrupoEfectivo === 'todas'}
                    className={`filtro-tech-chip${filtroGrupoEfectivo === 'todas' ? ' is-active' : ''}`}
                    onClick={() => setFiltroGrupoEval('todas')}
                  >
                    Todas
                  </button>
                  {gruposEvaluacionesNivel.map((grupo) => (
                    <button
                      type="button"
                      role="tab"
                      key={grupo.clave}
                      aria-selected={filtroGrupoEfectivo === grupo.clave}
                      className={`filtro-tech-chip${
                        filtroGrupoEfectivo === grupo.clave ? ' is-active' : ''
                      }`}
                      onClick={() => setFiltroGrupoEval(grupo.clave)}
                    >
                      {etiquetaChipGrupo(grupo.clave)}
                      <span className="filtro-tech-chip__count">{grupo.items.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {panelOpcionesLista && (
              <div className="evaluaciones-opciones-panel">
                {selectedArea?.fase2_activa && (
                  <div className="fase2-candado-aviso fase2-candado-aviso--static">
                    <p>
                      Sin aprobar <strong>Seguridad en operación de maquinaria N1</strong> (tronco)
                      no se pueden iniciar las demás. Cada tecnología pide además su seguridad N1
                      y, desde nivel 2, su N2. Las filas bloqueadas lo indican en el título.
                    </p>
                  </div>
                )}
                {selectedArea?.fase2_activa &&
                  !isRegularUser &&
                  (isAdmin || isEntrenador || isSupervisorRol) && (
                    <label className="catalogo-tech-toggle">
                      <input
                        type="checkbox"
                        checked={verTodasTechs}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setVerTodasTechs(next);
                          if (selectedUser) {
                            void loadEvaluacionesUsuario(selectedUser, undefined, next);
                          }
                        }}
                      />
                      <span>Ver todo el catálogo del área (no solo el de esta persona)</span>
                    </label>
                  )}
              </div>
            )}

            {selectedArea?.fase2_activa && examenPendiente && (
              <Fase2ExamenNivel
                intentoId={examenPendiente.id}
                nivel={examenPendiente.nivel}
                onCerrar={() => setExamenPendiente(null)}
                onCompletado={() => {
                  if (selectedUser) {
                    void loadEvaluacionesUsuario(selectedUser);
                  }
                }}
              />
            )}
            {loading ? (
              <div className="loading-message">
                <p>Cargando evaluaciones...</p>
              </div>
            ) : evaluacionesDelNivel.length > 0 ? (
              <div className="evaluaciones-list">
                {gruposEvaluacionesFiltrados.map((grupo) => (
                  <React.Fragment key={grupo.clave}>
                    {grupo.titulo && filtroGrupoEfectivo === 'todas' ? (
                      <h4 className="evaluaciones-grupo-titulo">{grupo.titulo}</h4>
                    ) : null}
                    {grupo.items.map((evaluacion) => {
                  const evaluacionGuardada = evaluacionesUsuarioGuardadas[evaluacion.id];
                  const evaluacionRegistrada = Boolean(evaluacionGuardada);
                  const estadoFirmasUsuario = (evaluacionGuardada?.estado_firmas_usuario || 'pendiente_firmas').toLowerCase();
                  const textoEstadoFirmasUsuario =
                    evaluacionGuardada?.estado_firmas_usuario_display || 'Pendiente de firmas';
                  const todasFirmasCompletas = estadoFirmasUsuario === 'firmas_completas';
                  const estadoNormalizado = (evaluacionGuardada?.estado || '').toLowerCase();
                  // Completada en lista: solo si ya se guardó la evaluación (estado o resultado),
                  // no solo por tener todas las firmas (las firmas no cierran solas el intento).
                  const completadaPorRegistro =
                    evaluacionRegistrada &&
                    (estadoNormalizado === 'completada' ||
                      evaluacionGuardada?.resultado_final != null);
                  // No usar "nivel completo" para marcar cada fila: el resumen por nivel
                  // puede corresponder a otra posición o estar desfasado; cada evaluación
                  // debe basarse solo en su registro (EvaluacionUsuario) en esta posición.
                  const estaCompletada = completadaPorRegistro;
                  // Pendiente de firmas: falta alguna firma y el flujo ya está en marcha o cerrado en BD.
                  const estaPendienteFirmas =
                    evaluacionRegistrada &&
                    !todasFirmasCompletas &&
                    (estadoNormalizado === 'en_progreso' ||
                      estadoFirmasUsuario === 'en_proceso' ||
                      estadoNormalizado === 'completada');
                  const filaEnProcesoReal =
                    evaluacionRegistrada &&
                    !estaCompletada &&
                    (estadoNormalizado === 'en_progreso' || estadoFirmasUsuario === 'en_proceso');

                  const minimoEvaluacion = evaluacion.minimo_aprobatorio ?? 70;
                  const resultadoEvaluacion = evaluacionGuardada?.resultado_final;
                  const tieneResultadoGuardado =
                    resultadoEvaluacion !== null && resultadoEvaluacion !== undefined;
                  const aprobadaSegunMinimo = evaluacionCumpleMinimo(minimoEvaluacion, resultadoEvaluacion);
                  const muestraNoAprobada =
                    estaCompletada && tieneResultadoGuardado && !aprobadaSegunMinimo;
                  const mensajeBloqueoFase2 = textoBloqueoCandadoFase2(
                    evaluacion,
                    evaluacionesUsuario,
                    evaluacionesUsuarioGuardadas,
                    selectedArea?.fase2_activa,
                    selectedUser?.tecnologia_ids
                  );
                  const bloqueadaFase2 = Boolean(mensajeBloqueoFase2);
                  const etiquetaBloqueoFase2 = etiquetaCortaBloqueoFase2(mensajeBloqueoFase2);

                  return (
                    <div
                      key={evaluacion.id}
                      className={`evaluacion-item-simple ${
                        muestraNoAprobada
                          ? 'no-aprobada'
                          : estaCompletada
                            ? 'completada'
                            : filaEnProcesoReal
                              ? 'en-proceso'
                              : 'pendiente'
                      }`}
                    >
                      <div className="evaluacion-content">
                        <div className="evaluacion-header">
                          <h4>
                            {evaluacion.nombre}
                            {evaluacion.es_tronco_comun ? ' · Tronco' : ''}
                            {evaluacion.tecnologia_nombre ? ` · ${evaluacion.tecnologia_nombre}` : ''}
                            {etiquetaBloqueoFase2 ? ` · ${etiquetaBloqueoFase2}` : ''}
                          </h4>
                          <span
                            className={`evaluacion-status ${
                              estaPendienteFirmas
                                ? 'status-pendiente-firmas'
                                : muestraNoAprobada
                                  ? 'status-no-aprobada'
                                  : estaCompletada
                                    ? 'status-completada'
                                    : 'status-pendiente'
                            }`}
                          >
                            {estaPendienteFirmas
                              ? textoEstadoFirmasUsuario
                              : muestraNoAprobada
                                ? 'No aprobada'
                                : estaCompletada
                                  ? 'Completada'
                                  : 'Pendiente'}
                          </span>
                        </div>
                        <div className="evaluacion-actions">
                          {estaCompletada ? (
                            evaluacionGuardada ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm btn-touch"
                                  onClick={() => {
                                    setMenuAccionesEvalId(null);
                                    verEvaluacionGuardada(evaluacion, evaluacionGuardada);
                                  }}
                                >
                                  Ver
                                </button>
                                {muestraNoAprobada && puedeRegistrarNuevoIntento && (
                                  <button
                                    type="button"
                                    className="btn btn-nuevo-intento btn-sm btn-touch"
                                    onClick={() => {
                                      setMenuAccionesEvalId(null);
                                      iniciarNuevoIntentoEvaluacion(evaluacion, evaluacionGuardada);
                                    }}
                                  >
                                    <FaRedo aria-hidden /> Nuevo intento
                                  </button>
                                )}
                                {isEntrenador && !todasFirmasCompletas && (
                                  <button
                                    type="button"
                                    className="btn btn-firma-entrenador btn-sm btn-touch"
                                    onClick={() => {
                                      setMenuAccionesEvalId(null);
                                      abrirSoloFirmasEntrenador(evaluacion, evaluacionGuardada);
                                    }}
                                    title="Registrar solo tu firma (supervisor/instructor); el empleado puede firmar después."
                                  >
                                    <FaPen aria-hidden /> Añadir firma
                                  </button>
                                )}
                                {isAdmin && (
                                  <div className="evaluacion-actions-more">
                                    <button
                                      type="button"
                                      className="btn btn-more btn-touch"
                                      aria-expanded={menuAccionesEvalId === evaluacion.id}
                                      aria-haspopup="menu"
                                      aria-label="Más acciones"
                                      title="Más acciones"
                                      onClick={() =>
                                        setMenuAccionesEvalId((prev) =>
                                          prev === evaluacion.id ? null : evaluacion.id
                                        )
                                      }
                                    >
                                      <FaEllipsisV aria-hidden />
                                    </button>
                                    {menuAccionesEvalId === evaluacion.id && (
                                      <div className="evaluacion-actions-menu" role="menu">
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="evaluacion-actions-menu__item"
                                          onClick={() => {
                                            setMenuAccionesEvalId(null);
                                            editarEvaluacionGuardada(evaluacion, evaluacionGuardada);
                                          }}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="evaluacion-actions-menu__item evaluacion-actions-menu__item--danger"
                                          onClick={() => {
                                            setMenuAccionesEvalId(null);
                                            borrarAvanceEvaluacion(evaluacion, evaluacionGuardada);
                                          }}
                                        >
                                          <FaTrashAlt aria-hidden /> Borrar avance
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="evaluacion-status status-completada">Completada</span>
                            )
                          ) : !isVisor ? (
                            <>
                              <button
                                type="button"
                                className={`btn btn-${isRegularUser ? 'secondary' : 'primary'} btn-sm btn-touch`}
                                disabled={bloqueadaFase2}
                                title={mensajeBloqueoFase2 ?? undefined}
                                onClick={() => {
                                  setMenuAccionesEvalId(null);
                                  if (evaluacionGuardada) {
                                    abrirEvaluacionParaFirmar(evaluacion, evaluacionGuardada);
                                  } else {
                                    iniciarEvaluacion(evaluacion);
                                  }
                                }}
                              >
                                {isRegularUser ? 'Firmar' : 'Evaluar'}
                              </button>
                              {isAdmin &&
                                evaluacionGuardada &&
                                evaluacionUsuarioTieneAvanceBorrable(evaluacionGuardada) && (
                                <div className="evaluacion-actions-more">
                                  <button
                                    type="button"
                                    className="btn btn-more btn-touch"
                                    aria-expanded={menuAccionesEvalId === evaluacion.id}
                                    aria-haspopup="menu"
                                    aria-label="Más acciones"
                                    title="Más acciones"
                                    onClick={() =>
                                      setMenuAccionesEvalId((prev) =>
                                        prev === evaluacion.id ? null : evaluacion.id
                                      )
                                    }
                                  >
                                    <FaEllipsisV aria-hidden />
                                  </button>
                                  {menuAccionesEvalId === evaluacion.id && (
                                    <div className="evaluacion-actions-menu" role="menu">
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="evaluacion-actions-menu__item evaluacion-actions-menu__item--danger"
                                        onClick={() => {
                                          setMenuAccionesEvalId(null);
                                          borrarAvanceEvaluacion(evaluacion, evaluacionGuardada);
                                        }}
                                      >
                                        <FaTrashAlt aria-hidden /> Borrar avance
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </React.Fragment>
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

    const nivelActual =
      evaluacionActual.nivel ??
      evaluacionActual.nivel_posicion_data?.nivel ??
      null;
    const resultadoFinalGuardado = evaluacionGuardadaInfo?.resultado_final ?? null;
    const fechaCompletadaGuardada = evaluacionGuardadaInfo?.fecha_completada
      ? new Date(evaluacionGuardadaInfo.fecha_completada).toLocaleString('es-ES')
      : null;
    const historialIntentosRaw = evaluacionGuardadaInfo?.historial_intentos;
    const historialIntentos = Array.isArray(historialIntentosRaw)
      ? [...historialIntentosRaw].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
      : [];

    return (
      <div className="evaluaciones-section" ref={printContentRef}>

        <div className="evaluation-content">
          {modoSoloFirmasEntrenador && (
            <div className="solo-firmas-entrenador-banner" role="status">
              Modo solo firmas: registra tu firma donde corresponda; el resto de la evaluación es solo lectura. El empleado podrá firmar todas las evaluaciones cuando corresponda.
            </div>
          )}
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
                      <td>Fecha de Ingreso: {selectedUser.fecha_ingreso ? formatFechaIngreso(selectedUser.fecha_ingreso) : 'No asignada'}</td>
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
                {historialIntentos.length > 0 ? (
                  <div className="evaluation-result-summary--historial">
                    <p className="evaluation-result-summary-title">Historial de intentos</p>
                    <ul className="evaluation-result-summary-list" aria-label="Historial de intentos de evaluación">
                      {historialIntentos.map((intento, idx) => (
                        <li
                          key={`${intento.numero}-${intento.fecha_registro ?? idx}`}
                          className={`summary-intento ${intento.aprobada ? 'summary-intento-aprobada' : 'summary-intento-no-aprobada'}`}
                        >
                          <span className="summary-intento-label">Intento {intento.numero}</span>
                          <span className="summary-intento-resultado">{intento.resultado_final}%</span>
                          <span
                            className={`summary-intento-tag ${
                              intento.aprobada ? 'summary-intento-tag--ok' : 'summary-intento-tag--fail'
                            }`}
                          >
                            {intento.aprobada ? 'Aprobado' : 'No aprobado'}
                          </span>
                          {intento.fecha_registro ? (
                            <span className="summary-intento-fecha">
                              {new Date(intento.fecha_registro).toLocaleString('es-ES')}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <span className="summary-badge">
                      Resultado final:{' '}
                      {resultadoFinalGuardado !== null ? `${resultadoFinalGuardado}%` : 'Sin resultado'}
                    </span>
                    {fechaCompletadaGuardada && (
                      <span className="summary-badge">
                        Registrado: {fechaCompletadaGuardada}
                      </span>
                    )}
                  </>
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
                  {opcionesSupervisorParaFormulario.map(supervisor => (
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
                            <strong>
                              EVALUACIÓN = ( PUNTOS OBTENIDOS / {evaluacionActual.formula_divisor ?? (evaluacionActual.puntos_evaluacion?.length || 1)} ) * {evaluacionActual.formula_multiplicador ?? 100}
                            </strong>
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
                  const minimoRequerido = evaluacionActual.minimo_aprobatorio ?? 70;
                  const aprobadaSegunResultado = resultado >= minimoRequerido;
                  const fechaEvaluacionTexto = evaluacionGuardadaInfo?.fecha_completada
                    ? new Date(evaluacionGuardadaInfo.fecha_completada).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : new Date().toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
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
                      <div
                        className={`resultado-final ${
                          aprobadaSegunResultado ? 'resultado-final--aprobado' : 'resultado-final--no-aprobado'
                        }`}
                      >
                        <strong>Resultado: {resultado.toFixed(2)}%</strong>
                      </div>
                      {!aprobadaSegunResultado && (
                        <div className="resultado-alerta-no-aprobada" role="alert">
                          No aprobada: el resultado no alcanza el mínimo exigido para este nivel (
                          {minimoRequerido}%).
                        </div>
                      )}
                      <div className="minimo-aprobatorio">
                        Mínimo aprobatorio para este nivel: {minimoRequerido}%
                      </div>
                      <div className="fecha-evaluacion">Fecha de evaluación: {fechaEvaluacionTexto}</div>
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
                    const supervisorProduccionDelFormulario =
                      slug === TIPO_FIRMA_PRODUCCION &&
                      supervisorSeleccionado &&
                      supervisores.some((s) => s.id === supervisorSeleccionado)
                        ? supervisores.find((s) => s.id === supervisorSeleccionado) ?? null
                        : null;
                    const nombreFirmanteSupervisorFormulario =
                      supervisorProduccionDelFormulario?.full_name ??
                      supervisorProduccionDelFormulario?.username ??
                      null;
                    // Firma empleado: el firmante es siempre el evaluado (selectedUser), no firma.usuario_nombre de la plantilla.
                    const firmanteNombre =
                      slug === 'empleado'
                        ? firmaUsuario?.usuario_nombre ??
                          firmaPendiente?.usuarioNombre ??
                          selectedUser?.full_name ??
                          selectedUser?.username ??
                          null
                        : firmaUsuario?.usuario_nombre ??
                          firmaPendiente?.usuarioNombre ??
                          nombreFirmanteSupervisorFormulario ??
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
                      (supervisorProduccionDelFormulario
                        ? supervisorProduccionDelFormulario.id
                        : null) ??
                      firma.usuario ??
                      (firma.tipo_firma === 'empleado' ? selectedUser?.id ?? null : null);

                    const esFirmanteActual =
                      currentUserId !== null && usuarioAsignadoFirma === currentUserId;

                    const puedeFirmarPendiente = esFirmanteActual && !estaFirmada;
                    const puedeEditarPorRol = !evaluacionModoLectura && (!estadoEvaluacionCompletada || isAdmin);
                    /** Entrenador en modo solo firmas: todas las firmas pendientes, incluida la del empleado. */
                    const puedeFirmarEntrenadorSoloFirmas =
                      modoSoloFirmasEntrenador && isEntrenador && !estaFirmada;
                    /**
                     * Instrucción (entrenador/supervisor/admin) puede capturar la firma del evaluado
                     * (tablet / acompañamiento). Incluye cuando el formulario está en solo lectura por
                     * puntajes ya guardados pero aún faltan firmas (clase read-only en la vista).
                     */
                    const puedeRegistrarFirmaEmpleadoComoStaff =
                      slug === 'empleado' &&
                      !estaFirmada &&
                      !isVisor &&
                      (isEntrenador || isSupervisorRol || isAdmin);
                    const puedeEditarFirma =
                      !isVisor &&
                      (puedeFirmarPendiente ||
                        puedeEditarPorRol ||
                        puedeFirmarEntrenadorSoloFirmas ||
                        puedeRegistrarFirmaEmpleadoComoStaff);

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
                            className="btn-editar-firma"
                            onClick={() => handleOpenFirmaModal(firma)}
                          >
                            <FaEdit /> Editar Firma
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

            <FirmaModal
              open={firmaModalAbierta}
              firmanteId={firmaModalFirmante}
              onFirmanteChange={setFirmaModalFirmante}
              opcionesFirmante={opcionesFirmanteParaModalFirma}
              canvasRef={firmaCanvasRef}
              selectedUserName={selectedUser?.full_name || 'Empleado'}
              currentUserLabel={
                typeof (currentUser as User)?.full_name === 'string'
                  ? (currentUser as User).full_name
                  : [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') ||
                    'Usuario actual'
              }
              modoSoloFirmasEntrenador={modoSoloFirmasEntrenador}
              isEntrenador={isEntrenador}
              hasSignatureForTipo={Boolean(
                firmaModalAbierta && hasSignature[firmaModalAbierta.tipo]
              )}
              guardandoFirma={guardandoFirma}
              puedeGuardar={puedeGuardarFirma()}
              onClose={() => {
                isDrawingRef.current = false;
                setFirmaModalAbierta(null);
                setFirmaModalFirmante(null);
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={(ev) => {
                if (firmaPointerIdRef.current === ev.pointerId) {
                  stopDrawing(ev);
                }
              }}
              onClear={clearSignature}
              onSave={async () => {
                stopDrawing();
                await handleGuardarFirma();
              }}
            />

            <div className="evaluation-actions">
              <button 
                className="btn btn-secondary"
                onClick={async () => {
                  if (!(await confirmarSalidaSiHayCambios())) return;
                  editandoEvaluacionComoAdminRef.current = false;
                  setModoSoloFirmasEntrenador(false);
                  setEvaluacionModoLectura(false);
                  setEvaluacionGuardadaInfo(null);
                  if (firmaDesdeNotificaciones && onVolverNotificaciones) {
                    onVolverNotificaciones();
                    return;
                  }
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
    const mostrarBotonCrearLista = !onboardingUsuarioId && selectedArea !== null && !isVisor;
    
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

    const nombrePosicionLista = (usuario: User) =>
      usuario.posicion
        ? posiciones.find((p) => p.id === usuario.posicion)?.name ?? 'Sin posición'
        : 'Sin posición';

    const termLista = searchTerm.trim().toLowerCase();
    const matchUsuarioLista = (u: User) =>
      !termLista ||
      u.full_name.toLowerCase().includes(termLista) ||
      (u.email ?? '').toLowerCase().includes(termLista);

    const asignadosFiltradosLista = usuariosAsignados.filter(matchUsuarioLista);
    const disponiblesFiltradosLista = usuariosDisponibles.filter(matchUsuarioLista);
    const filasListaUsuarios = [...asignadosFiltradosLista, ...disponiblesFiltradosLista];

    const puedeEditarFechaLista =
      effectiveUserRole === 'ADMIN' ||
      effectiveUserRole === 'ENTRENADOR' ||
      effectiveUserRole === 'SUPERVISOR';

    const sinUsuariosEnSistema = usuariosRegulares.length === 0;
    const sinResultadosBusquedaLista =
      !sinUsuariosEnSistema && filasListaUsuarios.length === 0;

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
          <div className="form-section form-section--usuarios-lista">
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
            {sinUsuariosEnSistema ? (
              <div className="lista-usuarios-estado-vacio">
                <p className="no-usuarios">No hay usuarios disponibles</p>
              </div>
            ) : sinResultadosBusquedaLista ? (
              <div className="lista-usuarios-estado-vacio">
                <p className="lista-usuarios-sin-resultados">No hay resultados para tu búsqueda</p>
              </div>
            ) : (
              <div
                className="lista-usuarios-scroll"
                role="region"
                aria-label="Listado de usuarios para la lista de asistencia"
              >
                <table className="lista-usuarios-tabla">
                  <thead>
                    <tr>
                      <th scope="col">En lista</th>
                      <th scope="col">Nombre</th>
                      <th scope="col">Posición</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasListaUsuarios.map((usuario) => {
                      const asignado = formData.usuarios_regulares.includes(usuario.id);
                      return (
                        <tr
                          key={usuario.id}
                          className={
                            asignado
                              ? 'lista-usuario-fila lista-usuario-fila--asignado'
                              : 'lista-usuario-fila'
                          }
                        >
                          <td>{asignado ? 'Sí' : 'No'}</td>
                          <td>{usuario.full_name}</td>
                          <td>{nombrePosicionLista(usuario)}</td>
                          <td className="lista-usuario-fecha-cell">
                            {asignado && puedeEditarFechaLista ? (
                              <input
                                type="date"
                                value={
                                  fechasUsuarios[usuario.id] ||
                                  new Date().toISOString().split('T')[0]
                                }
                                onChange={(e) =>
                                  handleFechaUsuarioChange(usuario.id, e.target.value)
                                }
                                className="fecha-usuario-input fecha-usuario-input--tabla"
                                aria-label={`Fecha para ${usuario.full_name}`}
                              />
                            ) : asignado && !puedeEditarFechaLista ? (
                              <span className="lista-usuario-fecha-texto">
                                {fechasUsuarios[usuario.id]
                                  ? new Date(
                                      fechasUsuarios[usuario.id]
                                    ).toLocaleDateString('es-ES')
                                  : new Date().toLocaleDateString('es-ES')}
                              </span>
                            ) : (
                              <span className="lista-usuario-fecha-vacio">—</span>
                            )}
                          </td>
                          <td className="lista-usuarios-accion">
                            {asignado ? (
                              <button
                                type="button"
                                className="btn-quitar-usuario"
                                onClick={() => handleUsuarioToggle(usuario)}
                                title="Quitar de la lista"
                              >
                                <FaTimes />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-agregar-usuario"
                                onClick={() => handleUsuarioToggle(usuario)}
                                title="Agregar a la lista"
                              >
                                <FaPlus />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
    <div
      className={`evaluaciones-container${
        currentView === 'usuario-detalle' ? ' evaluaciones-container--ficha' : ''
      }`}
    >
      {/* Header interno solo para usuarios regulares (planta usa cabecera Dashboard) */}
      {isRegularUser && (
        <div className="evaluaciones-header">
          <div className="breadcrumb">
            <span>Mis Evaluaciones</span>
          </div>
          {currentView === 'usuario-evaluacion' && (
            <button className="back-button" onClick={goBack}>
              <FaArrowLeft /> Volver
            </button>
          )}
        </div>
      )}

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
      {confirmDialog}
      {/* Overlay de carga al generar PDF */}
      {descargandoPdf && (
        <div className="pdf-loading-overlay" aria-live="polite" aria-busy="true">
          <div className="pdf-loading-box">
            <div className="pdf-loading-spinner" />
            <p>Generando PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluaciones;
