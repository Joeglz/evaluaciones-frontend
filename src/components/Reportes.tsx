import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaFileExcel, FaChartBar, FaTable } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiService, Area, AvanceGlobalResponse } from '../services/api';
import './Reportes.css';

// Colores corporativos
const COLORS = {
  red: '#e12026',
  redLight: '#eb6b6f',
  white: '#ffffff',
  black: '#1a1a1a',
  gray: '#666666',
  grayLight: '#e0e0e0',
  grayBg: '#f5f5f5',
};

// Paleta para Avance Global: Entrenamiento (duplica Nivel 1), Nivel 1, Nivel 2, Nivel 3, Nivel 4
const CHART_COLORS = ['#e12026', '#2563eb', '#16a34a', '#ea580c', '#7c3aed'];

// Paleta para varias áreas en la gráfica mensual (todas las áreas vs meses)
const AREA_CHART_COLORS = ['#e12026', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#c026d3'];

type TabType = 'avance-global' | 'advance-training-monthly' | 'advance-training-matrix';

type MonthlyRow = { month: string; [areaName: string]: string | number | null };

/** Agrupa filas de Avance Global por tipo de área (misma lógica que el backend). */
function splitAvanceGlobalByTipo(
  rows: AvanceGlobalResponse[],
  areasList: Area[]
): { produccion: AvanceGlobalResponse[]; soporte: AvanceGlobalResponse[] } {
  const produccion: AvanceGlobalResponse[] = [];
  const soporte: AvanceGlobalResponse[] = [];
  rows.forEach((row) => {
    const t = row.tipo_area ?? areasList.find((a) => a.id === row.area_id)?.tipo_area;
    if (t === 'soporte') soporte.push(row);
    else produccion.push(row);
  });
  return { produccion, soporte };
}

const MATRIX_EXPORT_DEFAULT_TARGETS = {
  training: 100,
  nivel_1: 100,
  nivel_2: 100,
  nivel_3: 100,
  nivel_4: 100,
};

const MATRIX_EXPORT_LEVEL_DEFS: {
  targetKey: keyof typeof MATRIX_EXPORT_DEFAULT_TARGETS;
  field: 'entrenamiento' | 'nivel_1' | 'nivel_2' | 'nivel_3' | 'nivel_4';
  label: string;
}[] = [
  { targetKey: 'training', field: 'entrenamiento', label: 'Entrenamiento' },
  { targetKey: 'nivel_1', field: 'nivel_1', label: 'Nivel 1' },
  { targetKey: 'nivel_2', field: 'nivel_2', label: 'Nivel 2' },
  { targetKey: 'nivel_3', field: 'nivel_3', label: 'Nivel 3' },
  { targetKey: 'nivel_4', field: 'nivel_4', label: 'Nivel 4' },
];

function gruposSinPromedioMatrixExport(grupos: any[]) {
  return (grupos || []).filter((g) => String(g.grupo_nombre).toUpperCase() !== 'PROMEDIO');
}

type MatrixColDescExport = {
  key: string;
  areaId: number;
  areaNombre: string;
  grupo: any;
};

function buildMatrixColumnsExport(areaList: any[]): MatrixColDescExport[] {
  const out: MatrixColDescExport[] = [];
  (areaList || []).forEach((ab) => {
    gruposSinPromedioMatrixExport(ab.grupos).forEach((c: any) => {
      out.push({
        key: `${ab.area_id}-${c.grupo_id ?? c.grupo_nombre}`,
        areaId: ab.area_id,
        areaNombre: ab.area_nombre,
        grupo: c,
      });
    });
  });
  return out;
}

function groupMatrixColsByAreaExport(cols: MatrixColDescExport[]) {
  const groups: { areaId: number; areaNombre: string; cols: MatrixColDescExport[] }[] = [];
  for (const cd of cols) {
    const last = groups[groups.length - 1];
    if (last && last.areaId === cd.areaId) {
      last.cols.push(cd);
    } else {
      groups.push({ areaId: cd.areaId, areaNombre: cd.areaNombre, cols: [cd] });
    }
  }
  return groups;
}

function valorGrupoMatrixExport(
  g: any,
  field: (typeof MATRIX_EXPORT_LEVEL_DEFS)[0]['field']
) {
  if (field === 'entrenamiento') {
    const v = g.entrenamiento ?? g.nivel_1;
    return typeof v === 'number' ? v : 0;
  }
  return typeof g[field] === 'number' ? g[field] : 0;
}

function promedioSeccionMatrixExport(cols: MatrixColDescExport[], field: (typeof MATRIX_EXPORT_LEVEL_DEFS)[0]['field']) {
  if (!cols.length) return 0;
  const vals = cols.map((cd) => valorGrupoMatrixExport(cd.grupo, field));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function promedioBackendPorAreaMatrixExport(
  areaList: any[],
  areaId: number,
  field: (typeof MATRIX_EXPORT_LEVEL_DEFS)[0]['field'],
  fallbackCols: MatrixColDescExport[]
): number {
  const ab = areaList.find((a) => a.area_id === areaId);
  const pg = ab?.grupos?.find(
    (g: { grupo_nombre?: string }) => String(g.grupo_nombre || '').toUpperCase() === 'PROMEDIO'
  );
  if (pg) {
    return valorGrupoMatrixExport(pg, field);
  }
  return promedioSeccionMatrixExport(fallbackCols, field);
}

function formatMatrixExcelPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

/** Convierte índice de columna 1-based (A=1) a letra de columna Excel. */
function matrixExportColLetter(col1Based: number): string {
  let n = col1Based;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function matrixExportMergeRowRange(ws: ExcelJS.Worksheet, row1Based: number, c1: number, c2: number) {
  if (c2 <= c1) return;
  ws.mergeCells(`${matrixExportColLetter(c1)}${row1Based}:${matrixExportColLetter(c2)}${row1Based}`);
}

function mergeNivelesChartRowsForExport(chartsBlock: {
  nivel_1?: { month: number; label: string; target: number; actual: number }[];
  nivel_2?: { month: number; label: string; target: number; actual: number }[];
  nivel_3?: { month: number; label: string; target: number; actual: number }[];
  nivel_4?: { month: number; label: string; target: number; actual: number }[];
}) {
  if (!chartsBlock?.nivel_1?.length) return [];
  return chartsBlock.nivel_1.map((row, i) => ({
    month: row.month,
    label: row.label,
    target: row.target,
    actual_n1: chartsBlock.nivel_1![i]?.actual ?? 0,
    actual_n2: chartsBlock.nivel_2![i]?.actual ?? 0,
    actual_n3: chartsBlock.nivel_3![i]?.actual ?? 0,
    actual_n4: chartsBlock.nivel_4![i]?.actual ?? 0,
  }));
}

interface ReportesProps {
  userRole?: string;
}

const Reportes: React.FC<ReportesProps> = ({ userRole }) => {
  const isAdmin = userRole === 'ADMIN';
  const [activeTab, setActiveTab] = useState<TabType>('avance-global');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [reportData, setReportData] = useState<AvanceGlobalResponse[]>([]);
  /** Para Advance Training Monthly: array de 12 respuestas (una por mes). Cada elemento es array de datos por área. */
  const [monthlyReportData, setMonthlyReportData] = useState<any[][]>([]);
  const [matrixReportData, setMatrixReportData] = useState<any>(null);
  const [matrixSelectedWeek, setMatrixSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [matrixViewMode, setMatrixViewMode] = useState<'table' | 'chart'>('table');
  const [exportingWithCharts, setExportingWithCharts] = useState<boolean>(false);
  const [exportChartData, setExportChartData] = useState<AvanceGlobalResponse[] | any[]>([]);
  const [exportChartType, setExportChartType] = useState<
    'avance-global' | 'advance-training-monthly' | 'advance-training-matrix' | null
  >(null);
  const [exportFileName, setExportFileName] = useState<string>('');
  const exportChartsContainerRef = useRef<HTMLDivElement>(null);
  const exportMatrixChartsContainerRef = useRef<HTMLDivElement>(null);
  /** Borradores de % para ene–mar: clave `areaId-mes` (mes 1, 2 o 3) */
  const [monthlyManualEdits, setMonthlyManualEdits] = useState<Record<string, string>>({});
  const [savingMonthlyManual, setSavingMonthlyManual] = useState(false);
  /** null = todas (admin); lista = ids de área permitidos para reportes (visor/entrenador/supervisor). */
  const [reportAllowedAreaIds, setReportAllowedAreaIds] = useState<number[] | null>(null);
  const [reportAreaScopeLoaded, setReportAreaScopeLoaded] = useState(false);

  // Helper para obtener el número de semana ISO
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Calcular semana actual del año
  useEffect(() => {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    setSelectedWeek(weekNumber);
    setSelectedYear(now.getFullYear());
    // Inicializar la semana del matrix con la semana actual
    setMatrixSelectedWeek(weekNumber);
  }, []);

  // Cargar áreas (solo id, name para dropdowns; minimal evita grupos/posiciones)
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await apiService.getAreas({ is_active: true, minimal: true });
        setAreas(areasData);
      } catch (error) {
        console.error('Error al cargar áreas:', error);
      }
    };
    loadAreas();
  }, []);

  useEffect(() => {
    if (!userRole) {
      setReportAllowedAreaIds([]);
      setReportAreaScopeLoaded(true);
      return;
    }
    if (userRole === 'ADMIN' || userRole === 'VISOR') {
      setReportAllowedAreaIds(null);
      setReportAreaScopeLoaded(true);
      return;
    }
    if (!['ENTRENADOR', 'SUPERVISOR'].includes(userRole)) {
      setReportAllowedAreaIds([]);
      setReportAreaScopeLoaded(true);
      return;
    }
    let cancelled = false;
    apiService
      .getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setReportAllowedAreaIds(Array.isArray(u.areas) ? u.areas : []);
        setReportAreaScopeLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setReportAllowedAreaIds([]);
        setReportAreaScopeLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userRole]);

  const areasForReporte = useMemo(() => {
    if (!reportAreaScopeLoaded) return [];
    if (userRole === 'ADMIN' || reportAllowedAreaIds === null) return areas;
    if (!reportAllowedAreaIds.length) return [];
    return areas.filter((a) => reportAllowedAreaIds.includes(a.id));
  }, [areas, userRole, reportAllowedAreaIds, reportAreaScopeLoaded]);

  useEffect(() => {
    if (!reportAreaScopeLoaded || userRole === 'ADMIN' || userRole === 'VISOR') return;
    if (areasForReporte.length === 0) {
      setSelectedArea(null);
      return;
    }
    if (areasForReporte.length === 1) {
      setSelectedArea(areasForReporte[0].id);
      return;
    }
    if (selectedArea != null && !areasForReporte.some((a) => a.id === selectedArea)) {
      setSelectedArea(null);
    }
  }, [reportAreaScopeLoaded, userRole, areasForReporte, selectedArea]);

  // Cargar datos del reporte
  useEffect(() => {
    const loadReportData = async () => {
      if (selectedWeek === null || selectedYear === null) return;
      
      setLoading(true);
      try {
        const params: any = {
          week: selectedWeek,
          year: selectedYear,
        };
        if (selectedArea !== null) {
          params.area_id = selectedArea;
        }
        const data = await apiService.getAvanceGlobal(params);
        setReportData(data);
      } catch (error) {
        console.error('Error al cargar reporte:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, [selectedArea, selectedWeek, selectedYear]);

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const avanceGlobalSplit = useMemo(
    () => splitAvanceGlobalByTipo(reportData, areas),
    [reportData, areas]
  );

  const buildExcelWithCharts = useCallback(async (
    dataArr: AvanceGlobalResponse[] | any[],
    chartImagesBase64: string[],
    fileName: string
  ) => {
    const workbook = new ExcelJS.Workbook();
    dataArr.forEach((areaData, idx) => {
      const areaName = (areaData.area_nombre || `Area_${idx + 1}`).substring(0, 31);
      const ws = workbook.addWorksheet(areaName, { views: [{ state: 'normal' }] });
      ws.columns = [
        { width: 22 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
      ];
      ws.addRow(['Grupo', 'Entrenamiento', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4']);
      (areaData.grupos || []).forEach((g: any) => {
        ws.addRow([
          g.grupo_nombre,
          formatPercentage(g.entrenamiento ?? g.nivel_1),
          formatPercentage(g.nivel_1),
          formatPercentage(g.nivel_2),
          formatPercentage(g.nivel_3),
          formatPercentage(g.nivel_4),
        ]);
      });
      if (chartImagesBase64[idx]) {
        const imageId = workbook.addImage({
          base64: chartImagesBase64[idx],
          extension: 'png',
        });
        const startRow = (areaData.grupos?.length ?? 0) + 3;
        ws.addImage(imageId, {
          tl: { col: 0, row: startRow },
          ext: { width: 640, height: 350 },
          editAs: 'oneCell',
        });
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const buildExcelMonthlyWithChart = useCallback(async (
    dataPoints: { month: string; [k: string]: string | number | null }[],
    chartImagesBase64: { produccion?: string; soporte?: string },
    fileName: string
  ) => {
    const areaNames = dataPoints.length > 0 ? Object.keys(dataPoints[0]).filter((k) => k !== 'month') : [];
    const areaNamesProduccion = areaNames.filter(
      (name) => (areas.find((a) => a.name === name)?.tipo_area ?? 'produccion') === 'produccion'
    );
    const areaNamesSoporte = areaNames.filter(
      (name) => areas.find((a) => a.name === name)?.tipo_area === 'soporte'
    );

    const workbook = new ExcelJS.Workbook();
    const appendTipoSheet = (sheetName: string, areaNamesTipo: string[], chartImageBase64?: string) => {
      if (!areaNamesTipo.length) return;
      const ws = workbook.addWorksheet(sheetName, { views: [{ state: 'normal' }] });
      ws.columns = [{ width: 22 }, ...dataPoints.map(() => ({ width: 12 })), { width: 14 }];
      ws.addRow(['Área', ...dataPoints.map((row) => row.month), 'Promedio anual']);
      areaNamesTipo.forEach((areaName) => {
        const valores = dataPoints.map((row) => row[areaName]).filter((v): v is number => typeof v === 'number');
        const promedioAnual = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
        ws.addRow([
          areaName,
          ...dataPoints.map((row) => (row[areaName] != null ? formatPercentage(Number(row[areaName])) : '')),
          promedioAnual != null ? formatPercentage(promedioAnual) : '',
        ]);
      });
      const promediosMensuales = dataPoints.map((row) => {
        const valores = areaNamesTipo.map((n) => row[n]).filter((v): v is number => typeof v === 'number');
        return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
      });
      const promedioGeneral = promediosMensuales.filter((v): v is number => typeof v === 'number');
      const promedioGeneralVal = promedioGeneral.length
        ? promedioGeneral.reduce((a, b) => a + b, 0) / promedioGeneral.length
        : null;
      ws.addRow([
        'Promedio',
        ...promediosMensuales.map((v) => (v != null ? formatPercentage(v) : '')),
        promedioGeneralVal != null ? formatPercentage(promedioGeneralVal) : '',
      ]);

      if (chartImageBase64) {
        const imageId = workbook.addImage({ base64: chartImageBase64, extension: 'png' });
        const startRow = areaNamesTipo.length + 3;
        ws.addImage(imageId, {
          tl: { col: 0, row: startRow },
          ext: { width: 640, height: 350 },
          editAs: 'oneCell',
        });
      }
    };

    appendTipoSheet('Producción', areaNamesProduccion, chartImagesBase64.produccion);
    appendTipoSheet('Soporte', areaNamesSoporte, chartImagesBase64.soporte);

    if (workbook.worksheets.length === 0) {
      const ws = workbook.addWorksheet('Avance por mes', { views: [{ state: 'normal' }] });
      ws.addRow(['Sin datos disponibles para exportar.']);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [areas]);

  type MatrixChartImageKey =
    | 'produccion-training'
    | 'produccion-niveles'
    | 'soporte-training'
    | 'soporte-niveles';

  const buildMatrixExcelWithTablesAndCharts = useCallback(
    async (
      payload: {
        week: number;
        produccion: { areas: any[] };
        soporte: { areas: any[] };
        level_targets?: Partial<typeof MATRIX_EXPORT_DEFAULT_TARGETS> & Record<string, number>;
      },
      imageMap: Partial<Record<MatrixChartImageKey, string>>,
      fileName: string
    ) => {
      const workbook = new ExcelJS.Workbook();
      const targets = { ...MATRIX_EXPORT_DEFAULT_TARGETS, ...payload.level_targets };
      const wk = payload.week;

      const appendTipoSheet = (
        areaList: any[],
        sheetTitle: string,
        chartKeys: [MatrixChartImageKey, MatrixChartImageKey]
      ) => {
        if (!areaList.length) return;
        const cols = buildMatrixColumnsExport(areaList);
        const ws = workbook.addWorksheet(sheetTitle, { views: [{ state: 'normal' }] });
        if (!cols.length) {
          ws.addRow([`CW ${wk} | Sin columnas`]);
          return;
        }
        const areaGroups = groupMatrixColsByAreaExport(cols);
        const promCol = 2 + cols.length;
        ws.getColumn(1).width = 28;
        for (let c = 2; c < promCol; c++) ws.getColumn(c).width = 14;
        ws.getColumn(promCol).width = 12;

        let r = 1;
        ws.getCell(r, 1).value = `CW ${wk} | % Training Matrix — ${sheetTitle}`;
        r += 2;
        ws.getCell(r, 1).value = 'Métrica';
        cols.forEach((cd, i) => {
          ws.getCell(r, 2 + i).value = `${cd.areaNombre} / ${cd.grupo.grupo_nombre}`;
        });
        ws.getCell(r, promCol).value = 'Promedio';
        r++;

        for (const def of MATRIX_EXPORT_LEVEL_DEFS) {
          const tgt = targets[def.targetKey] ?? 100;
          const prom = promedioSeccionMatrixExport(cols, def.field);

          ws.getCell(r, 1).value = `${def.label} (objetivo)`;
          let off = 0;
          for (const ag of areaGroups) {
            const n = ag.cols.length;
            const c1 = 2 + off;
            const c2 = c1 + n - 1;
            if (n > 1) {
              matrixExportMergeRowRange(ws, r, c1, c2);
            }
            ws.getCell(r, c1).value = formatMatrixExcelPct(tgt);
            off += n;
          }
          ws.getCell(r, promCol).value = '';
          r++;

          const filaValores = r;
          ws.getCell(filaValores, 1).value = def.label;
          cols.forEach((cd, i) => {
            ws.getCell(filaValores, 2 + i).value = formatMatrixExcelPct(valorGrupoMatrixExport(cd.grupo, def.field));
          });
          ws.getCell(filaValores, promCol).value = '';
          r++;

          ws.getCell(r, 1).value = 'Prom. área';
          off = 0;
          for (const ag of areaGroups) {
            const n = ag.cols.length;
            const c1 = 2 + off;
            const c2 = c1 + n - 1;
            const v = promedioBackendPorAreaMatrixExport(areaList, ag.areaId, def.field, ag.cols);
            if (n > 1) {
              matrixExportMergeRowRange(ws, r, c1, c2);
            }
            ws.getCell(r, c1).value = formatMatrixExcelPct(v);
            off += n;
          }
          ws.getCell(r, promCol).value = formatMatrixExcelPct(prom);
          r++;
        }

        let imageRow0 = r;
        const img1 = imageMap[chartKeys[0]];
        const img2 = imageMap[chartKeys[1]];
        if (img1) {
          const id = workbook.addImage({ base64: img1, extension: 'png' });
          ws.addImage(id, {
            tl: { col: 0, row: imageRow0 },
            ext: { width: 640, height: 300 },
            editAs: 'oneCell',
          });
          imageRow0 += 20;
        }
        if (img2) {
          const id2 = workbook.addImage({ base64: img2, extension: 'png' });
          ws.addImage(id2, {
            tl: { col: 0, row: imageRow0 },
            ext: { width: 640, height: 340 },
            editAs: 'oneCell',
          });
        }
      };

      if (payload.produccion.areas.length > 0) {
        appendTipoSheet(
          payload.produccion.areas,
          'Producción',
          ['produccion-training', 'produccion-niveles']
        );
      }
      if (payload.soporte.areas.length > 0) {
        appendTipoSheet(payload.soporte.areas, 'Soporte', ['soporte-training', 'soporte-niveles']);
      }
      if (!workbook.worksheets.length) {
        const w = workbook.addWorksheet('Matriz', { views: [{ state: 'normal' }] });
        w.addRow([`CW ${wk} | Sin datos`]);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  useEffect(() => {
    if (!exportChartType || !exportFileName) return;
    if (exportChartType === 'advance-training-matrix') {
      if (!matrixReportData) {
        setExportChartType(null);
        setExportFileName('');
        return;
      }
      setExportingWithCharts(true);
      let cancelled = false;
      const snapshot = matrixReportData;
      const nameSnapshot = exportFileName;
      const runMatrix = async () => {
        try {
          await new Promise((r) => setTimeout(r, 1100));
          if (cancelled) return;
          const order: MatrixChartImageKey[] = [
            'produccion-training',
            'produccion-niveles',
            'soporte-training',
            'soporte-niveles',
          ];
          const imageMap: Partial<Record<MatrixChartImageKey, string>> = {};
          const matrixContainer = exportMatrixChartsContainerRef.current;
          for (const key of order) {
            const el = matrixContainer?.querySelector(`[data-matrix-export="${key}"]`) as HTMLElement | null;
            if (!el) continue;
            const canvas = await html2canvas(el, {
              useCORS: true,
              scale: 2,
              backgroundColor: COLORS.white,
            });
            const dataUrl = canvas.toDataURL('image/png');
            imageMap[key] = dataUrl.replace(/^data:image\/png;base64,/, '');
          }
          if (cancelled) return;
          await buildMatrixExcelWithTablesAndCharts(
            {
              week: snapshot.week ?? 0,
              produccion: snapshot.produccion ?? { areas: [] },
              soporte: snapshot.soporte ?? { areas: [] },
              level_targets: snapshot.level_targets,
            },
            imageMap,
            nameSnapshot
          );
        } catch (e) {
          console.error('Exportación matriz a Excel:', e);
          if (!cancelled) {
            try {
              await buildMatrixExcelWithTablesAndCharts(
                {
                  week: snapshot.week ?? 0,
                  produccion: snapshot.produccion ?? { areas: [] },
                  soporte: snapshot.soporte ?? { areas: [] },
                  level_targets: snapshot.level_targets,
                },
                {},
                nameSnapshot
              );
            } catch (e2) {
              console.error('Exportación matriz (solo tablas):', e2);
            }
          }
        } finally {
          if (!cancelled) {
            setExportChartType(null);
            setExportFileName('');
            setExportingWithCharts(false);
          }
        }
      };
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          void runMatrix();
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameId);
      };
    }
    if (exportChartData.length === 0 || !exportChartType) return;
    const container = exportChartsContainerRef.current;
    if (!container) return;
    const runExport = async () => {
      setExportingWithCharts(true);
      try {
        await new Promise((r) => setTimeout(r, 900));
        const blocks = container.querySelectorAll('.reporte-chart-block');
        const images: string[] = [];
        for (let i = 0; i < blocks.length; i++) {
          const canvas = await html2canvas(blocks[i] as HTMLElement, {
            useCORS: true,
            scale: 2,
            backgroundColor: COLORS.white,
          });
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          images.push(base64);
        }
        if (exportChartType === 'advance-training-monthly') {
          const dataPoints = exportChartData as { month: string; [k: string]: string | number }[];
          await buildExcelMonthlyWithChart(
            dataPoints,
            { produccion: images[0], soporte: images[1] },
            exportFileName
          );
        } else {
          await buildExcelWithCharts(exportChartData as AvanceGlobalResponse[], images, exportFileName);
        }
      } finally {
        setExportChartData([]);
        setExportChartType(null);
        setExportFileName('');
        setExportingWithCharts(false);
      }
    };
    runExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exportación matriz usa snapshot en el momento del clic
  }, [exportChartData, exportChartType, exportFileName, buildMatrixExcelWithTablesAndCharts]);

  const getChartData = (data: AvanceGlobalResponse[]): { name: string; Entrenamiento: number; Nivel1: number; Nivel2: number; Nivel3: number; Nivel4: number }[] => {
    const result: { name: string; Entrenamiento: number; Nivel1: number; Nivel2: number; Nivel3: number; Nivel4: number }[] = [];
    data.forEach((areaData) => {
      (areaData.grupos || []).forEach((g) => {
        if (g.grupo_nombre.toUpperCase() !== 'PROMEDIO') {
          const ent = g.entrenamiento ?? g.nivel_1;
          result.push({
            name: g.grupo_nombre,
            Entrenamiento: ent,
            Nivel1: g.nivel_1,
            Nivel2: g.nivel_2,
            Nivel3: g.nivel_3,
            Nivel4: g.nivel_4,
          });
        }
      });
    });
    return result;
  };

  const isAverageRow = (grupoNombre: string): boolean => {
    return grupoNombre.toUpperCase() === 'PROMEDIO';
  };

  /** Indica si un mes (año + mes 1-12) es futuro respecto a la fecha actual (no mostrar resultados). */
  const isFutureMonth = (year: number, month1Based: number): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return year > currentYear || (year === currentYear && month1Based > currentMonth);
  };

  /** Datos mensuales (gráfica y tablas); ene–mar pueden superponer borradores de admin. */
  const monthlyChartData: MonthlyRow[] = useMemo(() => {
    if (!monthlyReportData.length || monthlyReportData.some((m) => !Array.isArray(m))) return [];
    const year = selectedYear ?? new Date().getFullYear();
    const base: MonthlyRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthIdx) => {
      const monthLabel = new Date(year, monthIdx - 1, 1).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
      const point: MonthlyRow = { month: monthLabel };
      const monthResponse = monthlyReportData[monthIdx - 1] as any[] | undefined;
      const isFuture = isFutureMonth(year, monthIdx);
      if (!monthResponse) return point;
      monthResponse.forEach((areaData: any) => {
        if (isFuture) {
          point[areaData.area_nombre] = null;
          return;
        }
        const prom = areaData.grupos?.find((g: any) => String(g.grupo_nombre).toUpperCase() === 'PROMEDIO');
        const val = prom
          ? (prom.entrenamiento ??
              (prom.nivel_1 + prom.nivel_2 + prom.nivel_3 + prom.nivel_4) / 4)
          : 0;
        point[areaData.area_nombre] = typeof val === 'number' ? val : 0;
      });
      return point;
    });
    if (!isAdmin || !Object.keys(monthlyManualEdits).length) return base;
    return base.map((row, monthIndex) => {
      const month = monthIndex + 1;
      if (month !== 1 && month !== 2 && month !== 3) return row;
      const copy = { ...row };
      areas.forEach((a) => {
        const k = `${a.id}-${month}`;
        if (monthlyManualEdits[k] !== undefined) {
          const n = parseFloat(String(monthlyManualEdits[k]).replace(',', '.'));
          if (Number.isFinite(n)) {
            copy[a.name] = n;
          }
        }
      });
      return copy;
    });
  }, [monthlyReportData, selectedYear, monthlyManualEdits, areas, isAdmin]);

  const reloadMonthlyReportData = useCallback(async () => {
    if (selectedYear === null || activeTab !== 'advance-training-monthly') return;
    setLoading(true);
    try {
      const promises = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) =>
        apiService.getAdvanceTrainingMonthly({ month, year: selectedYear })
      );
      const results = await Promise.all(promises);
      setMonthlyReportData(results);
    } catch (error) {
      console.error('Error al cargar reporte mensual:', error);
      setMonthlyReportData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, activeTab]);

  // Cargar datos del reporte mensual: 12 meses del año seleccionado
  useEffect(() => {
    reloadMonthlyReportData();
  }, [reloadMonthlyReportData]);

  useEffect(() => {
    setMonthlyManualEdits({});
  }, [selectedYear]);

  // Inicializar año actual cuando se cambia a la pestaña mensual
  useEffect(() => {
    if (activeTab === 'advance-training-monthly' && selectedYear === null) {
      setSelectedYear(new Date().getFullYear());
    }
  }, [activeTab, selectedYear]);

  // Cargar datos del reporte matrix
  useEffect(() => {
    const loadMatrixReportData = async () => {
      if (matrixSelectedWeek === null || selectedYear === null || activeTab !== 'advance-training-matrix') return;
      
      setLoading(true);
      try {
        const params: any = {
          week: matrixSelectedWeek,
          year: selectedYear,
        };
        const data = await apiService.getAdvanceTrainingMatrix(params);
        setMatrixReportData(data);
      } catch (error) {
        console.error('Error al cargar reporte matrix:', error);
        setMatrixReportData(null);
      } finally {
        setLoading(false);
      }
    };
    loadMatrixReportData();
  }, [matrixSelectedWeek, selectedYear, activeTab]);

  const renderAvanceGlobal = () => (
    <>
      <div className="reportes-filters">
        <div className="filter-group">
          <label>Área:</label>
          <select
            value={selectedArea || ''}
            onChange={(e) => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)}
          >
            {(userRole === 'ADMIN' || areasForReporte.length !== 1) && (
              <option value="">Todas las áreas</option>
            )}
            {areasForReporte.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Semana (CW):</label>
          <input
            type="number"
            min="1"
            max="53"
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>

        <div className="filter-group">
          <label>Año:</label>
          <input
            type="number"
            min="2020"
            max="2100"
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
        <div className="reportes-actions">
          <div className="view-toggle">
            <button
              type="button"
              className={`btn-view ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <FaTable /> Tabla
            </button>
            <button
              type="button"
              className={`btn-view ${viewMode === 'chart' ? 'active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              <FaChartBar /> Gráfica
            </button>
          </div>
          <button
            type="button"
            className="btn-export-excel"
            onClick={() => {
              if (reportData.length === 0) return;
              setExportChartData([...avanceGlobalSplit.produccion, ...avanceGlobalSplit.soporte]);
              setExportChartType('avance-global');
              setExportFileName(`Reporte_Avance_Global_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }}
            disabled={reportData.length === 0 || exportingWithCharts}
          >
            <FaFileExcel /> {exportingWithCharts ? 'Exportando...' : 'Exportar a Excel'}
          </button>
        </div>
        </div>

      {loading ? (
        <div className="reportes-loading">Cargando datos...</div>
      ) : viewMode === 'chart' ? (
        <div className="reportes-chart-container">
          {avanceGlobalSplit.produccion.length > 0 && (
            <>
              <h2 className="matrix-section-title">Producción</h2>
              {avanceGlobalSplit.produccion.map((areaData) => (
                <div key={areaData.area_id} className="reporte-chart-block">
                  <h3 className="reporte-chart-title">CW {areaData.week} - {areaData.area_nombre}</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getChartData([areaData])} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                      <XAxis dataKey="name" stroke={COLORS.black} angle={-35} textAnchor="end" height={80} />
                      <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip formatter={(value: number | undefined) => (value != null ? [`${value.toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                      <Legend />
                      <Bar dataKey="Entrenamiento" fill={CHART_COLORS[0]} name="Entrenamiento" />
                      <Bar dataKey="Nivel1" fill={CHART_COLORS[1]} name="Nivel 1" />
                      <Bar dataKey="Nivel2" fill={CHART_COLORS[2]} name="Nivel 2" />
                      <Bar dataKey="Nivel3" fill={CHART_COLORS[3]} name="Nivel 3" />
                      <Bar dataKey="Nivel4" fill={CHART_COLORS[4]} name="Nivel 4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </>
          )}
          {avanceGlobalSplit.soporte.length > 0 && (
            <>
              <h2 className="matrix-section-title">Soporte</h2>
              {avanceGlobalSplit.soporte.map((areaData) => (
                <div key={areaData.area_id} className="reporte-chart-block">
                  <h3 className="reporte-chart-title">CW {areaData.week} - {areaData.area_nombre}</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getChartData([areaData])} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                      <XAxis dataKey="name" stroke={COLORS.black} angle={-35} textAnchor="end" height={80} />
                      <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip formatter={(value: number | undefined) => (value != null ? [`${value.toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                      <Legend />
                      <Bar dataKey="Entrenamiento" fill={CHART_COLORS[0]} name="Entrenamiento" />
                      <Bar dataKey="Nivel1" fill={CHART_COLORS[1]} name="Nivel 1" />
                      <Bar dataKey="Nivel2" fill={CHART_COLORS[2]} name="Nivel 2" />
                      <Bar dataKey="Nivel3" fill={CHART_COLORS[3]} name="Nivel 3" />
                      <Bar dataKey="Nivel4" fill={CHART_COLORS[4]} name="Nivel 4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </>
          )}
          {reportData.length === 0 && (
            <div className="reportes-empty">No hay datos disponibles para los filtros seleccionados.</div>
          )}
        </div>
      ) : (
        <div className="reportes-content">
          {avanceGlobalSplit.produccion.length > 0 && (
            <>
              <h2 className="matrix-section-title">Producción</h2>
              {avanceGlobalSplit.produccion.map((areaData) => (
                <div key={areaData.area_id} className="reporte-table-container">
                  <div className="reporte-table-header">
                    <div className="reporte-week-label">CW {areaData.week}</div>
                    <h2>{areaData.area_nombre}</h2>
                  </div>
                  <table className="reporte-table">
                    <thead>
                      <tr>
                        <th>Grupo</th>
                        <th>Entrenamiento</th>
                        <th>Nivel 1</th>
                        <th>Nivel 2</th>
                        <th>Nivel 3</th>
                        <th>Nivel 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areaData.grupos.map((grupo, index) => (
                        <tr
                          key={`${areaData.area_id}-${grupo.grupo_id ?? 'promedio'}-${index}`}
                          className={isAverageRow(grupo.grupo_nombre) ? 'average-row' : ''}
                        >
                          <td className="grupo-cell">{grupo.grupo_nombre}</td>
                          <td>{formatPercentage((grupo as any).entrenamiento ?? grupo.nivel_1)}</td>
                          <td>{formatPercentage(grupo.nivel_1)}</td>
                          <td>{formatPercentage(grupo.nivel_2)}</td>
                          <td>{formatPercentage(grupo.nivel_3)}</td>
                          <td>{formatPercentage(grupo.nivel_4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
          {avanceGlobalSplit.soporte.length > 0 && (
            <>
              <h2 className="matrix-section-title">Soporte</h2>
              {avanceGlobalSplit.soporte.map((areaData) => (
                <div key={areaData.area_id} className="reporte-table-container">
                  <div className="reporte-table-header">
                    <div className="reporte-week-label">CW {areaData.week}</div>
                    <h2>{areaData.area_nombre}</h2>
                  </div>
                  <table className="reporte-table">
                    <thead>
                      <tr>
                        <th>Grupo</th>
                        <th>Entrenamiento</th>
                        <th>Nivel 1</th>
                        <th>Nivel 2</th>
                        <th>Nivel 3</th>
                        <th>Nivel 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areaData.grupos.map((grupo, index) => (
                        <tr
                          key={`${areaData.area_id}-${grupo.grupo_id ?? 'promedio'}-${index}`}
                          className={isAverageRow(grupo.grupo_nombre) ? 'average-row' : ''}
                        >
                          <td className="grupo-cell">{grupo.grupo_nombre}</td>
                          <td>{formatPercentage((grupo as any).entrenamiento ?? grupo.nivel_1)}</td>
                          <td>{formatPercentage(grupo.nivel_1)}</td>
                          <td>{formatPercentage(grupo.nivel_2)}</td>
                          <td>{formatPercentage(grupo.nivel_3)}</td>
                          <td>{formatPercentage(grupo.nivel_4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
          {reportData.length === 0 && !loading && (
            <div className="reportes-empty">
              No hay datos disponibles para los filtros seleccionados.
            </div>
          )}
        </div>
      )}
      </>
    );

  const renderAdvanceTrainingMonthly = () => {
    const areaNames = monthlyChartData.length > 0
      ? Object.keys(monthlyChartData[0]).filter((k) => k !== 'month')
      : [];

    const areaNamesProduccion = areaNames.filter(
      (name) => (areas.find((a) => a.name === name)?.tipo_area ?? 'produccion') === 'produccion'
    );
    const areaNamesSoporte = areaNames.filter(
      (name) => areas.find((a) => a.name === name)?.tipo_area === 'soporte'
    );

    const yearChart = selectedYear ?? new Date().getFullYear();
    const monthlyChartDataProduccion = monthlyChartData.length
      ? monthlyChartData.map((row, monthIndex) => {
          const isFuture = isFutureMonth(yearChart, monthIndex + 1);
          const valores = areaNamesProduccion
            .map((name) => row[name])
            .filter((v): v is number => typeof v === 'number');
          const prom = !isFuture && valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
          return { month: row.month, Promedio: prom };
        })
      : [];
    const monthlyChartDataSoporte = monthlyChartData.length
      ? monthlyChartData.map((row, monthIndex) => {
          const isFuture = isFutureMonth(yearChart, monthIndex + 1);
          const valores = areaNamesSoporte
            .map((name) => row[name])
            .filter((v): v is number => typeof v === 'number');
          const prom = !isFuture && valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
          return { month: row.month, Promedio: prom };
        })
      : [];

    const handleSaveMonthlyManual = async () => {
      if (!isAdmin || selectedYear === null) return;
      const buildItems = (month: number) => {
        const monthIdx = month - 1;
        return areaNames
          .map((name) => {
            const aid = areas.find((a) => a.name === name)?.id;
            if (!aid) return null;
            const k = `${aid}-${month}`;
            let v: number;
            if (monthlyManualEdits[k] !== undefined) {
              const p = parseFloat(String(monthlyManualEdits[k]).replace(',', '.'));
              if (!Number.isFinite(p)) return null;
              v = p;
            } else {
              const row = monthlyChartData[monthIdx];
              const val = row[name];
              v = typeof val === 'number' ? val : 0;
            }
            if (v < 0 || v > 100) {
              window.alert(`El porcentaje debe estar entre 0 y 100 (${name}).`);
              return null;
            }
            return { area_id: aid, porcentaje: v };
          })
          .filter((x): x is { area_id: number; porcentaje: number } => x != null);
      };
      setSavingMonthlyManual(true);
      try {
        for (const month of [1, 2, 3] as const) {
          await apiService.saveAdvanceTrainingMonthlyManual({
            year: selectedYear,
            month,
            items: buildItems(month),
          });
        }
        await reloadMonthlyReportData();
        setMonthlyManualEdits({});
        window.alert('Valores de enero, febrero y marzo guardados correctamente.');
      } catch (e: unknown) {
        console.error(e);
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Error al guardar.';
        window.alert(msg);
      } finally {
        setSavingMonthlyManual(false);
      }
    };

    const renderMesAreaCell = (
      areaName: string,
      monthIndex: number,
      rawValue: number | string | null | undefined
    ): React.ReactNode => {
      const year = selectedYear ?? new Date().getFullYear();
      const isFuture = isFutureMonth(year, monthIndex + 1);
      const month = monthIndex + 1;
      const areaId = areas.find((a) => a.name === areaName)?.id;
      const editable =
        isAdmin && !isFuture && (month === 1 || month === 2 || month === 3) && areaId != null;
      const value = typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue);
      if (!editable) {
        return isFuture || value == null ? '—' : formatPercentage(Number(value));
      }
      const k = `${areaId}-${month}`;
      const display =
        monthlyManualEdits[k] !== undefined
          ? monthlyManualEdits[k]
          : value != null
            ? String(Number(value).toFixed(2))
            : '';
      return (
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          className="reporte-monthly-input"
          aria-label={`${areaName} ${monthlyChartData[monthIndex]?.month ?? ''}`}
          value={display}
          onChange={(e) =>
            setMonthlyManualEdits((prev) => ({ ...prev, [k]: e.target.value }))
          }
        />
      );
    };

    return (
      <>
        <div className="reportes-filters">
          <div className="filter-group">
            <label>Año:</label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={selectedYear ?? ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          <div className="reportes-actions">
            <div className="view-toggle">
              <button
                type="button"
                className={`btn-view ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <FaTable /> Tabla
              </button>
              <button
                type="button"
                className={`btn-view ${viewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setViewMode('chart')}
              >
                <FaChartBar /> Gráfica
              </button>
            </div>
            <button
              type="button"
              className="btn-export-excel"
              onClick={() => {
                if (monthlyChartData.length === 0) return;
                setExportChartData(monthlyChartData);
                setExportChartType('advance-training-monthly');
                setExportFileName(`Reporte_Mensual_${selectedYear ?? new Date().getFullYear()}.xlsx`);
              }}
              disabled={monthlyChartData.length === 0 || exportingWithCharts}
            >
              <FaFileExcel /> {exportingWithCharts ? 'Exportando...' : 'Exportar a Excel'}
            </button>
            {isAdmin && viewMode === 'table' && (
              <button
                type="button"
                className="btn-save-monthly-manual"
                onClick={handleSaveMonthlyManual}
                disabled={savingMonthlyManual || monthlyChartData.length === 0 || selectedYear === null}
              >
                {savingMonthlyManual ? 'Guardando...' : 'Guardar ene / feb / mar'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="reportes-loading">Cargando datos...</div>
        ) : selectedYear === null ? (
          <div className="reportes-empty">Selecciona un año para ver el avance de todas las áreas por mes.</div>
        ) : viewMode === 'chart' ? (
          <div className="reportes-chart-container reportes-chart-dos-graficas">
            {areaNamesProduccion.length > 0 && (
              <div className="reporte-chart-block">
                <h3 className="reporte-chart-title">
                  Avance por mes - {selectedYear} — Producción
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyChartDataProduccion} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                    <XAxis dataKey="month" stroke={COLORS.black} />
                    <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number | undefined, name?: string) => (value != null ? [`${Number(value).toFixed(2)}%`, name ?? 'Promedio'] : '')}
                      contentStyle={{ borderColor: COLORS.red }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Promedio"
                      name="Promedio"
                      stroke={COLORS.red}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {areaNamesSoporte.length > 0 && (
              <div className="reporte-chart-block">
                <h3 className="reporte-chart-title">
                  Avance por mes - {selectedYear} — Soporte
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyChartDataSoporte} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                    <XAxis dataKey="month" stroke={COLORS.black} />
                    <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number | undefined, name?: string) => (value != null ? [`${Number(value).toFixed(2)}%`, name ?? 'Promedio'] : '')}
                      contentStyle={{ borderColor: COLORS.red }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Promedio"
                      name="Promedio"
                      stroke={AREA_CHART_COLORS[1]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {monthlyChartData.length === 0 && !loading && (
              <div className="reportes-empty">No hay datos disponibles para el año seleccionado.</div>
            )}
            {monthlyChartData.length > 0 && areaNamesProduccion.length === 0 && areaNamesSoporte.length === 0 && (
              <div className="reportes-empty">No hay áreas de producción ni soporte con datos.</div>
            )}
          </div>
        ) : (
          <div className="reportes-content reportes-monthly-tables">
            {areaNamesProduccion.length > 0 && (
              <div className="reporte-table-container reporte-tipo-block">
                <div className="reporte-table-header">
                  <h2>Avance por mes - {selectedYear} — Producción</h2>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Área</th>
                      {monthlyChartData.map((row) => (
                        <th key={row.month}>{row.month}</th>
                      ))}
                      <th>Promedio anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaNamesProduccion.map((name) => {
                      const valoresAnuales = monthlyChartData
                        .map((row) => row[name])
                        .filter((v): v is number => typeof v === 'number');
                      const promedioAnual = valoresAnuales.length
                        ? valoresAnuales.reduce((a, b) => a + b, 0) / valoresAnuales.length
                        : null;
                      return (
                        <tr key={name}>
                          <td className="grupo-cell">{name}</td>
                          {monthlyChartData.map((row, monthIndex) => {
                            const value = row[name];
                            return (
                              <td key={row.month}>
                                {renderMesAreaCell(name, monthIndex, value)}
                              </td>
                            );
                          })}
                          <td className="promedio-anual-cell">
                            {promedioAnual != null ? formatPercentage(promedioAnual) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="promedio-row">
                      <td className="grupo-cell">Promedio</td>
                      {monthlyChartData.map((row, monthIndex) => {
                        const year = selectedYear ?? new Date().getFullYear();
                        const isFuture = isFutureMonth(year, monthIndex + 1);
                        const valores = areaNamesProduccion
                          .map((name) => row[name])
                          .filter((v): v is number => typeof v === 'number');
                        const promedioMes = !isFuture && valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                        return (
                          <td key={row.month}>
                            {promedioMes != null ? formatPercentage(promedioMes) : '—'}
                          </td>
                        );
                      })}
                      <td className="promedio-anual-cell">
                        {(() => {
                          const promediosMensuales = monthlyChartData
                            .map((row, monthIndex) => {
                              const year = selectedYear ?? new Date().getFullYear();
                              const isFuture = isFutureMonth(year, monthIndex + 1);
                              if (isFuture) return null;
                              const valores = areaNamesProduccion
                                .map((name) => row[name])
                                .filter((v): v is number => typeof v === 'number');
                              return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                            })
                            .filter((v): v is number => typeof v === 'number');
                          const promedioGeneral = promediosMensuales.length
                            ? promediosMensuales.reduce((a, b) => a + b, 0) / promediosMensuales.length
                            : null;
                          return promedioGeneral != null ? formatPercentage(promedioGeneral) : '—';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {areaNamesSoporte.length > 0 && (
              <div className="reporte-table-container reporte-tipo-block">
                <div className="reporte-table-header">
                  <h2>Avance por mes - {selectedYear} — Soporte</h2>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Área</th>
                      {monthlyChartData.map((row) => (
                        <th key={row.month}>{row.month}</th>
                      ))}
                      <th>Promedio anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaNamesSoporte.map((name) => {
                      const valoresAnuales = monthlyChartData
                        .map((row) => row[name])
                        .filter((v): v is number => typeof v === 'number');
                      const promedioAnual = valoresAnuales.length
                        ? valoresAnuales.reduce((a, b) => a + b, 0) / valoresAnuales.length
                        : null;
                      return (
                        <tr key={name}>
                          <td className="grupo-cell">{name}</td>
                          {monthlyChartData.map((row, monthIndex) => {
                            const value = row[name];
                            return (
                              <td key={row.month}>
                                {renderMesAreaCell(name, monthIndex, value)}
                              </td>
                            );
                          })}
                          <td className="promedio-anual-cell">
                            {promedioAnual != null ? formatPercentage(promedioAnual) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="promedio-row">
                      <td className="grupo-cell">Promedio</td>
                      {monthlyChartData.map((row, monthIndex) => {
                        const year = selectedYear ?? new Date().getFullYear();
                        const isFuture = isFutureMonth(year, monthIndex + 1);
                        const valores = areaNamesSoporte
                          .map((name) => row[name])
                          .filter((v): v is number => typeof v === 'number');
                        const promedioMes = !isFuture && valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                        return (
                          <td key={row.month}>
                            {promedioMes != null ? formatPercentage(promedioMes) : '—'}
                          </td>
                        );
                      })}
                      <td className="promedio-anual-cell">
                        {(() => {
                          const promediosMensuales = monthlyChartData
                            .map((row, monthIndex) => {
                              const year = selectedYear ?? new Date().getFullYear();
                              const isFuture = isFutureMonth(year, monthIndex + 1);
                              if (isFuture) return null;
                              const valores = areaNamesSoporte
                                .map((name) => row[name])
                                .filter((v): v is number => typeof v === 'number');
                              return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                            })
                            .filter((v): v is number => typeof v === 'number');
                          const promedioGeneral = promediosMensuales.length
                            ? promediosMensuales.reduce((a, b) => a + b, 0) / promediosMensuales.length
                            : null;
                          return promedioGeneral != null ? formatPercentage(promedioGeneral) : '—';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {monthlyChartData.length === 0 && !loading && (
              <div className="reportes-empty">No hay datos disponibles para el año seleccionado.</div>
            )}
            {monthlyChartData.length > 0 && areaNamesProduccion.length === 0 && areaNamesSoporte.length === 0 && (
              <div className="reportes-empty">No hay áreas de producción ni soporte con datos.</div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderAdvanceTrainingMatrix = () => {
    const defaultTargets = {
      training: 100,
      nivel_1: 100,
      nivel_2: 100,
      nivel_3: 100,
      nivel_4: 100,
    };
    const targets = matrixReportData?.level_targets ?? defaultTargets;
    const levelDefs: {
      targetKey: keyof typeof defaultTargets;
      field: 'entrenamiento' | 'nivel_1' | 'nivel_2' | 'nivel_3' | 'nivel_4';
      label: string;
    }[] = [
      { targetKey: 'training', field: 'entrenamiento', label: 'Entrenamiento' },
      { targetKey: 'nivel_1', field: 'nivel_1', label: 'Nivel 1' },
      { targetKey: 'nivel_2', field: 'nivel_2', label: 'Nivel 2' },
      { targetKey: 'nivel_3', field: 'nivel_3', label: 'Nivel 3' },
      { targetKey: 'nivel_4', field: 'nivel_4', label: 'Nivel 4' },
    ];

    const gruposSinPromedio = (grupos: any[]) =>
      (grupos || []).filter((g) => String(g.grupo_nombre).toUpperCase() !== 'PROMEDIO');

    const valorGrupo = (g: any, field: (typeof levelDefs)[0]['field']) => {
      if (field === 'entrenamiento') {
        const v = g.entrenamiento ?? g.nivel_1;
        return typeof v === 'number' ? v : 0;
      }
      return typeof g[field] === 'number' ? g[field] : 0;
    };

    const prodAreas = matrixReportData?.produccion?.areas ?? [];
    const sopAreas = matrixReportData?.soporte?.areas ?? [];
    const chartsProd = matrixReportData?.charts?.produccion;
    const chartsSop = matrixReportData?.charts?.soporte;
    const hasMatrixData = prodAreas.length > 0 || sopAreas.length > 0;

    type MatrixColDesc = {
      key: string;
      areaId: number;
      areaNombre: string;
      grupo: any;
    };

    const buildMatrixColumns = (areaList: any[]): MatrixColDesc[] => {
      const out: MatrixColDesc[] = [];
      (areaList || []).forEach((ab) => {
        gruposSinPromedio(ab.grupos).forEach((c: any) => {
          out.push({
            key: `${ab.area_id}-${c.grupo_id ?? c.grupo_nombre}`,
            areaId: ab.area_id,
            areaNombre: ab.area_nombre,
            grupo: c,
          });
        });
      });
      return out;
    };

    const groupMatrixColsByArea = (
      cols: MatrixColDesc[]
    ): { areaId: number; areaNombre: string; cols: MatrixColDesc[] }[] => {
      const groups: { areaId: number; areaNombre: string; cols: MatrixColDesc[] }[] = [];
      for (const cd of cols) {
        const last = groups[groups.length - 1];
        if (last && last.areaId === cd.areaId) {
          last.cols.push(cd);
        } else {
          groups.push({ areaId: cd.areaId, areaNombre: cd.areaNombre, cols: [cd] });
        }
      }
      return groups;
    };

    const promedioSeccion = (cols: MatrixColDesc[], field: (typeof levelDefs)[0]['field']) => {
      if (!cols.length) return 0;
      const vals = cols.map((cd) => valorGrupo(cd.grupo, field));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const promedioBackendPorArea = (
      areaList: any[],
      areaId: number,
      field: (typeof levelDefs)[0]['field'],
      fallbackCols: MatrixColDesc[]
    ): number => {
      const ab = areaList.find((a) => a.area_id === areaId);
      const pg = ab?.grupos?.find(
        (g: { grupo_nombre?: string }) => String(g.grupo_nombre || '').toUpperCase() === 'PROMEDIO'
      );
      if (pg) {
        return valorGrupo(pg, field);
      }
      return promedioSeccion(fallbackCols, field);
    };

    const pastelIndexEnArea = (ag: { cols: MatrixColDesc[] }, cd: MatrixColDesc) =>
      Math.max(0, ag.cols.findIndex((c) => c.key === cd.key));

    const renderMatrixTipoTable = (
      areaList: any[],
      weekLabel: number | string,
      sectionTitle: string
    ) => {
      const cols = buildMatrixColumns(areaList);
      if (cols.length === 0) {
        return null;
      }
      const areaGroups = groupMatrixColsByArea(cols);
      return (
        <div className="matrix-unified-wrap matrix-tipo-table-wrap" key={sectionTitle}>
          <div className="reporte-table-header matrix-cer-header">
            <div className="reporte-week-label">
              CW {weekLabel} | % Training Matrix — {sectionTitle}
            </div>
          </div>
          <div className="matrix-unified-scroll">
            <table className="matrix-cer-table matrix-unified-table matrix-xls-style reporte-table">
              <caption className="matrix-table-caption visually-hidden">
                Matriz de entrenamiento {sectionTitle}, semana {weekLabel}
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="matrix-cer-first-col matrix-sticky-col matrix-th-metrica">
                    Métrica
                  </th>
                  {areaGroups.map((g) => (
                    <th
                      key={`area-h-${g.areaId}`}
                      colSpan={g.cols.length}
                      scope="colgroup"
                      className="matrix-xls-area-head"
                    >
                      {g.areaNombre}
                    </th>
                  ))}
                  <th rowSpan={2} scope="col" className="matrix-cer-promedio-col matrix-prom-head-xls matrix-sticky-sep">
                    Promedio
                  </th>
                </tr>
                <tr>
                  {cols.map((cd) => {
                    const ag = areaGroups.find((x) => x.areaId === cd.areaId)!;
                    const pi = pastelIndexEnArea(ag, cd) % 4;
                    return (
                      <th
                        key={`gh-${cd.key}`}
                        scope="col"
                        className={`matrix-grupo-th matrix-grupo-pastel-${pi}`}
                        title={`${cd.areaNombre} — ${cd.grupo.grupo_nombre}`}
                      >
                        {cd.grupo.grupo_nombre}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {levelDefs.map((def) => {
                  const tgt = targets[def.targetKey] ?? 100;
                  const promCol = formatPercentage(promedioSeccion(cols, def.field));
                  return (
                    <React.Fragment key={def.targetKey}>
                      <tr className="matrix-target-row matrix-xls-target-row">
                        <th scope="row" className="matrix-cer-first-col matrix-sticky-col">
                          {def.label} (objetivo)
                        </th>
                        {areaGroups.map((g) => (
                          <td
                            key={`tm-${g.areaId}-${def.targetKey}`}
                            colSpan={g.cols.length}
                            className="matrix-cell-target-merged"
                          >
                            {formatPercentage(tgt)}
                          </td>
                        ))}
                        <td
                          className="matrix-cer-promedio-col matrix-cer-promedio-cell matrix-prom-celda-vacia"
                          aria-hidden="true"
                        />
                      </tr>
                      <tr className="matrix-actual-row matrix-xls-data-row">
                        <th scope="row" className="matrix-cer-first-col matrix-sticky-col">
                          {def.label}
                        </th>
                        {cols.map((cd) => {
                          const ag = areaGroups.find((x) => x.areaId === cd.areaId)!;
                          const pi = pastelIndexEnArea(ag, cd) % 4;
                          return (
                            <td
                              key={`dv-${cd.key}-${def.targetKey}`}
                              className={`matrix-grupo-td matrix-grupo-pastel-${pi}`}
                            >
                              {formatPercentage(valorGrupo(cd.grupo, def.field))}
                            </td>
                          );
                        })}
                        <td
                          className="matrix-cer-promedio-col matrix-cer-promedio-cell matrix-prom-celda-vacia"
                          aria-hidden="true"
                        />
                      </tr>
                      <tr className="matrix-area-summary-row" aria-label={`Resumen por área, ${def.label}`}>
                        <th scope="row" className="matrix-cer-first-col matrix-sticky-col matrix-summary-leyenda">
                          <span className="matrix-summary-leyenda__text">Prom. área</span>
                        </th>
                        {areaGroups.map((g) => (
                          <td
                            key={`ar-${g.areaId}-${def.targetKey}`}
                            colSpan={g.cols.length}
                            className="matrix-area-summary-cell"
                          >
                            {formatPercentage(promedioBackendPorArea(areaList, g.areaId, def.field, g.cols))}
                          </td>
                        ))}
                        <td className="matrix-cer-promedio-col matrix-cer-promedio-cell matrix-prom-data-cell">
                          {promCol}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const renderMatrixTablesSplit = (weekLabel: number | string) => {
      if (prodAreas.length === 0 && sopAreas.length === 0) {
        return (
          <p className="reportes-empty-inline">Sin procesos con datos para la semana seleccionada.</p>
        );
      }
      return (
        <div className="matrix-split-tables">
          {renderMatrixTipoTable(prodAreas, weekLabel, 'Producción')}
          {renderMatrixTipoTable(sopAreas, weekLabel, 'Soporte')}
        </div>
      );
    };

    const renderMatrixChart = (
      title: string,
      data: { label: string; target: number; actual: number }[],
      subtitle?: string
    ) => (
      <div className="matrix-chart-block">
        <h3 className="matrix-chart-title">
          {title}
          {subtitle ? <span className="matrix-chart-subtitle">{subtitle}</span> : null}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
            <XAxis dataKey="label" stroke={COLORS.black} />
            <YAxis
              stroke={COLORS.black}
              domain={[0, 125]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
              contentStyle={{ borderColor: COLORS.red }}
            />
            <Legend />
            <Bar dataKey="actual" name="Avance real" fill="#2563eb" barSize={28} />
            <Line
              type="monotone"
              dataKey="target"
              name="Objetivo progresivo"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 4, fill: '#16a34a' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );

    type MatrixNivelChartRow = {
      label: string;
      target: number;
      actual_n1: number;
      actual_n2: number;
      actual_n3: number;
      actual_n4: number;
    };

    const renderMatrixNivelesChart = (title: string, data: MatrixNivelChartRow[], subtitle?: string) => (
      <div className="matrix-chart-block">
        <h3 className="matrix-chart-title">
          {title}
          {subtitle ? <span className="matrix-chart-subtitle">{subtitle}</span> : null}
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
            barCategoryGap="18%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
            <XAxis dataKey="label" stroke={COLORS.black} />
            <YAxis stroke={COLORS.black} domain={[0, 125]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
              contentStyle={{ borderColor: COLORS.red }}
            />
            <Legend />
            <Bar dataKey="actual_n1" name="Nivel 1" fill="#2563eb" barSize={14} />
            <Bar dataKey="actual_n2" name="Nivel 2" fill="#ea580c" barSize={14} />
            <Bar dataKey="actual_n3" name="Nivel 3" fill="#7c3aed" barSize={14} />
            <Bar dataKey="actual_n4" name="Nivel 4" fill="#0891b2" barSize={14} />
            <Line
              type="monotone"
              dataKey="target"
              name="Objetivo progresivo"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3, fill: '#16a34a' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );

    return (
      <>
        <div className="reportes-filters">
          <div className="filter-group">
            <label>Semana (CW):</label>
            <input
              type="number"
              min="1"
              max="53"
              value={matrixSelectedWeek || ''}
              onChange={(e) => setMatrixSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          <div className="filter-group">
            <label>Año:</label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          {matrixReportData?.progressive_target_cw != null && (
            <div className="filter-group matrix-cw-target-hint">
              <span>
                Objetivo progresivo (CW {matrixSelectedWeek}):{' '}
                <strong>{formatPercentage(matrixReportData.progressive_target_cw)}</strong>
              </span>
            </div>
          )}
          <div className="reportes-actions">
            <div className="view-toggle">
              <button
                type="button"
                className={`btn-view ${matrixViewMode === 'table' ? 'active' : ''}`}
                onClick={() => setMatrixViewMode('table')}
              >
                <FaTable /> Tabla
              </button>
              <button
                type="button"
                className={`btn-view ${matrixViewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setMatrixViewMode('chart')}
              >
                <FaChartBar /> Gráfica
              </button>
            </div>
            <button
              type="button"
              className="btn-export-excel"
              onClick={() => {
                if (!hasMatrixData || !matrixReportData) return;
                setExportFileName(
                  `Reporte_Matrix_CW${matrixSelectedWeek}_${selectedYear}.xlsx`
                );
                setExportChartType('advance-training-matrix');
              }}
              disabled={!hasMatrixData || exportingWithCharts}
            >
              <FaFileExcel /> {exportingWithCharts ? 'Exportando...' : 'Exportar a Excel'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="reportes-loading">Cargando datos...</div>
        ) : matrixViewMode === 'chart' ? (
          <div className="matrix-charts-grid">
            {!matrixReportData ? (
              <div className="reportes-empty">No se pudieron cargar los datos de la matriz.</div>
            ) : (
              <>
                <h2 className="matrix-section-title">Producción</h2>
                {chartsProd?.training?.length
                  ? renderMatrixChart('% Entrenamiento / Training', chartsProd.training, 'Producción')
                  : null}
                {chartsProd?.nivel_1?.length
                  ? renderMatrixNivelesChart(
                      'Certificación N1–N4 por nivel',
                      mergeNivelesChartRowsForExport(chartsProd),
                      'Producción'
                    )
                  : null}
                <h2 className="matrix-section-title">Soporte</h2>
                {chartsSop?.training?.length
                  ? renderMatrixChart('% Entrenamiento / Training', chartsSop.training, 'Soporte')
                  : null}
                {chartsSop?.nivel_1?.length
                  ? renderMatrixNivelesChart(
                      'Certificación N1–N4 por nivel',
                      mergeNivelesChartRowsForExport(chartsSop),
                      'Soporte'
                    )
                  : null}
              </>
            )}
          </div>
        ) : (
          <div className="matrix-report-container">
            {!matrixReportData ? (
              <div className="reportes-empty">No se pudieron cargar los datos de la matriz.</div>
            ) : (
              renderMatrixTablesSplit(matrixReportData.week ?? matrixSelectedWeek ?? '')
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="reportes-container">
      <div className="reportes-header">
        <h1>Reportes</h1>
          </div>

      <div className="reportes-tabs">
        <button
          className={`reportes-tab ${activeTab === 'avance-global' ? 'active' : ''}`}
          onClick={() => setActiveTab('avance-global')}
        >
          Avance Global
        </button>
        <button
          className={`reportes-tab ${activeTab === 'advance-training-monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('advance-training-monthly')}
        >
          % Advance Training Monthly
        </button>
        <button
          className={`reportes-tab ${activeTab === 'advance-training-matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('advance-training-matrix')}
        >
          % Advance Training Matrix
        </button>
      </div>

      <div className="reportes-tab-content">
        {activeTab === 'avance-global' && renderAvanceGlobal()}
        {activeTab === 'advance-training-monthly' && renderAdvanceTrainingMonthly()}
        {activeTab === 'advance-training-matrix' && renderAdvanceTrainingMatrix()}
      </div>

      {exportChartData.length > 0 && exportChartType && (
        <div
          ref={exportChartsContainerRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -9999,
            top: 0,
            width: 800,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          {exportChartType === 'advance-training-monthly' ? (
            (() => {
              const dataPoints = exportChartData as { month: string; [k: string]: string | number }[];
              const areaNames = dataPoints[0] ? Object.keys(dataPoints[0]).filter((k) => k !== 'month') : [];
              const areaNamesProduccion = areaNames.filter(
                (name) => (areas.find((a) => a.name === name)?.tipo_area ?? 'produccion') === 'produccion'
              );
              const areaNamesSoporte = areaNames.filter(
                (name) => areas.find((a) => a.name === name)?.tipo_area === 'soporte'
              );
              const chartDataProduccion = dataPoints.map((row) => {
                const valores = areaNamesProduccion
                  .map((name) => row[name])
                  .filter((v): v is number => typeof v === 'number');
                const prom = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                return { month: row.month, Promedio: prom };
              });
              const chartDataSoporte = dataPoints.map((row) => {
                const valores = areaNamesSoporte
                  .map((name) => row[name])
                  .filter((v): v is number => typeof v === 'number');
                const prom = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
                return { month: row.month, Promedio: prom };
              });
              return (
                <>
                  {areaNamesProduccion.length > 0 && (
                    <div className="reporte-chart-block" style={{ width: 800, height: 400 }}>
                      <h3 className="reporte-chart-title">Avance por mes - Producción</h3>
                      <ResponsiveContainer width={800} height={350}>
                        <LineChart data={chartDataProduccion} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                          <XAxis dataKey="month" stroke={COLORS.black} />
                          <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <Tooltip formatter={(value: number | undefined) => (value != null ? [`${Number(value).toFixed(2)}%`, 'Promedio'] : '')} contentStyle={{ borderColor: COLORS.red }} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Promedio"
                            name="Promedio Producción"
                            stroke={COLORS.red}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {areaNamesSoporte.length > 0 && (
                    <div className="reporte-chart-block" style={{ width: 800, height: 400 }}>
                      <h3 className="reporte-chart-title">Avance por mes - Soporte</h3>
                      <ResponsiveContainer width={800} height={350}>
                        <LineChart data={chartDataSoporte} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                          <XAxis dataKey="month" stroke={COLORS.black} />
                          <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <Tooltip formatter={(value: number | undefined) => (value != null ? [`${Number(value).toFixed(2)}%`, 'Promedio'] : '')} contentStyle={{ borderColor: COLORS.red }} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Promedio"
                            name="Promedio Soporte"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            (() => {
              const raw = exportChartData as AvanceGlobalResponse[];
              const { produccion, soporte } = splitAvanceGlobalByTipo(raw, areas);
              return (
                <>
                  {produccion.length > 0 && (
                    <>
                      <h2 className="matrix-section-title" style={{ width: 800, marginTop: 0 }}>
                        Producción
                      </h2>
                      {produccion.map((areaData, idx) => (
                        <div key={`ag-p-${areaData.area_id}-${idx}`} className="reporte-chart-block" style={{ width: 800, height: 400 }}>
                          <h3 className="reporte-chart-title">CW {areaData.week} - {areaData.area_nombre}</h3>
                          <ResponsiveContainer width={800} height={350}>
                            <BarChart data={getChartData([areaData])} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                              <XAxis dataKey="name" stroke={COLORS.black} angle={-35} textAnchor="end" height={80} />
                              <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                              <Tooltip formatter={(value: number | undefined) => (value != null ? [`${value.toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                              <Legend />
                              <Bar dataKey="Entrenamiento" fill={CHART_COLORS[0]} name="Entrenamiento" />
                              <Bar dataKey="Nivel1" fill={CHART_COLORS[1]} name="Nivel 1" />
                              <Bar dataKey="Nivel2" fill={CHART_COLORS[2]} name="Nivel 2" />
                              <Bar dataKey="Nivel3" fill={CHART_COLORS[3]} name="Nivel 3" />
                              <Bar dataKey="Nivel4" fill={CHART_COLORS[4]} name="Nivel 4" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </>
                  )}
                  {soporte.length > 0 && (
                    <>
                      <h2 className="matrix-section-title" style={{ width: 800, marginTop: produccion.length > 0 ? undefined : 0 }}>
                        Soporte
                      </h2>
                      {soporte.map((areaData, idx) => (
                        <div key={`ag-s-${areaData.area_id}-${idx}`} className="reporte-chart-block" style={{ width: 800, height: 400 }}>
                          <h3 className="reporte-chart-title">CW {areaData.week} - {areaData.area_nombre}</h3>
                          <ResponsiveContainer width={800} height={350}>
                            <BarChart data={getChartData([areaData])} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                              <XAxis dataKey="name" stroke={COLORS.black} angle={-35} textAnchor="end" height={80} />
                              <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                              <Tooltip formatter={(value: number | undefined) => (value != null ? [`${value.toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                              <Legend />
                              <Bar dataKey="Entrenamiento" fill={CHART_COLORS[0]} name="Entrenamiento" />
                              <Bar dataKey="Nivel1" fill={CHART_COLORS[1]} name="Nivel 1" />
                              <Bar dataKey="Nivel2" fill={CHART_COLORS[2]} name="Nivel 2" />
                              <Bar dataKey="Nivel3" fill={CHART_COLORS[3]} name="Nivel 3" />
                              <Bar dataKey="Nivel4" fill={CHART_COLORS[4]} name="Nivel 4" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}

      {exportChartType === 'advance-training-matrix' && matrixReportData && (
        <div
          ref={exportMatrixChartsContainerRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -9999,
            top: 0,
            width: 800,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          {matrixReportData.charts?.produccion?.training?.length ? (
            <div
              className="matrix-chart-block"
              data-matrix-export="produccion-training"
              style={{ width: 800 }}
            >
              <h3 className="matrix-chart-title">
                % Entrenamiento / Training
                <span className="matrix-chart-subtitle">Producción</span>
              </h3>
              <ResponsiveContainer width={800} height={320}>
                <ComposedChart
                  data={matrixReportData.charts.produccion.training}
                  margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="label" stroke={COLORS.black} />
                  <YAxis
                    stroke={COLORS.black}
                    domain={[0, 125]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
                    contentStyle={{ borderColor: COLORS.red }}
                  />
                  <Legend />
                  <Bar dataKey="actual" name="Avance real" fill="#2563eb" barSize={28} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Objetivo progresivo"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#16a34a' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {matrixReportData.charts?.produccion?.nivel_1?.length ? (
            <div
              className="matrix-chart-block"
              data-matrix-export="produccion-niveles"
              style={{ width: 800 }}
            >
              <h3 className="matrix-chart-title">
                Certificación N1–N4 por nivel
                <span className="matrix-chart-subtitle">Producción</span>
              </h3>
              <ResponsiveContainer width={800} height={360}>
                <ComposedChart
                  data={mergeNivelesChartRowsForExport(matrixReportData.charts.produccion)}
                  margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap="18%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="label" stroke={COLORS.black} />
                  <YAxis stroke={COLORS.black} domain={[0, 125]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
                    contentStyle={{ borderColor: COLORS.red }}
                  />
                  <Legend />
                  <Bar dataKey="actual_n1" name="Nivel 1" fill="#2563eb" barSize={14} />
                  <Bar dataKey="actual_n2" name="Nivel 2" fill="#ea580c" barSize={14} />
                  <Bar dataKey="actual_n3" name="Nivel 3" fill="#7c3aed" barSize={14} />
                  <Bar dataKey="actual_n4" name="Nivel 4" fill="#0891b2" barSize={14} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Objetivo progresivo"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#16a34a' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {matrixReportData.charts?.soporte?.training?.length ? (
            <div
              className="matrix-chart-block"
              data-matrix-export="soporte-training"
              style={{ width: 800 }}
            >
              <h3 className="matrix-chart-title">
                % Entrenamiento / Training
                <span className="matrix-chart-subtitle">Soporte</span>
              </h3>
              <ResponsiveContainer width={800} height={320}>
                <ComposedChart
                  data={matrixReportData.charts.soporte.training}
                  margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="label" stroke={COLORS.black} />
                  <YAxis
                    stroke={COLORS.black}
                    domain={[0, 125]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
                    contentStyle={{ borderColor: COLORS.red }}
                  />
                  <Legend />
                  <Bar dataKey="actual" name="Avance real" fill="#2563eb" barSize={28} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Objetivo progresivo"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#16a34a' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {matrixReportData.charts?.soporte?.nivel_1?.length ? (
            <div
              className="matrix-chart-block"
              data-matrix-export="soporte-niveles"
              style={{ width: 800 }}
            >
              <h3 className="matrix-chart-title">
                Certificación N1–N4 por nivel
                <span className="matrix-chart-subtitle">Soporte</span>
              </h3>
              <ResponsiveContainer width={800} height={360}>
                <ComposedChart
                  data={mergeNivelesChartRowsForExport(matrixReportData.charts.soporte)}
                  margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap="18%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="label" stroke={COLORS.black} />
                  <YAxis stroke={COLORS.black} domain={[0, 125]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
                    contentStyle={{ borderColor: COLORS.red }}
                  />
                  <Legend />
                  <Bar dataKey="actual_n1" name="Nivel 1" fill="#2563eb" barSize={14} />
                  <Bar dataKey="actual_n2" name="Nivel 2" fill="#ea580c" barSize={14} />
                  <Bar dataKey="actual_n3" name="Nivel 3" fill="#7c3aed" barSize={14} />
                  <Bar dataKey="actual_n4" name="Nivel 4" fill="#0891b2" barSize={14} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Objetivo progresivo"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#16a34a' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Reportes;
