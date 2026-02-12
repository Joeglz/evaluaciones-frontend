import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaChartBar, FaTable } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
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

type TabType = 'avance-global' | 'advance-training-monthly' | 'advance-training-matrix';

const Reportes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('avance-global');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reportData, setReportData] = useState<AvanceGlobalResponse[]>([]);
  const [monthlyReportData, setMonthlyReportData] = useState<any[]>([]);
  const [matrixReportData, setMatrixReportData] = useState<any[]>([]);
  const [matrixSelectedWeek, setMatrixSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

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

  // Cargar áreas
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await apiService.getAreas();
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

  const exportToExcel = (data: AvanceGlobalResponse[] | any[]) => {
    const dataArr = Array.isArray(data) ? data : [data];
    
    if (dataArr.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    
    dataArr.forEach((areaData, idx) => {
      const areaName = areaData.area_nombre || `Area_${idx + 1}`;
      
      const rows = [['Grupo', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Entrenamiento']];
      (areaData.grupos || []).forEach((g: any) => {
        rows.push([
          g.grupo_nombre,
          formatPercentage(g.nivel_1),
          formatPercentage(g.nivel_2),
          formatPercentage(g.nivel_3),
          formatPercentage(g.nivel_4),
          formatPercentage(g.entrenamiento),
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const colWidths = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, `${areaName.substring(0, 31)}`);
    });
    
    const fileName = `Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getChartData = (data: AvanceGlobalResponse[]): { name: string; Nivel1: number; Nivel2: number; Nivel3: number; Nivel4: number; Entrenamiento: number }[] => {
    const result: { name: string; Nivel1: number; Nivel2: number; Nivel3: number; Nivel4: number; Entrenamiento: number }[] = [];
    data.forEach((areaData) => {
      (areaData.grupos || []).forEach((g) => {
        if (g.grupo_nombre.toUpperCase() !== 'PROMEDIO') {
          result.push({
            name: g.grupo_nombre,
            Nivel1: g.nivel_1,
            Nivel2: g.nivel_2,
            Nivel3: g.nivel_3,
            Nivel4: g.nivel_4,
            Entrenamiento: g.entrenamiento,
          });
        }
      });
    });
    return result;
  };

  const isAverageRow = (grupoNombre: string): boolean => {
    return grupoNombre.toUpperCase() === 'PROMEDIO';
  };

  // Cargar datos del reporte mensual
  useEffect(() => {
    const loadMonthlyReportData = async () => {
      if (selectedMonth === null || selectedYear === null || activeTab !== 'advance-training-monthly') return;
      
      setLoading(true);
      try {
        const params: any = {
          month: selectedMonth,
          year: selectedYear,
        };
        if (selectedArea !== null) {
          params.area_id = selectedArea;
        }
        const data = await apiService.getAdvanceTrainingMonthly(params);
        setMonthlyReportData(data);
      } catch (error) {
        console.error('Error al cargar reporte mensual:', error);
        setMonthlyReportData([]);
      } finally {
        setLoading(false);
      }
    };
    loadMonthlyReportData();
  }, [selectedArea, selectedMonth, selectedYear, activeTab]);

  // Inicializar mes actual cuando se cambia a la pestaña mensual
  useEffect(() => {
    if (activeTab === 'advance-training-monthly' && selectedMonth === null) {
      const now = new Date();
      setSelectedMonth(now.getMonth() + 1); // Mes 1-12
      setSelectedYear(now.getFullYear());
    }
  }, [activeTab, selectedMonth, selectedYear]);

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
            onClick={() => exportToExcel(reportData)}
            disabled={reportData.length === 0}
          >
            <FaFileExcel /> Exportar a Excel
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
                  <Bar dataKey="Nivel1" fill={COLORS.red} name="Nivel 1" />
                  <Bar dataKey="Nivel2" fill={COLORS.redLight} name="Nivel 2" />
                  <Bar dataKey="Nivel3" fill={COLORS.gray} name="Nivel 3" />
                  <Bar dataKey="Nivel4" fill={COLORS.black} name="Nivel 4" />
                  <Bar dataKey="Entrenamiento" fill="#333" name="Entrenamiento" />
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
                    <th>Nivel 1</th>
                    <th>Nivel 2</th>
                    <th>Nivel 3</th>
                    <th>Nivel 4</th>
                    <th>ENTRENAMIENTO</th>
                  </tr>
                </thead>
                <tbody>
                  {areaData.grupos.map((grupo, index) => (
                    <tr
                      key={grupo.grupo_id || index}
                      className={isAverageRow(grupo.grupo_nombre) ? 'average-row' : ''}
                    >
                      <td className="grupo-cell">{grupo.grupo_nombre}</td>
                      <td>{formatPercentage(grupo.nivel_1)}</td>
                      <td>{formatPercentage(grupo.nivel_2)}</td>
                      <td>{formatPercentage(grupo.nivel_3)}</td>
                      <td>{formatPercentage(grupo.nivel_4)}</td>
                      <td>{formatPercentage(grupo.entrenamiento)}</td>
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

  const renderAdvanceTrainingMonthly = () => (
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
          <label>Mes:</label>
            <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Seleccionar mes</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
              <option key={month} value={month}>
                {new Date(2000, month - 1).toLocaleString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
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
            onClick={() => exportToExcel(monthlyReportData)}
            disabled={monthlyReportData.length === 0}
          >
            <FaFileExcel /> Exportar a Excel
          </button>
        </div>
        </div>

      {loading ? (
        <div className="reportes-loading">Cargando datos...</div>
      ) : viewMode === 'chart' ? (
        <div className="reportes-chart-container">
          {monthlyReportData.map((areaData) => (
            <div key={areaData.area_id} className="reporte-chart-block">
              <h3 className="reporte-chart-title">
                {new Date(areaData.year, areaData.month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })} - {areaData.area_nombre}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={getChartData([areaData])} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                  <XAxis dataKey="name" stroke={COLORS.black} angle={-35} textAnchor="end" height={80} />
                  <YAxis stroke={COLORS.black} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(value: number | undefined) => (value != null ? [`${value.toFixed(2)}%`, ''] : '')} contentStyle={{ borderColor: COLORS.red }} />
                  <Legend />
                  <Bar dataKey="Nivel1" fill={COLORS.red} name="Nivel 1" />
                  <Bar dataKey="Nivel2" fill={COLORS.redLight} name="Nivel 2" />
                  <Bar dataKey="Nivel3" fill={COLORS.gray} name="Nivel 3" />
                  <Bar dataKey="Nivel4" fill={COLORS.black} name="Nivel 4" />
                  <Bar dataKey="Entrenamiento" fill="#333" name="Entrenamiento" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
          {monthlyReportData.length === 0 && (
            <div className="reportes-empty">No hay datos disponibles para los filtros seleccionados.</div>
          )}
        </div>
      ) : (
        <div className="reportes-content">
          {monthlyReportData.map((areaData) => (
            <div key={areaData.area_id} className="reporte-table-container">
              <div className="reporte-table-header">
                <div className="reporte-week-label">
                  {new Date(areaData.year, areaData.month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </div>
                <h2>{areaData.area_nombre}</h2>
                </div>
              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Nivel 1</th>
                    <th>Nivel 2</th>
                    <th>Nivel 3</th>
                    <th>Nivel 4</th>
                    <th>ENTRENAMIENTO</th>
                  </tr>
                </thead>
                <tbody>
                  {areaData.grupos.map((grupo: any, index: number) => (
                    <tr
                      key={grupo.grupo_id || index}
                      className={isAverageRow(grupo.grupo_nombre) ? 'average-row' : ''}
                >
                      <td className="grupo-cell">{grupo.grupo_nombre}</td>
                      <td>{formatPercentage(grupo.nivel_1)}</td>
                      <td>{formatPercentage(grupo.nivel_2)}</td>
                      <td>{formatPercentage(grupo.nivel_3)}</td>
                      <td>{formatPercentage(grupo.nivel_4)}</td>
                      <td>{formatPercentage(grupo.entrenamiento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {monthlyReportData.length === 0 && !loading && (
            <div className="reportes-empty">
              No hay datos disponibles para los filtros seleccionados.
            </div>
          )}
                </div>
      )}
              </>
            );

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
        </div>
  );
};

export default Reportes;
