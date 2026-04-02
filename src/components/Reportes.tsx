import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaFileExcel, FaChartBar, FaTable } from 'react-icons/fa';
import * as XLSX from 'xlsx';
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
  const [exportChartType, setExportChartType] = useState<'avance-global' | 'advance-training-monthly' | null>(null);
  const [exportFileName, setExportFileName] = useState<string>('');
  const exportChartsContainerRef = useRef<HTMLDivElement>(null);
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
    if (userRole === 'ADMIN') {
      setReportAllowedAreaIds(null);
      setReportAreaScopeLoaded(true);
      return;
    }
    if (!['ENTRENADOR', 'SUPERVISOR', 'VISOR'].includes(userRole)) {
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
    if (!reportAreaScopeLoaded || userRole === 'ADMIN') return;
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
    chartImageBase64: string,
    fileName: string
  ) => {
    const areaNames = dataPoints.length > 0 ? Object.keys(dataPoints[0]).filter((k) => k !== 'month') : [];
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Avance por mes', { views: [{ state: 'normal' }] });
    ws.columns = [{ width: 22 }, ...dataPoints.map(() => ({ width: 12 })), { width: 14 }];
    ws.addRow(['Área', ...dataPoints.map((row) => row.month), 'Promedio anual']);
    areaNames.forEach((areaName) => {
      const valores = dataPoints.map((row) => row[areaName]).filter((v): v is number => typeof v === 'number');
      const promedioAnual = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
      ws.addRow([
        areaName,
        ...dataPoints.map((row) => (row[areaName] != null ? formatPercentage(Number(row[areaName])) : '')),
        promedioAnual != null ? formatPercentage(promedioAnual) : '',
      ]);
    });
    const promediosMensuales = dataPoints.map((row) => {
      const valores = areaNames.map((n) => row[n]).filter((v): v is number => typeof v === 'number');
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
      const startRow = areaNames.length + 3;
      ws.addImage(imageId, {
        tl: { col: 0, row: startRow },
        ext: { width: 640, height: 350 },
        editAs: 'oneCell',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (exportChartData.length === 0 || !exportChartType || !exportFileName) return;
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
          await buildExcelMonthlyWithChart(dataPoints, images[0] ?? '', exportFileName);
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
    // Solo ejecutar cuando se dispare una exportación con gráficas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportChartData, exportChartType, exportFileName]);

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
              setExportChartData(reportData);
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
          {reportData.map((areaData) => (
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
          {reportData.length === 0 && (
            <div className="reportes-empty">No hay datos disponibles para los filtros seleccionados.</div>
          )}
        </div>
      ) : (
        <div className="reportes-content">
          {reportData.map((areaData) => (
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

    /** Índice de color por área (0..7) para cabeceras producción / soporte. */
    const MATRIX_TONE_COUNT = 8;
    const buildMatrixAreaToneMap = (cols: MatrixColDesc[]): Map<number, number> => {
      const m = new Map<number, number>();
      let i = 0;
      groupMatrixColsByArea(cols).forEach((g) => {
        m.set(g.areaId, i % MATRIX_TONE_COUNT);
        i += 1;
      });
      return m;
    };

    const promedioSeccion = (cols: MatrixColDesc[], field: (typeof levelDefs)[0]['field']) => {
      if (!cols.length) return 0;
      const vals = cols.map((cd) => valorGrupo(cd.grupo, field));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const renderMatrixUnifiedTable = (weekLabel: number | string) => {
      const prodCols = buildMatrixColumns(prodAreas);
      const sopCols = buildMatrixColumns(sopAreas);
      const prodToneByArea = buildMatrixAreaToneMap(prodCols);
      const sopToneByArea = buildMatrixAreaToneMap(sopCols);
      if (prodCols.length === 0 && sopCols.length === 0) {
        return (
          <p className="reportes-empty-inline">Sin procesos con datos para la semana seleccionada.</p>
        );
      }
      return (
        <div className="matrix-unified-wrap">
          <div className="reporte-table-header matrix-cer-header">
            <div className="reporte-week-label">
              CW {weekLabel} | % Training Matrix (producción y soporte)
            </div>
          </div>
          <div className="matrix-unified-scroll">
            <table className="matrix-cer-table matrix-unified-table reporte-table">
              <thead>
                <tr>
                  <th rowSpan={3} className="matrix-cer-first-col matrix-sticky-col">
                    Métrica
                  </th>
                  {prodCols.length > 0 && (
                    <th colSpan={prodCols.length + 1} className="matrix-section-head matrix-section-prod">
                      Producción
                    </th>
                  )}
                  {sopCols.length > 0 && (
                    <th colSpan={sopCols.length + 1} className="matrix-section-head matrix-section-sop">
                      Soporte
                    </th>
                  )}
                </tr>
                <tr>
                  {groupMatrixColsByArea(prodCols).map((g) => (
                    <th
                      key={`pg-${g.areaId}`}
                      colSpan={g.cols.length}
                      className={`matrix-area-group-head matrix-area-group-prod matrix-tone-prod-${prodToneByArea.get(g.areaId) ?? 0}`}
                      scope="colgroup"
                    >
                      {g.areaNombre}
                    </th>
                  ))}
                  {prodCols.length > 0 && (
                    <th rowSpan={2} className="matrix-cer-promedio-col matrix-sticky-sep matrix-prom-head">
                      Prom.
                    </th>
                  )}
                  {groupMatrixColsByArea(sopCols).map((g) => (
                    <th
                      key={`sg-${g.areaId}`}
                      colSpan={g.cols.length}
                      className={`matrix-area-group-head matrix-area-group-sop matrix-tone-sop-${sopToneByArea.get(g.areaId) ?? 0}`}
                      scope="colgroup"
                    >
                      {g.areaNombre}
                    </th>
                  ))}
                  {sopCols.length > 0 && (
                    <th rowSpan={2} className="matrix-cer-promedio-col matrix-sticky-sep matrix-prom-head">
                      Prom.
                    </th>
                  )}
                </tr>
                <tr>
                  {prodCols.map((cd) => (
                    <th
                      key={`p-${cd.key}`}
                      className={`matrix-proc-head matrix-proc-grupo-only matrix-tone-prod-${prodToneByArea.get(cd.areaId) ?? 0}`}
                      title={`${cd.areaNombre} — ${cd.grupo.grupo_nombre}`}
                    >
                      {cd.grupo.grupo_nombre}
                    </th>
                  ))}
                  {sopCols.map((cd) => (
                    <th
                      key={`s-${cd.key}`}
                      className={`matrix-proc-head matrix-proc-grupo-only matrix-tone-sop-${sopToneByArea.get(cd.areaId) ?? 0}`}
                      title={`${cd.areaNombre} — ${cd.grupo.grupo_nombre}`}
                    >
                      {cd.grupo.grupo_nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levelDefs.map((def) => {
                  const tgt = targets[def.targetKey] ?? 100;
                  return (
                    <React.Fragment key={def.targetKey}>
                      <tr className="matrix-target-row">
                        <td className="matrix-cer-first-col matrix-sticky-col">{def.label} (objetivo)</td>
                        {prodCols.map((cd) => (
                          <td key={`tp-${cd.key}-${def.targetKey}`}>{formatPercentage(tgt)}</td>
                        ))}
                        {prodCols.length > 0 && (
                          <td className="matrix-cer-promedio-col">{formatPercentage(tgt)}</td>
                        )}
                        {sopCols.map((cd) => (
                          <td key={`ts-${cd.key}-${def.targetKey}`}>{formatPercentage(tgt)}</td>
                        ))}
                        {sopCols.length > 0 && (
                          <td className="matrix-cer-promedio-col">{formatPercentage(tgt)}</td>
                        )}
                      </tr>
                      <tr className="matrix-actual-row">
                        <td className="matrix-cer-first-col matrix-sticky-col">{def.label}</td>
                        {prodCols.map((cd) => (
                          <td key={`ap-${cd.key}-${def.targetKey}`}>
                            {formatPercentage(valorGrupo(cd.grupo, def.field))}
                          </td>
                        ))}
                        {prodCols.length > 0 && (
                          <td className="matrix-cer-promedio-col matrix-cer-promedio-cell">
                            {formatPercentage(promedioSeccion(prodCols, def.field))}
                          </td>
                        )}
                        {sopCols.map((cd) => (
                          <td key={`as-${cd.key}-${def.targetKey}`}>
                            {formatPercentage(valorGrupo(cd.grupo, def.field))}
                          </td>
                        ))}
                        {sopCols.length > 0 && (
                          <td className="matrix-cer-promedio-col matrix-cer-promedio-cell">
                            {formatPercentage(promedioSeccion(sopCols, def.field))}
                          </td>
                        )}
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

    const mergeNivelesChartRows = (chartsBlock: {
      nivel_1?: { month: number; label: string; target: number; actual: number }[];
      nivel_2?: { month: number; label: string; target: number; actual: number }[];
      nivel_3?: { month: number; label: string; target: number; actual: number }[];
      nivel_4?: { month: number; label: string; target: number; actual: number }[];
    }) => {
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
          <ComposedChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
            <XAxis dataKey="label" stroke={COLORS.black} />
            <YAxis stroke={COLORS.black} domain={[0, 125]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v: number | undefined) => (v != null ? `${Number(v).toFixed(2)}%` : '')}
              contentStyle={{ borderColor: COLORS.red }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="target"
              name="Objetivo progresivo"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3, fill: '#16a34a' }}
            />
            <Line type="monotone" dataKey="actual_n1" name="Nivel 1" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="actual_n2" name="Nivel 2" stroke="#ea580c" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="actual_n3" name="Nivel 3" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="actual_n4" name="Nivel 4" stroke="#0891b2" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );

    const exportMatrixExcel = () => {
      const wb = XLSX.utils.book_new();
      const prodCols = buildMatrixColumns(prodAreas);
      const sopCols = buildMatrixColumns(sopAreas);
      const wk = matrixReportData?.week ?? matrixSelectedWeek ?? '';
      const rows: (string | number)[][] = [];
      rows.push([`CW ${wk} | % Training Matrix (una tabla)`]);
      rows.push([]);
      const header = [
        'Métrica',
        ...prodCols.map((cd) => `Prod: ${cd.areaNombre} / ${cd.grupo.grupo_nombre}`),
        ...(prodCols.length ? ['Prom. prod.'] : []),
        ...sopCols.map((cd) => `Sop: ${cd.areaNombre} / ${cd.grupo.grupo_nombre}`),
        ...(sopCols.length ? ['Prom. sop.'] : []),
      ];
      rows.push(header);
      levelDefs.forEach((def) => {
        const tgt = targets[def.targetKey] ?? 100;
        rows.push([
          `${def.label} (obj.)`,
          ...prodCols.map(() => `${tgt.toFixed(2)}%`),
          ...(prodCols.length ? [`${tgt.toFixed(2)}%`] : []),
          ...sopCols.map(() => `${tgt.toFixed(2)}%`),
          ...(sopCols.length ? [`${tgt.toFixed(2)}%`] : []),
        ]);
        rows.push([
          def.label,
          ...prodCols.map((cd) => `${valorGrupo(cd.grupo, def.field).toFixed(2)}%`),
          ...(prodCols.length ? [`${promedioSeccion(prodCols, def.field).toFixed(2)}%`] : []),
          ...sopCols.map((cd) => `${valorGrupo(cd.grupo, def.field).toFixed(2)}%`),
          ...(sopCols.length ? [`${promedioSeccion(sopCols, def.field).toFixed(2)}%`] : []),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
      XLSX.writeFile(wb, `Reporte_Matrix_CW${matrixSelectedWeek}_${selectedYear}.xlsx`);
    };

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
              onClick={exportMatrixExcel}
              disabled={!hasMatrixData}
            >
              <FaFileExcel /> Exportar a Excel
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
                      mergeNivelesChartRows(chartsProd),
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
                      mergeNivelesChartRows(chartsSop),
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
              renderMatrixUnifiedTable(matrixReportData.week ?? matrixSelectedWeek ?? '')
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
              return (
                <div className="reporte-chart-block" style={{ width: 800, height: 400 }}>
                  <h3 className="reporte-chart-title">Avance por mes - todas las áreas</h3>
                  <ResponsiveContainer width={800} height={350}>
                    <LineChart data={dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                      <XAxis dataKey="month" stroke={COLORS.black} />
                      <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip formatter={(value: number | undefined) => (value != null ? [`${Number(value).toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                      <Legend />
                      {areaNames.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          name={name}
                          stroke={AREA_CHART_COLORS[i % AREA_CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()
          ) : (
            (exportChartData as AvanceGlobalResponse[]).map((areaData, idx) => (
              <div key={idx} className="reporte-chart-block" style={{ width: 800, height: 400 }}>
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Reportes;
