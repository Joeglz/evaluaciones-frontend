import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  FaArrowLeft,
  FaArrowUp,
  FaChevronDown,
  FaChevronRight,
  FaTimes
} from 'react-icons/fa';
import { apiService, Area, GrupoNested, PosicionNested, NivelPosicion, Evaluacion, User, FirmaEvaluacion, PuntoEvaluacion, CriterioEvaluacion } from '../services/api';
import Fase2MultihabilidadEmbed from './fase2/Fase2MultihabilidadEmbed';
import BancoExamenEditor from './fase2/BancoExamenEditor';
import { useTopbarOverride, TopbarBreadcrumbItem } from '../contexts/TopbarContext';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import ToastContainer from './ToastContainer';
import './AreaManagement.css';

type AreaEditTab = 'general' | 'grupos' | 'posiciones' | 'multihabilidad' | 'examenes';

const slugifyText = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

function getScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

const AreaManagement: React.FC = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { confirm, confirmDialog } = useConfirm();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'edit' | 'edit-evaluacion'>('list');
  const [editTab, setEditTab] = useState<AreaEditTab>('general');
  const [posicionExpandidaKey, setPosicionExpandidaKey] = useState<string | null>(null);
  const [nivelTabPorPosicion, setNivelTabPorPosicion] = useState<Record<string, number>>({});
  
  // Área seleccionada
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  
  // Estados para niveles y evaluaciones por posición
  const [nivelesPorPosicion, setNivelesPorPosicion] = useState<Record<number, NivelPosicion[]>>({});
  const [evaluacionesPorNivel, setEvaluacionesPorNivel] = useState<Record<number, Evaluacion[]>>({});
  const [evaluacionesPlantillas, setEvaluacionesPlantillas] = useState<Evaluacion[]>([]);
  const [supervisoresDisponibles, setSupervisoresDisponibles] = useState<User[]>([]);
  const [eliminandoEvaluacionId, setEliminandoEvaluacionId] = useState<number | null>(null);
  const [posicionesAbiertas, setPosicionesAbiertas] = useState<Record<string, boolean>>({});
  const [nivelesAbiertos, setNivelesAbiertos] = useState<Record<string, boolean>>({});
  const [showAgregarEvaluacionModal, setShowAgregarEvaluacionModal] = useState(false);
  const [nivelModalInfo, setNivelModalInfo] = useState<{ nivelId: number; posicionId: number } | null>(null);
  const [modalPlantillaIds, setModalPlantillaIds] = useState<number[]>([]);
  const [modalNombresPorPlantilla, setModalNombresPorPlantilla] = useState<Record<number, string>>({});
  const [modalPlantillaDetalle, setModalPlantillaDetalle] = useState<Evaluacion | null>(null);
  const [modalMinimoAprobatorio, setModalMinimoAprobatorio] = useState<string>('70');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalFirmasDisponibles, setModalFirmasDisponibles] = useState<FirmaEvaluacion[]>([]);
  const [modalFirmasSeleccionadas, setModalFirmasSeleccionadas] = useState<Record<string, boolean>>({});
  const [modalFirmasExtras, setModalFirmasExtras] = useState<Array<{ nombre: string; identificador: string }>>([]);
  const [modalFirmaExtraNombre, setModalFirmaExtraNombre] = useState('');
  const [modalFirmaExtraIdentificador, setModalFirmaExtraIdentificador] = useState('');
  const [modalFormulaDivisor, setModalFormulaDivisor] = useState<string>('17');
  const [modalFormulaMultiplicador, setModalFormulaMultiplicador] = useState<string>('80');
  const [plantillaSearchQuery, setPlantillaSearchQuery] = useState('');
  const [plantillaDropdownOpen, setPlantillaDropdownOpen] = useState(false);
  const [plantillaHighlightedIndex, setPlantillaHighlightedIndex] = useState(-1);
  const plantillaComboboxRef = useRef<HTMLDivElement>(null);
  const areaManagementRef = useRef<HTMLDivElement>(null);
  const dashboardScrollParentRef = useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [evaluacionEdicionContext, setEvaluacionEdicionContext] = useState<{ evaluacionId: number; nivelId: number; posicionId: number } | null>(null);
  const [editarEvaluacionNombre, setEditarEvaluacionNombre] = useState('');
  const [editarEvaluacionMinimo, setEditarEvaluacionMinimo] = useState<number | null>(null);
  const [editarEvaluacionFirmas, setEditarEvaluacionFirmas] = useState<FirmaEvaluacion[]>([]);
  const [editarEvaluacionDivisor, setEditarEvaluacionDivisor] = useState<number | null>(17);
  const [editarEvaluacionMultiplicador, setEditarEvaluacionMultiplicador] = useState<number | null>(80);
  const [editarEvaluacionError, setEditarEvaluacionError] = useState<string | null>(null);
  const [editarEvaluacionLoading, setEditarEvaluacionLoading] = useState(false);
  const [cargandoEvaluacionEdicion, setCargandoEvaluacionEdicion] = useState(false);
  const [agregandoFirmaEvaluacion, setAgregandoFirmaEvaluacion] = useState(false);
  const [eliminandoFirmaEvaluacionId, setEliminandoFirmaEvaluacionId] = useState<number | null>(null);
  const [editarFirmaNombre, setEditarFirmaNombre] = useState('');
  const [editarFirmaIdentificador, setEditarFirmaIdentificador] = useState('');
  const [editarEvaluacionPuntos, setEditarEvaluacionPuntos] = useState<PuntoEvaluacion[]>([]);
  const [editarEvaluacionCriterios, setEditarEvaluacionCriterios] = useState<CriterioEvaluacion[]>([]);
  const [editarEvaluacionPaso, setEditarEvaluacionPaso] = useState<1 | 2 | 3 | 4>(1);
  const pasosEdicionEvaluacion: Array<{ id: 1 | 2 | 3 | 4; titulo: string }> = [
    { id: 1, titulo: 'Datos generales' },
    { id: 2, titulo: 'Puntos de Evaluación' },
    { id: 3, titulo: 'Criterios de Evaluación' },
    { id: 4, titulo: 'Firmas' }
  ];

  const plantillasFiltradas = useMemo(() => {
    if (!plantillaSearchQuery.trim()) return evaluacionesPlantillas;
    const q = plantillaSearchQuery.trim().toLowerCase();
    return evaluacionesPlantillas.filter((p) => (p.nombre || '').toLowerCase().includes(q));
  }, [evaluacionesPlantillas, plantillaSearchQuery]);

  const plantillasDisponiblesParaAgregar = useMemo(() => {
    return plantillasFiltradas.filter((p) => !modalPlantillaIds.includes(p.id));
  }, [plantillasFiltradas, modalPlantillaIds]);

  useEffect(() => {
    if (!showAgregarEvaluacionModal || !plantillaDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (plantillaComboboxRef.current && !plantillaComboboxRef.current.contains(e.target as Node)) {
        setPlantillaDropdownOpen(false);
        setPlantillaHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAgregarEvaluacionModal, plantillaDropdownOpen]);
  
  // Formularios
  const [createForm, setCreateForm] = useState({
    name: '',
    is_active: true,
    include_onboarding: true,
    tipo_area: 'produccion' as 'produccion' | 'soporte',
    fase2_activa: false,
    n4_basicas_requeridas: 5,
    n4_complejas_requeridas: 3,
    grupos: [] as GrupoNested[],
    posiciones: [] as PosicionNested[]
  });

  const [editForm, setEditForm] = useState({
    name: '',
    is_active: true,
    include_onboarding: true,
    tipo_area: 'produccion' as 'produccion' | 'soporte',
    fase2_activa: false,
    n4_basicas_requeridas: 5,
    n4_complejas_requeridas: 3,
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

  useEffect(() => {
    if (currentView !== 'list' || loading) {
      setShowBackToTop(false);
      return;
    }
    const root = areaManagementRef.current;
    if (!root) {
      return;
    }
    const scrollParent = getScrollParent(root);
    dashboardScrollParentRef.current = scrollParent;
    if (!scrollParent) {
      return;
    }
    const onScroll = () => {
      setShowBackToTop(scrollParent.scrollTop > 240);
    };
    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scrollParent.removeEventListener('scroll', onScroll);
  }, [currentView, loading, areas.length, searching]);

  const handleBackToTop = useCallback(() => {
    dashboardScrollParentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      
      const data = await apiService.getAreas(params);
      setAreas(data);
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
      showSuccess('Área creada exitosamente');
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
      await loadAreas();
      volverALista();
      showSuccess('Área actualizada exitosamente');
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
      showSuccess('Área eliminada exitosamente');
    } catch (err: any) {
      showError(`Error: ${err.message}`);
    }
  };

  const handleDeactivateArea = async () => {
    if (!selectedArea) return;
    
    try {
      if (selectedArea.is_active) {
        await apiService.deactivateArea(selectedArea.id);
        showSuccess('Área desactivada exitosamente');
      } else {
        await apiService.activateArea(selectedArea.id);
        showSuccess('Área activada exitosamente');
      }
      setShowDeactivateModal(false);
      setSelectedArea(null);
      loadAreas();
    } catch (err: any) {
      showError(`Error: ${err.message}`);
    }
  };

  const loadSupervisoresDisponibles = async () => {
    if (supervisoresDisponibles.length > 0) {
      return;
    }

    try {
      const response = await apiService.getUsers({
        role: 'ADMIN,SUPERVISOR',
        is_active: true
      });
      const ordenados = (response.results || []).sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' })
      );
      setSupervisoresDisponibles(ordenados);
    } catch (err) {
      console.error('Error al cargar supervisores disponibles:', err);
      setSupervisoresDisponibles([]);
    }
  };

  const openEditModal = async (area: Area) => {
    setSelectedArea(area);
    setEditErrors({});
    const gruposConSupervisores = (area.grupos || []).map((g) => ({
      name: g.name,
      is_active: g.is_active ?? true,
      supervisores: (g.supervisores ?? []).map((s) => s.id)
    }));

    setEditForm({
      name: area.name,
      is_active: area.is_active,
      include_onboarding: (area as Area & { include_onboarding?: boolean }).include_onboarding !== false,
      tipo_area: area.tipo_area === 'soporte' ? 'soporte' : 'produccion',
      fase2_activa: Boolean(area.fase2_activa),
      n4_basicas_requeridas: area.n4_basicas_requeridas ?? 5,
      n4_complejas_requeridas: area.n4_complejas_requeridas ?? 3,
      grupos: gruposConSupervisores,
      posiciones: area.posiciones || []
    });
    
    if (supervisoresDisponibles.length === 0) {
      await loadSupervisoresDisponibles();
    }
    
    setCurrentView('edit');
    setEditTab('general');
    setPosicionExpandidaKey(null);
    setNivelTabPorPosicion({});
    
    // Cargar niveles y evaluaciones para cada posición existente
    if (area.posiciones && area.posiciones.length > 0) {
      await loadNivelesYEvaluaciones(area.posiciones.map(p => p.id));
    }
    
    // Cargar plantillas de evaluaciones
    await loadEvaluacionesPlantillas();
  };

  const openCreateAreaModal = async () => {
    await loadSupervisoresDisponibles();
    setCreateErrors({});
    resetCreateForm();
    setShowCreateModal(true);
  };

  const loadNivelesYEvaluaciones = async (posicionIds: number[]) => {
    const niveles: Record<number, NivelPosicion[]> = {};
    const evaluaciones: Record<number, Evaluacion[]> = {};
    
    for (const posicionId of posicionIds) {
      try {
        // Cargar niveles de la posición
        const nivelesResponse = await apiService.getNivelesPosicion({ posicion_id: posicionId });
        niveles[posicionId] = nivelesResponse.results || [];
        
        // Cargar evaluaciones para cada nivel (todas las páginas)
        for (const nivel of nivelesResponse.results || []) {
          try {
            const evalList = await apiService.getEvaluacionesAll({ 
              nivel_posicion_id: nivel.id,
              es_plantilla: false
            });
            evaluaciones[nivel.id] = Array.isArray(evalList) ? evalList : [];
          } catch (err) {
            console.error(`Error al cargar evaluaciones para nivel ${nivel.id}:`, err);
            evaluaciones[nivel.id] = [];
          }
        }
      } catch (err) {
        console.error(`Error al cargar niveles para posición ${posicionId}:`, err);
        niveles[posicionId] = [];
      }
    }
    
    setNivelesPorPosicion(niveles);
    setEvaluacionesPorNivel(evaluaciones);
  };

  const loadEvaluacionesPlantillas = async () => {
    try {
      const list = await apiService.getEvaluacionesAll({ es_plantilla: true });
      setEvaluacionesPlantillas(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error al cargar evaluaciones plantillas:', err);
      setEvaluacionesPlantillas([]);
    }
  };

  const handleEliminarEvaluacionNivel = async (evaluacionId: number, posicionId: number) => {
    const confirmar = await confirm({
      title: 'Eliminar evaluación',
      message: '¿Eliminar esta evaluación asignada al nivel?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmar) return;
    try {
      setEliminandoEvaluacionId(evaluacionId);
      await apiService.deleteEvaluacion(evaluacionId);
      await loadNivelesYEvaluaciones([posicionId]);
      showSuccess('Evaluación eliminada correctamente');
    } catch (err: any) {
      console.error('Error al eliminar evaluación del nivel:', err);
      showError(`Error al eliminar la evaluación: ${err.message || err}`);
    } finally {
      setEliminandoEvaluacionId(null);
    }
  };

  const openDeleteModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeleteModal(true);
  };

  const openDeactivateModal = (area: Area) => {
    setSelectedArea(area);
    setShowDeactivateModal(true);
  };

  const volverALista = () => {
    setCurrentView('list');
    setSelectedArea(null);
    setEditErrors({});
    setEditForm({
      name: '',
      is_active: true,
      include_onboarding: true,
      tipo_area: 'produccion',
      fase2_activa: false,
      n4_basicas_requeridas: 5,
      n4_complejas_requeridas: 3,
      grupos: [],
      posiciones: []
    });
    setNivelesPorPosicion({});
    setEvaluacionesPorNivel({});
    setEliminandoEvaluacionId(null);
    setPosicionesAbiertas({});
    setNivelesAbiertos({});
    setShowAgregarEvaluacionModal(false);
    setNivelModalInfo(null);
    setModalPlantillaIds([]);
    setModalNombresPorPlantilla({});
    setModalMinimoAprobatorio('');
    setModalError(null);
    setModalPlantillaDetalle(null);
    setModalFirmasDisponibles([]);
    setModalFirmasSeleccionadas({});
    setModalFirmasExtras([]);
    setModalFirmaExtraNombre('');
    setModalFirmaExtraIdentificador('');
    setModalMinimoAprobatorio('70');
    setModalFormulaDivisor('17');
    setModalFormulaMultiplicador('80');
    setEditTab('general');
    setPosicionExpandidaKey(null);
    setNivelTabPorPosicion({});
  };

  const togglePosicionExclusive = (posicionKey: string) => {
    setPosicionExpandidaKey((prev) => (prev === posicionKey ? null : posicionKey));
  };

  const togglePosicion = (posicionKey: string, defaultOpen: boolean) => {
    setPosicionesAbiertas(prev => {
      const current = prev.hasOwnProperty(posicionKey) ? prev[posicionKey] : defaultOpen;
      return {
        ...prev,
        [posicionKey]: !current
      };
    });
  };

  const handlePosicionHeaderClick = (
    event: React.MouseEvent<HTMLDivElement>,
    posicionKey: string,
    defaultOpen: boolean
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    togglePosicionExclusive(posicionKey);
  };

  const handleNivelHeaderClick = (
    event: React.MouseEvent<HTMLDivElement>,
    posicionId: number,
    nivelNum: number,
    defaultOpen: boolean
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    toggleNivel(posicionId, nivelNum, defaultOpen);
  };

  const abrirModalAgregarEvaluacion = (nivelId: number, posicionId: number) => {
    setNivelModalInfo({ nivelId, posicionId });
    setModalPlantillaIds([]);
    setModalNombresPorPlantilla({});
    setModalError(null);
    setModalMinimoAprobatorio('70');
    setModalFormulaDivisor('17');
    setModalFormulaMultiplicador('80');
    setShowAgregarEvaluacionModal(true);
  };

  const cerrarModalAgregarEvaluacion = () => {
    setShowAgregarEvaluacionModal(false);
    setNivelModalInfo(null);
    setModalPlantillaIds([]);
    setModalNombresPorPlantilla({});
    setModalError(null);
    setModalPlantillaDetalle(null);
    setModalFirmasDisponibles([]);
    setModalFirmasSeleccionadas({});
    setModalFirmasExtras([]);
    setModalFirmaExtraNombre('');
    setModalFirmaExtraIdentificador('');
    setModalMinimoAprobatorio('70');
    setModalFormulaDivisor('17');
    setModalFormulaMultiplicador('80');
    setPlantillaSearchQuery('');
    setPlantillaDropdownOpen(false);
    setPlantillaHighlightedIndex(-1);
  };

  const cerrarModalEditarEvaluacion = () => {
    setCurrentView('edit');
    setEditTab('posiciones');
    setEvaluacionEdicionContext(null);
    setEditarEvaluacionNombre('');
    setEditarEvaluacionFirmas([]);
    setEditarEvaluacionError(null);
    setEditarEvaluacionLoading(false);
    setCargandoEvaluacionEdicion(false);
    setAgregandoFirmaEvaluacion(false);
    setEliminandoFirmaEvaluacionId(null);
    setEditarFirmaNombre('');
    setEditarFirmaIdentificador('');
    setEditarEvaluacionMinimo(null);
    setEditarEvaluacionDivisor(17);
    setEditarEvaluacionMultiplicador(80);
    setEditarEvaluacionPuntos([]);
    setEditarEvaluacionCriterios([]);
    setEditarEvaluacionPaso(1);
  };

  const agregarPlantillaAlModal = async (plantillaId: number) => {
    if (modalPlantillaIds.includes(plantillaId)) return;
    setModalError(null);
    const plantilla = evaluacionesPlantillas.find(p => p.id === plantillaId);
    setModalPlantillaIds(prev => [...prev, plantillaId]);
    setModalNombresPorPlantilla(prev => ({ ...prev, [plantillaId]: plantilla?.nombre ?? '' }));

    if (modalPlantillaIds.length === 0) {
      try {
        const detalle = await apiService.getEvaluacion(plantillaId);
        setModalPlantillaDetalle(detalle);
        const firmasDisponibles = detalle.firmas || [];
        const firmasConEmpleado = [...firmasDisponibles];
        if (!firmasConEmpleado.some(firma => firma.tipo_firma === 'empleado')) {
          firmasConEmpleado.unshift({
            id: -1,
            tipo_firma: 'empleado',
            tipo_firma_display: 'Empleado',
            nombre: 'Empleado',
            usuario: null,
            usuario_nombre: '',
            orden: 0,
            esta_firmado: false,
            estado_display: 'Pendiente de asignación',
            pendiente_de: null,
            fecha_firma: null,
            imagen: null,
            created_at: '',
            updated_at: ''
          } as FirmaEvaluacion);
        }
        setModalFirmasDisponibles(firmasConEmpleado);
        setModalMinimoAprobatorio(
          detalle.minimo_aprobatorio !== undefined && detalle.minimo_aprobatorio !== null
            ? String(detalle.minimo_aprobatorio)
            : '70'
        );
        setModalFormulaDivisor(
          detalle.formula_divisor !== undefined && detalle.formula_divisor !== null
            ? String(detalle.formula_divisor)
            : '17'
        );
        setModalFormulaMultiplicador(
          detalle.formula_multiplicador !== undefined && detalle.formula_multiplicador !== null
            ? String(detalle.formula_multiplicador)
            : '80'
        );
        const seleccionInicial: Record<string, boolean> = {};
        firmasConEmpleado.forEach(firma => {
          seleccionInicial[firma.tipo_firma] = true;
        });
        setModalFirmasSeleccionadas(seleccionInicial);
        setModalFirmasExtras([]);
        setModalFirmaExtraNombre('');
        setModalFirmaExtraIdentificador('');
      } catch (error) {
        console.error('Error al cargar la plantilla seleccionada:', error);
        setModalPlantillaDetalle(null);
        setModalFirmasDisponibles([]);
        setModalError('No se pudieron cargar los datos de la plantilla seleccionada');
      }
    }
  };

  const quitarPlantillaDelModal = (plantillaId: number) => {
    setModalPlantillaIds(prev => prev.filter(id => id !== plantillaId));
    setModalNombresPorPlantilla(prev => {
      const next = { ...prev };
      delete next[plantillaId];
      return next;
    });
    setModalError(null);
    if (modalPlantillaIds.length === 1 && modalPlantillaIds[0] === plantillaId) {
      setModalPlantillaDetalle(null);
      setModalFirmasDisponibles([]);
      setModalFirmasSeleccionadas({});
      setModalFirmasExtras([]);
      setModalFirmaExtraNombre('');
      setModalFirmaExtraIdentificador('');
      setModalMinimoAprobatorio('70');
      setModalFormulaDivisor('17');
      setModalFormulaMultiplicador('80');
    }
  };

  const handleConfirmAgregarEvaluacion = async () => {
    if (!nivelModalInfo) return;
    if (modalPlantillaIds.length === 0) {
      setModalError('Selecciona al menos una plantilla');
      return;
    }
    for (const pid of modalPlantillaIds) {
      if (!(modalNombresPorPlantilla[pid] ?? '').trim()) {
        const nombrePlantilla = evaluacionesPlantillas.find(p => p.id === pid)?.nombre ?? 'Plantilla';
        setModalError(`Ingresa un nombre para la evaluación de "${nombrePlantilla}"`);
        return;
      }
    }

    setModalError(null);

    const minimoParsed = parseInt(modalMinimoAprobatorio || '', 10);
    const divisorParsed = parseInt(modalFormulaDivisor || '', 10);
    const multiplicadorParsed = parseInt(modalFormulaMultiplicador || '', 10);
    if (Number.isNaN(minimoParsed) || minimoParsed < 0 || minimoParsed > 100) {
      setModalError('Ingresa un mínimo aprobatorio válido entre 0 y 100.');
      return;
    }
    if (Number.isNaN(divisorParsed) || divisorParsed <= 0) {
      setModalError('Ingresa un divisor válido mayor a cero.');
      return;
    }
    if (Number.isNaN(multiplicadorParsed) || multiplicadorParsed < 0) {
      setModalError('Ingresa un multiplicador válido (0 o mayor).');
      return;
    }

    type FirmaPayload = { tipo_firma: string; nombre: string; orden?: number };

    const firmasSeleccionadasDesdePlantilla: FirmaPayload[] = modalFirmasDisponibles
      .filter(firma => modalFirmasSeleccionadas[firma.tipo_firma])
      .map(firma => ({
        tipo_firma: firma.tipo_firma,
        nombre: firma.nombre,
        orden: firma.orden ?? 0
      }));

    if (!firmasSeleccionadasDesdePlantilla.some(firma => firma.tipo_firma === 'empleado')) {
      firmasSeleccionadasDesdePlantilla.unshift({
        tipo_firma: 'empleado',
        nombre: 'Empleado',
        orden: 0
      });
    }

    const extrasNormalizados: FirmaPayload[] = [];
    for (const extra of modalFirmasExtras) {
      const slug = slugifyText(extra.identificador || extra.nombre);
      if (!slug) {
        setModalError('Cada firma adicional necesita un identificador válido.');
        return;
      }
      extrasNormalizados.push({
        tipo_firma: slug,
        nombre: extra.nombre.trim(),
        orden: 0
      });
    }

    const allFirmas = [...firmasSeleccionadasDesdePlantilla, ...extrasNormalizados];

    const slugs = new Set<string>();
    for (const firma of allFirmas) {
      if (!firma.nombre.trim()) {
        setModalError('Todas las firmas deben tener nombre.');
        return;
      }
      if (slugs.has(firma.tipo_firma)) {
        setModalError('Los identificadores de firma deben ser únicos.');
        return;
      }
      slugs.add(firma.tipo_firma);
    }

    try {
      for (const plantillaId of modalPlantillaIds) {
        const detalle = (modalPlantillaDetalle?.id === plantillaId ? modalPlantillaDetalle : null) ?? await apiService.getEvaluacion(plantillaId);
        await apiService.createEvaluacion({
          nombre: (modalNombresPorPlantilla[plantillaId] ?? '').trim(),
          es_plantilla: false,
          nivel_posicion: nivelModalInfo.nivelId,
          plantilla: plantillaId,
          supervisor: null,
          minimo_aprobatorio: minimoParsed,
          formula_divisor: divisorParsed,
          formula_multiplicador: multiplicadorParsed,
          is_active: true,
          puntos_evaluacion: detalle.puntos_evaluacion.map(p => ({
            pregunta: p.pregunta,
            orden: p.orden
          })),
          criterios_evaluacion: detalle.criterios_evaluacion.map(c => ({
            criterio: c.criterio,
            orden: c.orden
          })),
          firmas: allFirmas.map((firma, index) => ({
            ...firma,
            orden: firma.orden && firma.orden > 0 ? firma.orden : index + 1
          }))
        });
      }

      await loadNivelesYEvaluaciones([nivelModalInfo.posicionId]);
      cerrarModalAgregarEvaluacion();
    } catch (err: any) {
      const message = err?.message || 'Error al agregar la evaluación';
      setModalError(message);
    }
  };

  const toggleFirmaPlantilla = (tipoFirma: string) => {
    if (tipoFirma === 'empleado') {
      return;
    }
    setModalFirmasSeleccionadas(prev => ({
      ...prev,
      [tipoFirma]: !prev[tipoFirma]
    }));
    setModalError(null);
  };

  const handleAgregarFirmaExtra = () => {
    if (!modalFirmaExtraNombre.trim()) {
      setModalError('Ingresa el nombre visible de la firma adicional.');
      return;
    }
    const slug = slugifyText(modalFirmaExtraNombre);
    if (!slug) {
      setModalError('El nombre debe contener al menos un carácter válido.');
      return;
    }
    const existentes = new Set<string>([
      ...modalFirmasDisponibles.map(f => f.tipo_firma),
      ...modalFirmasExtras.map(extra => slugifyText(extra.identificador || extra.nombre))
    ]);
    if (existentes.has(slug)) {
      setModalError('Ya existe una firma con ese identificador en la evaluación.');
      return;
    }
    setModalFirmasExtras(prev => [
      ...prev,
      {
        nombre: modalFirmaExtraNombre.trim(),
        identificador: slug
      }
    ]);
    setModalFirmaExtraNombre('');
    setModalError(null);
  };

  const handleEliminarFirmaExtra = (index: number) => {
    setModalFirmasExtras(prev => prev.filter((_, i) => i !== index));
    setModalError(null);
  };

  const cargarEvaluacionParaEdicion = async (evaluacionId: number) => {
    const evaluacion = await apiService.getEvaluacion(evaluacionId);
    setEditarEvaluacionNombre(evaluacion.nombre || '');
    setEditarEvaluacionMinimo(
      evaluacion.minimo_aprobatorio !== undefined && evaluacion.minimo_aprobatorio !== null
        ? evaluacion.minimo_aprobatorio
        : 70
    );
    setEditarEvaluacionDivisor(
      evaluacion.formula_divisor !== undefined && evaluacion.formula_divisor !== null
        ? evaluacion.formula_divisor
        : 17
    );
    setEditarEvaluacionMultiplicador(
      evaluacion.formula_multiplicador !== undefined && evaluacion.formula_multiplicador !== null
        ? evaluacion.formula_multiplicador
        : 80
    );
    setEditarEvaluacionFirmas(evaluacion.firmas || []);
    setEditarEvaluacionPuntos(evaluacion.puntos_evaluacion || []);
    setEditarEvaluacionCriterios(evaluacion.criterios_evaluacion || []);
    setEditarFirmaNombre('');
    setEditarFirmaIdentificador('');
    return evaluacion;
  };

  const abrirModalEditarEvaluacion = async (evaluacionId: number, nivelId: number, posicionId: number) => {
    try {
      setEditarEvaluacionError(null);
      setCargandoEvaluacionEdicion(true);
      setEditarEvaluacionPaso(1);
      await cargarEvaluacionParaEdicion(evaluacionId);
      setEvaluacionEdicionContext({ evaluacionId, nivelId, posicionId });
      setCurrentView('edit-evaluacion');
    } catch (error) {
      console.error('Error al cargar la evaluación para edición:', error);
      setEditarEvaluacionError('No se pudieron cargar los datos de la evaluación.');
    } finally {
      setCargandoEvaluacionEdicion(false);
    }
  };

  const recargarEvaluacionEdicion = async () => {
    if (!evaluacionEdicionContext) return;
    try {
      const evaluacion = await cargarEvaluacionParaEdicion(evaluacionEdicionContext.evaluacionId);
      setEditarEvaluacionFirmas(evaluacion.firmas || []);
      setEditarEvaluacionPuntos(evaluacion.puntos_evaluacion || []);
      setEditarEvaluacionCriterios(evaluacion.criterios_evaluacion || []);
    } catch (error) {
      console.error('Error al recargar datos de la evaluación:', error);
      setEditarEvaluacionError('No se pudieron actualizar las firmas de la evaluación.');
    }
  };

  const handleGuardarCambiosEvaluacion = async () => {
    if (!evaluacionEdicionContext) return;
    if (!editarEvaluacionNombre.trim()) {
      setEditarEvaluacionError('Ingresa el nombre de la evaluación.');
      return;
    }
    if (
      editarEvaluacionMinimo === null ||
      Number.isNaN(editarEvaluacionMinimo) ||
      editarEvaluacionMinimo < 0 ||
      editarEvaluacionMinimo > 100
    ) {
      setEditarEvaluacionError('Ingresa un mínimo aprobatorio válido entre 0 y 100.');
      return;
    }
    if (
      editarEvaluacionDivisor === null ||
      Number.isNaN(editarEvaluacionDivisor) ||
      editarEvaluacionDivisor <= 0
    ) {
      setEditarEvaluacionError('Ingresa un divisor de fórmula mayor a cero.');
      return;
    }
    if (
      editarEvaluacionMultiplicador === null ||
      Number.isNaN(editarEvaluacionMultiplicador) ||
      editarEvaluacionMultiplicador < 0
    ) {
      setEditarEvaluacionError('Ingresa un multiplicador de fórmula válido (0 o mayor).');
      return;
    }

    try {
      setEditarEvaluacionLoading(true);
      await apiService.patchEvaluacion(evaluacionEdicionContext.evaluacionId, {
        nombre: editarEvaluacionNombre.trim(),
        minimo_aprobatorio: editarEvaluacionMinimo,
        formula_divisor: editarEvaluacionDivisor,
        formula_multiplicador: editarEvaluacionMultiplicador
      });
      showSuccess('Evaluación actualizada exitosamente');
      await loadNivelesYEvaluaciones([evaluacionEdicionContext.posicionId]);
      cerrarModalEditarEvaluacion();
    } catch (error: any) {
      console.error('Error al actualizar la evaluación:', error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.message ||
        'Error al actualizar la evaluación';
      setEditarEvaluacionError(message);
    } finally {
      setEditarEvaluacionLoading(false);
    }
  };

  const handleAgregarFirmaEdicion = async () => {
    if (!evaluacionEdicionContext) return;
    setEditarEvaluacionError(null);
    if (!editarFirmaNombre.trim()) {
      setEditarEvaluacionError('Ingresa el nombre visible de la firma.');
      return;
    }
    const slug = slugifyText(editarFirmaNombre);
    if (!slug) {
      setEditarEvaluacionError('El nombre debe contener al menos un carácter válido.');
      return;
    }
    if (editarEvaluacionFirmas.some(firma => firma.tipo_firma === slug)) {
      setEditarEvaluacionError('Ya existe una firma con ese identificador.');
      return;
    }

    try {
      setAgregandoFirmaEvaluacion(true);
      await apiService.createFirmaEvaluacion({
        evaluacion: evaluacionEdicionContext.evaluacionId,
        tipo_firma: slug,
        nombre: editarFirmaNombre.trim()
      });
      await recargarEvaluacionEdicion();
      setEditarFirmaNombre('');
      showSuccess('Firma agregada correctamente');
    } catch (error: any) {
      console.error('Error al agregar firma:', error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.tipo_firma?.[0] ||
        'Error al agregar la firma';
      setEditarEvaluacionError(message);
    } finally {
      setAgregandoFirmaEvaluacion(false);
    }
  };

  const handleEliminarFirmaEdicion = async (firma: FirmaEvaluacion) => {
    if (!evaluacionEdicionContext) return;
    setEditarEvaluacionError(null);
    if (firma.tipo_firma === 'empleado') {
      setEditarEvaluacionError('La firma de empleado es obligatoria y no puede eliminarse.');
      return;
    }
    if (firma.esta_firmado) {
      setEditarEvaluacionError('No puedes eliminar una firma que ya ha sido firmada.');
      return;
    }

    const ok = await confirm({
      title: 'Eliminar firma',
      message: '¿Eliminar esta firma de la evaluación?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      setEliminandoFirmaEvaluacionId(firma.id);
      await apiService.deleteFirmaEvaluacion(firma.id);
      await recargarEvaluacionEdicion();
      showSuccess('Firma eliminada correctamente');
    } catch (error: any) {
      console.error('Error al eliminar firma:', error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Error al eliminar la firma';
      setEditarEvaluacionError(message);
    } finally {
      setEliminandoFirmaEvaluacionId(null);
    }
  };
  const toggleNivel = (posicionId: number, nivelNum: number, abiertoPorDefecto: boolean) => {
    const key = `${posicionId}-${nivelNum}`;
    setNivelesAbiertos(prev => {
      const current = prev.hasOwnProperty(key) ? prev[key] : abiertoPorDefecto;
      return {
        ...prev,
        [key]: !current
      };
    });
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      is_active: true,
      include_onboarding: true,
      tipo_area: 'produccion',
      fase2_activa: false,
      n4_basicas_requeridas: 5,
      n4_complejas_requeridas: 3,
      grupos: [],
      posiciones: []
    });
  };

  // Funciones para gestionar grupos y posiciones
  const addGrupo = (formType: 'create' | 'edit') => {
    const newGrupo: GrupoNested = {
      name: '',
      is_active: true,
      supervisores: []
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

  const getFormulaPreviewData = (
    divisorValue: string | number | null,
    multiplicadorValue: string | number | null
  ) => {
    const parseValue = (value: string | number | null): number | null => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return null;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const divisorParsed = parseValue(divisorValue);
    const multiplicadorParsed = parseValue(multiplicadorValue);

    return {
      divisorParsed,
      multiplicadorParsed,
      divisorTexto: divisorParsed !== null ? divisorParsed : '--',
      multiplicadorTexto: multiplicadorParsed !== null ? multiplicadorParsed : '--'
    };
  };

  const modalFormulaPreview = getFormulaPreviewData(modalFormulaDivisor, modalFormulaMultiplicador);
  const editarFormulaPreview = getFormulaPreviewData(
    editarEvaluacionDivisor,
    editarEvaluacionMultiplicador
  );

  const renderEditarEvaluacionStep = () => {
    if (editarEvaluacionPaso === 1) {
      return (
        <div className="step-content step-general">
          <div className="form-group">
            <label>Nombre de la Evaluación *</label>
            <input
              type="text"
              value={editarEvaluacionNombre}
              onChange={(e) => {
                setEditarEvaluacionNombre(e.target.value);
                if (editarEvaluacionError) setEditarEvaluacionError(null);
              }}
              placeholder="Nombre de la evaluación"
            />
          </div>

          <div className="form-group">
            <label>Mínimo aprobatorio (%) *</label>
            <input
              type="number"
              min="0"
              max="100"
              value={editarEvaluacionMinimo ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setEditarEvaluacionMinimo(value === '' ? null : Math.max(0, Math.min(100, parseInt(value, 10) || 0)));
                if (editarEvaluacionError) setEditarEvaluacionError(null);
              }}
              placeholder="Ej. 70"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Divisor de fórmula *</label>
              <input
                type="number"
                min="1"
                value={editarEvaluacionDivisor ?? ''}
                onChange={(e) => {
                  setEditarEvaluacionDivisor(
                    e.target.value === '' ? null : Math.max(1, parseInt(e.target.value, 10) || 1)
                  );
                  if (editarEvaluacionError) setEditarEvaluacionError(null);
                }}
                placeholder="Ej. 17"
              />
            </div>
            <div className="form-group">
              <label>Multiplicador de fórmula *</label>
              <input
                type="number"
                min="0"
                value={editarEvaluacionMultiplicador ?? ''}
                onChange={(e) => {
                  setEditarEvaluacionMultiplicador(
                    e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
                  );
                  if (editarEvaluacionError) setEditarEvaluacionError(null);
                }}
                placeholder="Ej. 80"
              />
            </div>
          </div>

          <div className="formula-preview">
            <span className="formula-label">Vista previa de fórmula</span>
            <span className="formula-expression">
              Resultado (%) = ( PUNTOS OBTENIDOS / {editarFormulaPreview.divisorTexto} ) *{' '}
              {editarFormulaPreview.multiplicadorTexto}
            </span>
            {editarFormulaPreview.divisorParsed !== null &&
              editarFormulaPreview.divisorParsed > 0 &&
              editarFormulaPreview.multiplicadorParsed !== null && (
                <span className="formula-hint">
                  Ejemplo con 0 puntos: ( 0 / {editarFormulaPreview.divisorTexto} ) *{' '}
                  {editarFormulaPreview.multiplicadorTexto} = 0.00%
                </span>
              )}
          </div>
        </div>
      );
    }

    if (editarEvaluacionPaso === 2) {
      return (
        <div className="step-content step-list">
          <div className="detail-section">
            <h4>Puntos de Evaluación</h4>
            {editarEvaluacionPuntos.length > 0 ? (
              <div className="puntos-list">
                {editarEvaluacionPuntos.slice().sort((a, b) => a.orden - b.orden).map((punto, index) => (
                  <div key={punto.id} className="punto-item">
                    <div className="punto-header">
                      <span className="punto-orden">{index + 1}.</span>
                      <span className="punto-pregunta">{punto.pregunta}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">
                <p>No hay puntos de evaluación configurados.</p>
              </div>
            )}
            <div className="field-helper">
              Los puntos se gestionan desde la sección de plantillas.
            </div>
          </div>
        </div>
      );
    }

    if (editarEvaluacionPaso === 3) {
      return (
        <div className="step-content step-list">
          <div className="detail-section">
            <h4>Criterios de Evaluación</h4>
            {editarEvaluacionCriterios.length > 0 ? (
              <div className="criterios-list">
                {editarEvaluacionCriterios.slice().sort((a, b) => a.orden - b.orden).map((criterio, index) => (
                  <div key={criterio.id} className="criterio-item">
                    <div className="criterio-content">
                      <span className="criterio-orden">{index + 1}.</span>
                      <span className="criterio-texto">{criterio.criterio}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">
                <p>No hay criterios de evaluación configurados.</p>
              </div>
            )}
            <div className="field-helper">
              Los criterios se gestionan desde la sección de plantillas.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="step-content step-firmas">
        <div className="form-group">
          <label>Firmas configuradas</label>
          {editarEvaluacionFirmas.length === 0 ? (
            <div className="field-helper">No hay firmas configuradas para esta evaluación.</div>
          ) : (
            <div className="firmas-edit-grid">
              {editarEvaluacionFirmas.map((firma) => (
                <div
                  key={firma.id}
                  className={`firma-edit-item ${firma.esta_firmado ? 'firmada' : 'pendiente'}`}
                >
                  <div className="firma-edit-info">
                    <span className="firma-edit-nombre">{firma.nombre}</span>
                    <span className="firma-edit-identificador">
                      Identificador: {firma.tipo_firma}
                    </span>
                    <span className={`firma-edit-estado ${firma.esta_firmado ? 'firmada' : 'pendiente'}`}>
                      {firma.estado_display || (firma.esta_firmado ? 'Firmada' : 'Pendiente')}
                    </span>
                  </div>
                  {!firma.esta_firmado && firma.tipo_firma !== 'empleado' && (
                    <button
                      type="button"
                      className="btn-icon btn-remove-firma"
                      onClick={() => handleEliminarFirmaEdicion(firma)}
                      disabled={eliminandoFirmaEvaluacionId === firma.id}
                      title="Eliminar firma"
                    >
                      {eliminandoFirmaEvaluacionId === firma.id ? '...' : <FaTrash />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Agregar nueva firma</label>
          <div className="firma-extra-form">
            <div className="firma-extra-inputs">
              <input
                type="text"
                value={editarFirmaNombre}
                onChange={(e) => setEditarFirmaNombre(e.target.value)}
                placeholder="Nombre visible"
              />
            </div>
            <button
              type="button"
              className="btn-secondary btn-agregar-firma"
              onClick={handleAgregarFirmaEdicion}
              disabled={agregandoFirmaEvaluacion}
            >
              {agregandoFirmaEvaluacion ? 'Agregando...' : 'Agregar firma'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const areaTopbarOverride = useMemo(() => {
    if (currentView === 'list') {
      return null;
    }

    const breadcrumb: TopbarBreadcrumbItem[] = [
      {
        label: 'Gestión de Áreas',
        onClick: volverALista,
        isClickable: true,
      },
    ];

    if (selectedArea) {
      if (currentView === 'edit-evaluacion') {
        breadcrumb.push({
          label: selectedArea.name,
          onClick: cerrarModalEditarEvaluacion,
          isClickable: true,
        });
      } else {
        breadcrumb.push({
          label: selectedArea.name,
          isClickable: false,
        });
      }
    }

    if (currentView === 'edit-evaluacion') {
      breadcrumb.push({
        label: 'Editar evaluación',
        isClickable: false,
      });
    }

    return {
      breadcrumb,
      onBack:
        currentView === 'edit-evaluacion'
          ? cerrarModalEditarEvaluacion
          : volverALista,
      backLabel: 'Volver',
    };
  }, [currentView, selectedArea?.id, selectedArea?.name]);

  useTopbarOverride(areaTopbarOverride, [areaTopbarOverride]);

  useEffect(() => {
    const enEdicion = currentView !== 'list';
    document.documentElement.classList.toggle(
      'area-management-edit-activa',
      enEdicion,
    );
    return () => {
      document.documentElement.classList.remove('area-management-edit-activa');
    };
  }, [currentView]);

  if (loading) {
    return <div className="area-management-loading">Cargando áreas...</div>;
  }

  return (
    <div
      className={`area-management${
        currentView !== 'list' ? ' area-management--edit' : ''
      }`}
      ref={areaManagementRef}
    >
      <div className="area-management-body" data-scroll="true">
      {currentView === 'edit-evaluacion' && evaluacionEdicionContext ? (
        <div className="area-evaluacion-edit-screen">
          <div className="area-evaluacion-edit-body" data-scroll="true">
            {editarEvaluacionError && (
              <div className="field-error">{editarEvaluacionError}</div>
            )}
            {cargandoEvaluacionEdicion ? (
              <div className="section-empty">Cargando información de la evaluación...</div>
            ) : (
              <>
                <div className="edit-evaluacion-steps">
                  {pasosEdicionEvaluacion.map((paso) => (
                    <button
                      key={paso.id}
                      type="button"
                      className={`step-pill ${editarEvaluacionPaso === paso.id ? 'active' : ''}`}
                      onClick={() => setEditarEvaluacionPaso(paso.id)}
                      disabled={editarEvaluacionLoading || cargandoEvaluacionEdicion}
                    >
                      <span className="step-number">{paso.id}</span>
                      <span className="step-title">{paso.titulo}</span>
                    </button>
                  ))}
                </div>
                {renderEditarEvaluacionStep()}
              </>
            )}
          </div>
          <div className="area-evaluacion-edit-footer modal-actions-steps">
            <div className="step-navigation">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditarEvaluacionPaso((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                disabled={editarEvaluacionPaso === 1 || editarEvaluacionLoading || cargandoEvaluacionEdicion}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditarEvaluacionPaso((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))}
                disabled={editarEvaluacionPaso === 4 || editarEvaluacionLoading || cargandoEvaluacionEdicion}
              >
                Siguiente
              </button>
            </div>
            <div className="primary-actions">
              <button type="button" className="btn-secondary" onClick={cerrarModalEditarEvaluacion}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGuardarCambiosEvaluacion}
                disabled={editarEvaluacionLoading || cargandoEvaluacionEdicion}
              >
                {editarEvaluacionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      ) : currentView === 'list' ? (
        <>
      <div className="area-management-toolbar">
        <div className="area-management-toolbar-title">
          <h2>Áreas <span className="area-management-toolbar-count">({areas.length})</span></h2>
          <button
            className="btn-primary area-management-toolbar-cta"
            onClick={openCreateAreaModal}
          >
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
              aria-label="Buscar por nombre o descripción"
            />
          </div>

          <div className="filter-group filter-group-desktop">
            <FaFilter aria-hidden />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          <div
            className="filter-segmented"
            role="group"
            aria-label="Filtrar por estado"
          >
            <button
              type="button"
              className="filter-segmented-btn"
              aria-pressed={statusFilter === ''}
              onClick={() => setStatusFilter('')}
            >
              Todos
            </button>
            <button
              type="button"
              className="filter-segmented-btn"
              aria-pressed={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
            >
              Activas
            </button>
            <button
              type="button"
              className="filter-segmented-btn"
              aria-pressed={statusFilter === 'inactive'}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactivas
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="areas-card-grid">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            className="area-list-card"
            onClick={() => openEditModal(area)}
          >
            <span className="area-list-card__name">{area.name}</span>
            <span
              className={`area-list-card__status ${area.is_active ? 'is-active' : 'is-inactive'}`}
            >
              {area.is_active ? 'Activa' : 'Inactiva'}
            </span>
            <span className="area-list-card__date">
              {new Date(area.created_at).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>

      <div className="areas-table-container">
        <div className="areas-table-x-scroll">
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
              <tr 
                key={area.id}
                className="area-row-clickable"
                onClick={() => openEditModal(area)}
              >
                <td>{area.name}</td>
                <td>
                  <span className={`status-badge ${area.is_active ? 'status-active' : 'status-inactive'}`}>
                    {area.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>{new Date(area.created_at).toLocaleDateString()}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
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
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="area-management-back-top"
          onClick={handleBackToTop}
          aria-label="Volver arriba"
        >
          <FaArrowUp aria-hidden />
        </button>
      )}
        </>
      ) : (
        selectedArea && (
          <div className="area-edit-view">
            <form onSubmit={handleUpdateArea} className="area-edit-form area-edit-form--tabbed">
              <nav className="area-edit-tabs" aria-label="Secciones del área">
                {(
                  [
                    { id: 'general' as const, label: 'General' },
                    { id: 'grupos' as const, label: `Grupos (${editForm.grupos.length})` },
                    { id: 'posiciones' as const, label: `Posiciones (${editForm.posiciones.length})` },
                    ...(editForm.fase2_activa
                      ? [
                          { id: 'multihabilidad' as const, label: 'Multihabilidad' },
                          { id: 'examenes' as const, label: 'Exámenes' },
                        ]
                      : []),
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`area-edit-tabs__btn${editTab === tab.id ? ' is-active' : ''}`}
                    aria-current={editTab === tab.id ? 'page' : undefined}
                    onClick={() => setEditTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="area-edit-tab-panel">
              {editTab === 'general' && (
              <div className="area-edit-general">
              <div className="area-edit-general__row">
                <div className="form-group area-edit-general__name">
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
                <div className="form-group area-edit-general__tipo">
                  <label>Tipo de área</label>
                  <select
                    value={editForm.tipo_area}
                    onChange={(e) => setEditForm({...editForm, tipo_area: e.target.value as 'produccion' | 'soporte'})}
                  >
                    <option value="produccion">Producción</option>
                    <option value="soporte">Soporte</option>
                  </select>
                </div>
              </div>
              <div className="area-edit-toggles" role="group" aria-label="Opciones del área">
                <label className="area-edit-toggle">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                  />
                  <span>Área activa</span>
                </label>
                <label className="area-edit-toggle">
                  <input
                    type="checkbox"
                    checked={editForm.include_onboarding}
                    onChange={(e) => setEditForm({...editForm, include_onboarding: e.target.checked})}
                  />
                  <span>Onboarding</span>
                </label>
                <label className="area-edit-toggle">
                  <input
                    type="checkbox"
                    checked={editForm.fase2_activa}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEditForm({...editForm, fase2_activa: on});
                      setEditTab((tab) => {
                        if (on) return 'multihabilidad';
                        if (tab === 'multihabilidad' || tab === 'examenes') return 'general';
                        return tab;
                      });
                    }}
                  />
                  <span>Multihabilidad (Fase 2)</span>
                </label>
              </div>
              </div>
              )}

              {editTab === 'grupos' && (
              <section className="edit-section grupos-edit edit-section--flat">
                  <div className="section-title">
                  <h3><FaUsers /> Grupos</h3>
                  <button 
                    type="button" 
                    className="btn-add-grupo"
                      onClick={() => addGrupo('edit')}
                  >
                    <FaPlus /> Agregar
                  </button>
                </div>
                  {editForm.grupos.length === 0 ? (
                    <div className="section-empty">
                      No hay grupos configurados para esta área.
                    </div>
                  ) : (
                    <div className="grupos-row-list">
                      {editForm.grupos.map((grupo, grupoIndex) => (
                        <div key={grupoIndex} className="grupo-row-edit">
                      <input
                        type="text"
                        className="grupo-row-edit__name"
                        value={grupo.name}
                        onChange={(e) => updateGrupo(grupoIndex, 'name', e.target.value, 'edit')}
                        placeholder="Nombre del grupo"
                        required
                        aria-label={`Nombre grupo ${grupoIndex + 1}`}
                      />
                            <select
                              className="grupo-row-edit__supervisor"
                              value={(grupo.supervisores && grupo.supervisores[0])?.toString() || ''}
                              onChange={(e) => {
                                const id = e.target.value ? parseInt(e.target.value, 10) : null;
                                updateGrupo(grupoIndex, 'supervisores', id ? [id] : [], 'edit');
                              }}
                              aria-label={`Supervisor grupo ${grupoIndex + 1}`}
                            >
                              <option value="">Supervisor...</option>
                              {supervisoresDisponibles.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                  {sup.full_name}
                                </option>
                              ))}
                            </select>
                      <button 
                        type="button" 
                        className="btn-icon btn-delete grupo-row-edit__remove"
                              onClick={() => removeGrupo(grupoIndex, 'edit')}
                              title="Eliminar grupo"
                      >
                        <FaTrash />
                      </button>
                        </div>
                      ))}
              </div>
                  )}
                </section>
              )}

              {editTab === 'posiciones' && (
                <section className="edit-section posiciones-edit edit-section--flat">
                  <div className="section-title">
                  <h3><FaBriefcase /> Posiciones</h3>
                  <button 
                    type="button" 
                    className="btn-add-posicion"
                      onClick={() => addPosicion('edit')}
                  >
                    <FaPlus /> Agregar
                  </button>
                </div>

                  {editForm.posiciones.length === 0 ? (
                    <div className="section-empty">
                      No hay posiciones configuradas para esta área.
                    </div>
                  ) : (
                    <div className="posiciones-tablet-grid">
                      {editForm.posiciones.map((posicion, posicionIndex) => {
                        const posicionId = posicion.id ?? 0;
                        const niveles = nivelesPorPosicion[posicionId] || [];
                        const nivelesDisponibles: number[] = [1, 2, 3, 4];
                        const posicionKey = posicion.id ? `pos-${posicion.id}` : `pos-nuevo-${posicionIndex}`;
                        const isPosicionOpen = posicionExpandidaKey === posicionKey;
                        const nivelTabActivo = nivelTabPorPosicion[posicionKey] ?? 1;

                        return (
                          <div key={posicionIndex} className={`posicion-card-edit ${isPosicionOpen ? 'open' : ''}`}>
                            <div
                              className="posicion-card-edit-header"
                              onClick={(event) => handlePosicionHeaderClick(event, posicionKey, false)}
                            >
                              <button
                                type="button"
                                className="posicion-toggle"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePosicionExclusive(posicionKey);
                                }}
                                title={isPosicionOpen ? 'Ocultar detalles de la posición' : 'Mostrar detalles de la posición'}
                              >
                                {isPosicionOpen ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                              <div className="posicion-meta">
                                <span className="posicion-badge">{posicion.name || `Posición ${posicionIndex + 1}`}</span>
                                {posicion.id && (
                                  <span className="posicion-id">ID: {posicion.id}</span>
                                )}
                              </div>
                      <button 
                        type="button" 
                        className="btn-remove-posicion"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removePosicion(posicionIndex, 'edit');
                                }}
                                title="Eliminar posición"
                      >
                        <FaTrash />
                      </button>
                    </div>

                            <div className={`posicion-card-edit-content ${isPosicionOpen ? 'open' : ''}`}>
                              <div className="posicion-card-edit-body">
                        <label>Nombre de la Posición *</label>
                        <input
                          type="text"
                          value={posicion.name}
                                  onChange={(e) => updatePosicion(posicionIndex, 'name', e.target.value, 'edit')}
                                  placeholder="Ingresa el nombre de la posición"
                          required
                        />
                      </div>
                      
                              {posicionId === 0 ? (
                                <div className="posicion-alert">
                                  Guarda el área primero para administrar niveles y evaluaciones.
                    </div>
                              ) : (
                                <div className="niveles-wrapper">
                                  <h4>Niveles y Evaluaciones</h4>
                                  <div className="nivel-tabs-row" role="tablist" aria-label="Nivel de la posición">
                                    {nivelesDisponibles.map((nivelNum: number) => {
                                      const nivelEx = niveles.find((n: NivelPosicion) => n.nivel === nivelNum);
                                      const nId = nivelEx?.id ?? 0;
                                      const evalCount = nId
                                        ? (Array.isArray(evaluacionesPorNivel[nId])
                                            ? evaluacionesPorNivel[nId].length
                                            : 0)
                                        : 0;
                                      return (
                                        <button
                                          key={nivelNum}
                                          type="button"
                                          role="tab"
                                          aria-selected={nivelTabActivo === nivelNum}
                                          className={`nivel-tab-chip${nivelTabActivo === nivelNum ? ' is-active' : ''}${!nivelEx ? ' is-inactive' : ''}`}
                                          onClick={() =>
                                            setNivelTabPorPosicion((prev) => ({
                                              ...prev,
                                              [posicionKey]: nivelNum,
                                            }))
                                          }
                                        >
                                          N{nivelNum}
                                          {nivelEx ? ` (${evalCount})` : ''}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {(() => {
                                    const nivelNum = nivelTabActivo;
                                    const nivelExistente = niveles.find((n: NivelPosicion) => n.nivel === nivelNum);
                                    const nivelId = nivelExistente?.id ?? 0;
                                    const evalList = nivelId
                                      ? (Array.isArray(evaluacionesPorNivel[nivelId])
                                          ? evaluacionesPorNivel[nivelId]
                                          : [])
                                      : [];
                                    const nivelKey = `${posicionId}-${nivelNum}`;

                                    if (!nivelExistente) {
                                      return (
                                        <div className="nivel-tab-panel nivel-tab-panel--empty">
                                          <p className="nivel-empty">
                                            Nivel {nivelNum} no activo para esta posición.
                                          </p>
                                          <button
                                            type="button"
                                            className="btn-primary btn-sm"
                                            onClick={async () => {
                                              try {
                                                await apiService.createNivelPosicion({
                                                  posicion: posicionId,
                                                  nivel: nivelNum,
                                                  is_active: true,
                                                });
                                                await loadNivelesYEvaluaciones([posicionId]);
                                                setNivelTabPorPosicion((prev) => ({
                                                  ...prev,
                                                  [posicionKey]: nivelNum,
                                                }));
                                              } catch (err: unknown) {
                                                const msg =
                                                  err instanceof Error ? err.message : 'Error desconocido';
                                                showError(`Error al crear nivel: ${msg}`);
                                              }
                                            }}
                                          >
                                            <FaPlus /> Activar nivel {nivelNum}
                                          </button>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="nivel-tab-panel">
                                        <div className="nivel-tab-panel__actions">
                                          <button
                                            type="button"
                                            className="btn-primary btn-sm btn-add-evaluacion"
                                            onClick={() =>
                                              abrirModalAgregarEvaluacion(nivelExistente.id, posicionId)
                                            }
                                          >
                                            <FaPlus /> Agregar evaluación
                                          </button>
                                          <button
                                            type="button"
                                            className="btn-icon btn-delete"
                                            onClick={async () => {
                                              const ok = await confirm({
                                                title: 'Eliminar nivel',
                                                message: `¿Eliminar nivel ${nivelNum} y sus evaluaciones asignadas?`,
                                                confirmLabel: 'Eliminar',
                                                danger: true,
                                              });
                                              if (ok) {
                                                try {
                                                  await apiService.deleteNivelPosicion(nivelExistente.id);
                                                  await loadNivelesYEvaluaciones([posicionId]);
                                                } catch (err: unknown) {
                                                  const msg =
                                                    err instanceof Error ? err.message : 'Error desconocido';
                                                  showError(`Error al eliminar nivel: ${msg}`);
                                                }
                                              }
                                            }}
                                            title="Eliminar nivel"
                                          >
                                            <FaTrash />
                                          </button>
                                        </div>
                                        <ul className="evaluaciones-dense-list">
                                          {evalList.length === 0 ? (
                                            <li className="section-empty small">
                                              Sin evaluaciones en este nivel.
                                            </li>
                                          ) : (
                                            evalList.map((evaluacion) => (
                                              <li key={evaluacion.id}>
                                                <button
                                                  type="button"
                                                  className="evaluacion-dense-row"
                                                  onClick={() =>
                                                    abrirModalEditarEvaluacion(
                                                      evaluacion.id,
                                                      nivelExistente.id,
                                                      posicionId,
                                                    )
                                                  }
                                                >
                                                  <span className="evaluacion-dense-row__name">
                                                    {evaluacion.nombre}
                                                  </span>
                                                  <span className="evaluacion-dense-row__actions">
                                                    <FaEdit aria-hidden />
                                                  </span>
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn-icon btn-delete-evaluacion evaluacion-dense-row__delete"
                                                  onClick={() =>
                                                    handleEliminarEvaluacionNivel(
                                                      evaluacion.id,
                                                      posicionId,
                                                    )
                                                  }
                                                  disabled={eliminandoEvaluacionId === evaluacion.id}
                                                  title="Eliminar evaluación"
                                                >
                                                  {eliminandoEvaluacionId === evaluacion.id ? (
                                                    '...'
                                                  ) : (
                                                    <FaTrash />
                                                  )}
                                                </button>
                                              </li>
                                            ))
                                          )}
                                        </ul>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {editTab === 'multihabilidad' && editForm.fase2_activa && selectedArea && (
                <section className="edit-section edit-section--flat edit-section--multihabilidad">
                  <Fase2MultihabilidadEmbed areaId={selectedArea.id} />
                </section>
              )}

              {editTab === 'examenes' && editForm.fase2_activa && selectedArea && (
                <section className="edit-section edit-section--flat">
                  <BancoExamenEditor areaId={selectedArea.id} />
                </section>
              )}
              </div>

              <FieldError errors={editErrors.general} />

              {editTab !== 'multihabilidad' && editTab !== 'examenes' && (
              <div className="area-edit-footer">
                <button type="button" className="btn-secondary" onClick={volverALista}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar cambios
                </button>
              </div>
              )}
            </form>
          </div>
        )
      )
      }

      </div>

      {/* Modal: Crear Área */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nueva Área</h2>
            <form onSubmit={handleCreateArea} className="modal-form-wrap">
              <div className="modal-body">
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

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={createForm.include_onboarding}
                      onChange={(e) => setCreateForm({...createForm, include_onboarding: e.target.checked})}
                    />
                    Incluir Onboarding (Listas de Asistencia)
                  </label>
                </div>

                <div className="form-group">
                  <label>Tipo de área</label>
                  <select
                    value={createForm.tipo_area}
                    onChange={(e) => setCreateForm({...createForm, tipo_area: e.target.value as 'produccion' | 'soporte'})}
                  >
                    <option value="produccion">Producción</option>
                    <option value="soporte">Soporte</option>
                  </select>
                </div>
              </div>

              {/* Sección de Grupos */}
              <div className="grupos-section">
                <div className="section-header">
                  <h3><FaUsers /> Grupos ({createForm.grupos.length})</h3>
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
                      <div className="form-group">
                        <label>Supervisor del grupo</label>
                        <select
                          value={(grupo.supervisores && grupo.supervisores[0])?.toString() || ''}
                          onChange={(e) => {
                            const id = e.target.value ? parseInt(e.target.value, 10) : null;
                            updateGrupo(grupoIndex, 'supervisores', id ? [id] : [], 'create');
                          }}
                        >
                          <option value="">Seleccionar supervisor...</option>
                          {supervisoresDisponibles.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.full_name} — {sup.role_display}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección de Posiciones */}
              <div className="posiciones-section">
                <div className="section-header">
                  <h3><FaBriefcase /> Posiciones ({createForm.posiciones.length})</h3>
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
              </div>
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

      {/* Modal: Agregar evaluación a nivel */}
      {showAgregarEvaluacionModal && nivelModalInfo && (
        <div className="modal-overlay" onClick={cerrarModalAgregarEvaluacion}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <h2>Agregar evaluación al nivel</h2>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar Plantillas *</label>
                {modalPlantillaIds.length > 0 && (
                  <div className="plantilla-chips">
                    {modalPlantillaIds.map((plantillaId) => {
                      const plantilla = evaluacionesPlantillas.find((p) => p.id === plantillaId);
                      return (
                        <span key={plantillaId} className="plantilla-chip">
                          {plantilla?.nombre ?? `ID ${plantillaId}`}
                          <button
                            type="button"
                            className="plantilla-chip-remove"
                            onClick={() => quitarPlantillaDelModal(plantillaId)}
                            aria-label={`Quitar ${plantilla?.nombre ?? 'plantilla'}`}
                          >
                            <FaTimes />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div
                  className="plantilla-combobox"
                  ref={plantillaComboboxRef}
                >
                  <div className="plantilla-combobox-input-wrap">
                    <span className="plantilla-combobox-icon-wrap" aria-hidden>
                      <FaSearch className="plantilla-combobox-icon" />
                    </span>
                    <input
                      type="text"
                      value={plantillaSearchQuery}
                      onChange={(e) => {
                        setPlantillaSearchQuery(e.target.value);
                        setPlantillaDropdownOpen(true);
                        setPlantillaHighlightedIndex(plantillasDisponiblesParaAgregar.length > 0 ? 0 : -1);
                      }}
                      onFocus={() => {
                        setPlantillaDropdownOpen(true);
                        setPlantillaHighlightedIndex(plantillasDisponiblesParaAgregar.length > 0 ? 0 : -1);
                      }}
                      onKeyDown={(e) => {
                        if (!plantillaDropdownOpen) {
                          if (e.key === 'ArrowDown' || e.key === ' ') {
                            e.preventDefault();
                            setPlantillaDropdownOpen(true);
                            setPlantillaHighlightedIndex(plantillasDisponiblesParaAgregar.length > 0 ? 0 : -1);
                          }
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setPlantillaHighlightedIndex((i) =>
                            plantillasDisponiblesParaAgregar.length === 0 ? -1 : (i + 1) % plantillasDisponiblesParaAgregar.length
                          );
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setPlantillaHighlightedIndex((i) =>
                            plantillasDisponiblesParaAgregar.length === 0 ? -1 : (i - 1 + plantillasDisponiblesParaAgregar.length) % plantillasDisponiblesParaAgregar.length
                          );
                          return;
                        }
                        if (e.key === 'Enter' && plantillaHighlightedIndex >= 0 && plantillasDisponiblesParaAgregar[plantillaHighlightedIndex]) {
                          e.preventDefault();
                          const p = plantillasDisponiblesParaAgregar[plantillaHighlightedIndex];
                          agregarPlantillaAlModal(p.id);
                          setPlantillaSearchQuery('');
                          setPlantillaHighlightedIndex(0);
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setPlantillaDropdownOpen(false);
                          setPlantillaHighlightedIndex(-1);
                        }
                      }}
                      placeholder="Escribe para buscar plantilla..."
                      aria-label="Buscar y seleccionar plantilla (múltiple)"
                      aria-expanded={plantillaDropdownOpen}
                      aria-autocomplete="list"
                    />
                    <FaChevronDown
                      className={`plantilla-combobox-chevron ${plantillaDropdownOpen ? 'open' : ''}`}
                      aria-hidden
                    />
                  </div>
                  {plantillaDropdownOpen && (
                    <ul
                      className="plantilla-combobox-dropdown"
                      role="listbox"
                      id="plantilla-combobox-listbox"
                    >
                      {plantillasDisponiblesParaAgregar.length === 0 ? (
                        <li className="plantilla-combobox-empty" role="option">
                          {plantillaSearchQuery.trim() ? 'Ninguna plantilla disponible o ya están agregadas.' : 'Escribe para filtrar plantillas.'}
                        </li>
                      ) : (
                        plantillasDisponiblesParaAgregar.map((plantilla, index) => (
                          <li
                            key={plantilla.id}
                            role="option"
                            className={`plantilla-combobox-option ${index === plantillaHighlightedIndex ? 'highlighted' : ''}`}
                            onMouseEnter={() => setPlantillaHighlightedIndex(index)}
                            onClick={() => {
                              agregarPlantillaAlModal(plantilla.id);
                              setPlantillaSearchQuery('');
                              setPlantillaHighlightedIndex(-1);
                            }}
                          >
                            {plantilla.nombre}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
              {modalPlantillaIds.length > 0 && (
                <div className="form-group">
                  <label>Nombre de cada evaluación *</label>
                  {modalPlantillaIds.map((plantillaId) => {
                    const plantilla = evaluacionesPlantillas.find((p) => p.id === plantillaId);
                    return (
                      <div key={plantillaId} className="form-group nombre-evaluacion-row">
                        <label className="nombre-evaluacion-label">{plantilla?.nombre ?? `Plantilla ID ${plantillaId}`}</label>
                        <input
                          type="text"
                          value={modalNombresPorPlantilla[plantillaId] ?? ''}
                          onChange={(e) => {
                            setModalNombresPorPlantilla(prev => ({ ...prev, [plantillaId]: e.target.value }));
                            if (modalError) setModalError(null);
                          }}
                          placeholder="Nombre de la evaluación"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="form-group">
                <label>Mínimo aprobatorio (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={modalMinimoAprobatorio}
                  onChange={(e) => {
                    setModalMinimoAprobatorio(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder="Ej. 70"
                />
                  </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Divisor de fórmula *</label>
                  <input
                    type="number"
                    min="1"
                    value={modalFormulaDivisor}
                    onChange={(e) => {
                      setModalFormulaDivisor(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    placeholder="Ej. 17"
                  />
                  </div>
                <div className="form-group">
                  <label>Multiplicador de fórmula *</label>
                  <input
                    type="number"
                    min="0"
                    value={modalFormulaMultiplicador}
                    onChange={(e) => {
                      setModalFormulaMultiplicador(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    placeholder="Ej. 80"
                  />
                  </div>
                </div>

              <div className="formula-preview">
                <span className="formula-label">Vista previa de fórmula</span>
                <span className="formula-expression">
                  Resultado (%) = ( PUNTOS OBTENIDOS / {modalFormulaPreview.divisorTexto} ) *{' '}
                  {modalFormulaPreview.multiplicadorTexto}
                </span>
                {modalFormulaPreview.divisorParsed !== null &&
                  modalFormulaPreview.divisorParsed > 0 &&
                  modalFormulaPreview.multiplicadorParsed !== null && (
                    <span className="formula-hint">
                      Ejemplo con 0 puntos: ( 0 / {modalFormulaPreview.divisorTexto} ) *{' '}
                      {modalFormulaPreview.multiplicadorTexto} = 0.00%
                    </span>
                  )}
              </div>

              <div className="form-group">
                <label>Firmas de la plantilla</label>
                {modalPlantillaIds.length === 0 ? (
                  <div className="field-helper">
                    Selecciona al menos una plantilla para configurar las firmas (común para todas).
                  </div>
                ) : modalFirmasDisponibles.length === 0 ? (
                  <div className="field-helper">
                    La plantilla seleccionada no tiene firmas configuradas.
                  </div>
                ) : (
                  <div className="firmas-checklist">
                    {modalFirmasDisponibles.map((firma) => (
                      <label key={`${firma.tipo_firma}-${firma.id ?? 'nuevo'}`} className="firma-checkbox">
                        <input
                          type="checkbox"
                          checked={modalFirmasSeleccionadas[firma.tipo_firma] ?? true}
                          onChange={() => toggleFirmaPlantilla(firma.tipo_firma)}
                          disabled={firma.tipo_firma === 'empleado'}
                        />
                        <div className="firma-checkbox-info">
                          <span className="firma-checkbox-nombre">{firma.nombre}</span>
                          <span className="firma-checkbox-identificador">
                            Identificador: {firma.tipo_firma}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Firmas adicionales</label>
                <div className="firma-extra-form">
                  <div className="firma-extra-inputs">
                    <input
                      type="text"
                      value={modalFirmaExtraNombre}
                      onChange={(e) => setModalFirmaExtraNombre(e.target.value)}
                      placeholder="Nombre visible"
                    />
                  </div>
                  <button type="button" className="btn-secondary btn-agregar-firma" onClick={handleAgregarFirmaExtra}>
                    Agregar firma
                  </button>
                </div>
                {modalFirmasExtras.length > 0 && (
                  <div className="firma-extra-list">
                    {modalFirmasExtras.map((extra, index) => (
                      <div key={`${extra.identificador}-${index}`} className="firma-extra-item">
                        <div>
                          <div className="firma-extra-nombre">{extra.nombre}</div>
                          <div className="firma-extra-identificador">
                            Identificador: {extra.identificador}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-remove-firma"
                          onClick={() => handleEliminarFirmaExtra(index)}
                          title="Eliminar firma adicional"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {modalError && (
                <div className="field-error">
                  {modalError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrarModalAgregarEvaluacion}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmAgregarEvaluacion}>
                Agregar Evaluación
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      {confirmDialog}
    </div>
  );
};

export default AreaManagement;
