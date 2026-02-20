import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaFileExcel, FaChartBar, FaTable } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const Reportes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('avance-global');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<AvanceGlobalResponse[]>([]);
  /** Para Advance Training Monthly: array de 12 respuestas (una por mes). Cada elemento es array de datos por área. */
  const [monthlyReportData, setMonthlyReportData] = useState<any[][]>([]);
  const [matrixReportData, setMatrixReportData] = useState<any[]>([]);
  const [matrixSelectedWeek, setMatrixSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [exportingWithCharts, setExportingWithCharts] = useState<boolean>(false);
  const [exportChartData, setExportChartData] = useState<AvanceGlobalResponse[] | any[]>([]);
  const [exportChartType, setExportChartType] = useState<'avance-global' | 'advance-training-monthly' | null>(null);
  const [exportFileName, setExportFileName] = useState<string>('');
  const exportChartsContainerRef = useRef<HTMLDivElement>(null);

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
          formatPercentage(g.nivel_1),
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
    dataPoints: { month: string; [k: string]: string | number }[],
    chartImageBase64: string,
    fileName: string
  ) => {
    const areaNames = dataPoints.length > 0 ? Object.keys(dataPoints[0]).filter((k) => k !== 'month') : [];
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Avance por mes', { views: [{ state: 'normal' }] });
    ws.columns = [{ width: 22 }, ...dataPoints.map(() => ({ width: 12 }))];
    ws.addRow(['Área', ...dataPoints.map((row) => row.month)]);
    areaNames.forEach((areaName) => {
      ws.addRow([areaName, ...dataPoints.map((row) => (row[areaName] != null ? formatPercentage(Number(row[areaName])) : ''))]);
    });
    if (chartImageBase64) {
      const imageId = workbook.addImage({ base64: chartImageBase64, extension: 'png' });
      const startRow = dataPoints.length + 3;
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
          result.push({
            name: g.grupo_nombre,
            Entrenamiento: g.nivel_1,
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

  /** Datos para la gráfica mensual: todas las áreas vs meses (una fila por mes, una serie por área). */
  const getMonthlyChartData = (): { month: string; [areaName: string]: string | number }[] => {
    if (!monthlyReportData.length || monthlyReportData.some((m) => !Array.isArray(m))) return [];
    const year = selectedYear ?? new Date().getFullYear();
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthIdx) => {
      const monthLabel = new Date(year, monthIdx - 1, 1).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
      const point: { month: string; [areaName: string]: string | number } = { month: monthLabel };
      const monthResponse = monthlyReportData[monthIdx - 1] as any[] | undefined;
      if (!monthResponse) return point;
      monthResponse.forEach((areaData: any) => {
        const prom = areaData.grupos?.find((g: any) => String(g.grupo_nombre).toUpperCase() === 'PROMEDIO');
        const val = prom
          ? (prom.entrenamiento ?? ((prom.nivel_1 + prom.nivel_2 + prom.nivel_3 + prom.nivel_4) / 4))
          : 0;
        point[areaData.area_nombre] = typeof val === 'number' ? val : 0;
      });
      return point;
    });
  };

  // Cargar datos del reporte mensual: 12 meses del año seleccionado (todas las áreas en una misma gráfica)
  useEffect(() => {
    const loadMonthlyReportData = async () => {
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
    };
    loadMonthlyReportData();
  }, [selectedYear, activeTab]);

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
        setMatrixReportData([]);
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
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
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
                      <td>{formatPercentage(grupo.nivel_1)}</td>
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
    const monthlyChartData = getMonthlyChartData();
    const areaNames = monthlyChartData.length > 0
      ? Object.keys(monthlyChartData[0]).filter((k) => k !== 'month')
      : [];

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
          </div>
        </div>

        {loading ? (
          <div className="reportes-loading">Cargando datos...</div>
        ) : selectedYear === null ? (
          <div className="reportes-empty">Selecciona un año para ver el avance de todas las áreas por mes.</div>
        ) : viewMode === 'chart' ? (
          <div className="reportes-chart-container">
            <div className="reporte-chart-block">
              <h3 className="reporte-chart-title">
                Avance por mes - {selectedYear} (todas las áreas)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="month" stroke={COLORS.black} />
                  <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number | undefined) => (value != null ? [`${Number(value).toFixed(2)}%`, ''] : '')}
                    contentStyle={{ borderColor: COLORS.red }}
                  />
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
            {monthlyChartData.length === 0 && !loading && (
              <div className="reportes-empty">No hay datos disponibles para el año seleccionado.</div>
            )}
          </div>
        ) : (
          <div className="reportes-content">
            <div className="reporte-table-container">
              <div className="reporte-table-header">
                <h2>Avance por mes - {selectedYear}</h2>
              </div>
              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Área</th>
                    {monthlyChartData.map((row) => (
                      <th key={row.month}>{row.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {areaNames.map((name) => (
                    <tr key={name}>
                      <td className="grupo-cell">{name}</td>
                      {monthlyChartData.map((row) => (
                        <td key={row.month}>{formatPercentage(Number(row[name] ?? 0))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthlyChartData.length === 0 && !loading && (
              <div className="reportes-empty">No hay datos disponibles para el año seleccionado.</div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderAdvanceTrainingMatrix = () => {
    // Targets fijos por nivel
    const targets = {
      training: 100,
      nivel_1: 100,
      nivel_2: 100,
      nivel_3: 50,
      nivel_4: 25,
    };

    const levels = ['training', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4'];
    const levelNames: Record<string, string> = {
      training: 'Training',
      nivel_1: 'Certification Level 1',
      nivel_2: 'Certification Level 2',
      nivel_3: 'Certification Level 3',
      nivel_4: 'Certification Level 4',
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
        <div className="reportes-actions">
          <button
            type="button"
            className="btn-export-excel"
            onClick={() => {
              const rows: (string | number)[][] = [['Nivel', ...areas.map(a => a.name), 'Average']];
              const levels = ['training', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4'];
              const levelNames: Record<string, string> = {
                training: 'Training',
                nivel_1: 'Nivel 1',
                nivel_2: 'Nivel 2',
                nivel_3: 'Nivel 3',
                nivel_4: 'Nivel 4',
              };
              levels.forEach((level) => {
                const levelData = matrixReportData.find((d: any) => d.nivel === level && !d.is_average);
                const row = [levelNames[level]];
                areas.forEach((area) => {
                  const areaData = levelData?.areas?.find((a: any) => a.area_id === area.id);
                  row.push(areaData ? areaData.porcentaje.toFixed(2) + '%' : '0.00%');
                });
                row.push(levelData ? levelData.porcentaje.toFixed(2) + '%' : '0.00%');
                rows.push(row);
              });
              const wb = XLSX.utils.book_new();
              const ws = XLSX.utils.aoa_to_sheet(rows);
              XLSX.utils.book_append_sheet(wb, ws, 'Matrix');
              XLSX.writeFile(wb, `Reporte_Matrix_CW${matrixSelectedWeek}.xlsx`);
            }}
            disabled={matrixReportData.length === 0}
          >
            <FaFileExcel /> Exportar a Excel
          </button>
        </div>
        </div>

        {loading ? (
          <div className="reportes-loading">Cargando datos...</div>
        ) : (
          <div className="matrix-report-container">
            <table className="matrix-report-table">
              <thead>
                <tr>
                  <th className="matrix-header-level">Nivel</th>
                  {areas.map((area) => (
                    <th key={area.id} className="matrix-header-area">
                      {area.name}
                    </th>
                  ))}
                  <th className="matrix-header-average">
                    Average CW {matrixSelectedWeek}
                  </th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => {
                  const levelData = matrixReportData.find((d: any) => d.nivel === level && !d.is_average);
                  const target = targets[level as keyof typeof targets];
                  
                  return (
                    <React.Fragment key={level}>
                      {/* Fila Target */}
                      <tr className="matrix-target-row">
                        <td className="matrix-level-cell">{levelNames[level]} Target</td>
                        {areas.map((area) => (
                          <td key={`${area.id}-${level}-target`} className="matrix-target-cell">
                            {target}%
                          </td>
                        ))}
                        <td className="matrix-target-cell">{target}%</td>
                      </tr>
                      {/* Fila Actual */}
                      <tr className="matrix-actual-row">
                        <td className="matrix-level-cell">{levelNames[level]}</td>
                        {areas.map((area) => {
                          const areaData = levelData?.areas?.find((a: any) => a.area_id === area.id);
              return (
                            <td key={`${area.id}-${level}-actual`} className="matrix-actual-cell">
                              {areaData ? `${areaData.porcentaje.toFixed(2)}%` : '0.00%'}
                            </td>
              );
                        })}
                        <td className="matrix-average-cell">
                          {levelData ? `${levelData.porcentaje.toFixed(2)}%` : '0.00%'}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
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
