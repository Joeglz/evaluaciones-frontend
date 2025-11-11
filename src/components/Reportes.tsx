import React, { useEffect, useMemo, useState } from 'react';
import './Reportes.css';
import {
  Area,
  AvanceMensualResponse,
  AvanceAnualResponse,
  ComposicionNivelesDetalle,
  ComposicionNivelesResponse,
  NivelClave,
  NivelEtiqueta,
  apiService,
} from '../services/api';

type AreaOption = Pick<Area, 'id' | 'name'>;

interface SegmentoNivel {
  clave: NivelClave;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  color: string;
  textoColor: string;
}

const COLORES_NIVEL: Record<NivelClave, string> = {
  onboarding: '#e12026',
  nivel_1: '#1F77B4',
  nivel_2: '#FF7F0E',
  nivel_3: '#2CA02C',
  nivel_4: '#9467BD',
};

const COLOR_TEXTO_NIVEL: Record<NivelClave, string> = {
  onboarding: '#ffffff',
  nivel_1: '#ffffff',
  nivel_2: '#1f1f1f',
  nivel_3: '#ffffff',
  nivel_4: '#ffffff',
};

const ORDEN_NIVELES: NivelClave[] = ['onboarding', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4'];

const TITULOS_POR_DEFECTO: Record<NivelClave, string> = {
  onboarding: 'Onboarding',
  nivel_1: 'Nivel 1',
  nivel_2: 'Nivel 2',
  nivel_3: 'Nivel 3',
  nivel_4: 'Nivel 4',
};

const obtenerMesActual = (): string => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
};

const MESES_MAXIMOS_LINEA = 3;

const generarMesesDisponibles = (cantidad: number): string[] => {
  const meses: string[] = [];
  const fecha = new Date();

  for (let i = 0; i < cantidad; i += 1) {
    const temp = new Date(fecha.getFullYear(), fecha.getMonth() - i, 1);
    const anio = temp.getFullYear();
    const mes = String(temp.getMonth() + 1).padStart(2, '0');
    meses.push(`${anio}-${mes}`);
  }

  return meses;
};

const Reportes: React.FC = () => {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => obtenerMesActual());
  const [reporte, setReporte] = useState<ComposicionNivelesResponse | null>(null);
  const [cargandoAreas, setCargandoAreas] = useState<boolean>(false);
  const [cargandoReporte, setCargandoReporte] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mesesDisponibles = useMemo(() => generarMesesDisponibles(12), []);
  const [trendAreaId, setTrendAreaId] = useState<number | null>(null);
  const [trendMonths, setTrendMonths] = useState<string[]>(() =>
    generarMesesDisponibles(12).slice(0, MESES_MAXIMOS_LINEA).sort()
  );
  const [trendData, setTrendData] = useState<AvanceMensualResponse | null>(null);
  const [cargandoAvance, setCargandoAvance] = useState<boolean>(false);
  const [avanceError, setAvanceError] = useState<string | null>(null);
  const [trendLimitError, setTrendLimitError] = useState<string | null>(null);
  const [annualAreaId, setAnnualAreaId] = useState<number | null>(null);
  const [annualData, setAnnualData] = useState<AvanceAnualResponse | null>(null);
  const [cargandoAnual, setCargandoAnual] = useState<boolean>(false);
  const [anualError, setAnualError] = useState<string | null>(null);

  useEffect(() => {
    const obtenerAreas = async () => {
      setCargandoAreas(true);
      setError(null);
      try {
        const respuesta = await apiService.getAreas({ is_active: true });
        const opcionesBase = (respuesta.results || [])
          .map<AreaOption>((area) => ({
            id: area.id,
            name: area.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const opciones = [{ id: 0, name: 'Todas las áreas' }, ...opcionesBase];

        setAreas(opciones);
        if (opciones.length > 0) {
          setSelectedAreaId((prev) => (prev === null ? opciones[0].id : prev));
          setTrendAreaId((prev) => (prev === null ? opciones[0].id : prev));
          setAnnualAreaId((prev) => (prev === null ? opciones[0].id : prev));
        }
      } catch (e) {
        setError('No se pudieron cargar las áreas. Intenta más tarde.');
      } finally {
        setCargandoAreas(false);
      }
    };

    obtenerAreas();
  }, []);

  useEffect(() => {
    const obtenerReporte = async (areaId: number, mesSeleccionado: string) => {
      setCargandoReporte(true);
      setError(null);
      try {
        const [anioStr, mesStr] = mesSeleccionado.split('-');
        const anio = Number(anioStr);
        const mes = Number(mesStr);

        if (!anio || !mes) {
          setError('Selecciona un mes válido para consultar el reporte.');
          setReporte(null);
          setCargandoReporte(false);
          return;
        }

        const datos = await apiService.getReporteComposicionNiveles({
          area_id: areaId,
          anio,
          mes,
        });
        setReporte(datos);
      } catch (e) {
        setError('No se pudo cargar el reporte de composición. Intenta nuevamente.');
        setReporte(null);
      } finally {
        setCargandoReporte(false);
      }
    };

    if (typeof selectedAreaId === 'number' && selectedMonth) {
      obtenerReporte(selectedAreaId, selectedMonth);
    }
  }, [selectedAreaId, selectedMonth]);

  useEffect(() => {
    const obtenerAvanceMensual = async (areaId: number, mesesSeleccionados: string[]) => {
      setCargandoAvance(true);
      setAvanceError(null);
      try {
        const mesesOrdenados = [...mesesSeleccionados].sort();
        const datos = await apiService.getReporteAvanceMensual({
          area_id: areaId,
          meses: mesesOrdenados,
        });
        setTrendData(datos);
      } catch (e) {
        setAvanceError('No se pudo cargar el avance mensual de entrenamiento. Intenta nuevamente.');
        setTrendData(null);
      } finally {
        setCargandoAvance(false);
      }
    };

    if (typeof trendAreaId === 'number' && trendMonths.length > 0) {
      obtenerAvanceMensual(trendAreaId, trendMonths);
    } else {
      setTrendData(null);
      if (trendMonths.length === 0) {
        setAvanceError('Selecciona al menos un mes para visualizar la tendencia.');
      }
    }
  }, [trendAreaId, trendMonths]);

  useEffect(() => {
    const obtenerAvanceAnual = async (areaId: number) => {
      setCargandoAnual(true);
      setAnualError(null);
      try {
        const datos = await apiService.getReporteAvanceAnual({ area_id: areaId });
        setAnnualData(datos);
      } catch (e) {
        setAnnualData(null);
        setAnualError('No se pudo cargar el avance anual de entrenamiento. Intenta nuevamente.');
      } finally {
        setCargandoAnual(false);
      }
    };

    if (typeof annualAreaId === 'number') {
      obtenerAvanceAnual(annualAreaId);
    } else {
      setAnnualData(null);
    }
  }, [annualAreaId]);

  const nivelesOrdenados: NivelClave[] = useMemo(() => {
    if (reporte?.niveles?.length) {
      return reporte.niveles.map((nivel) => nivel.clave);
    }
    return ORDEN_NIVELES;
  }, [reporte]);

  const etiquetasNivel: Record<NivelClave, string> = useMemo(() => {
    const etiquetas: Record<NivelClave, string> = { ...TITULOS_POR_DEFECTO };

    if (reporte?.niveles) {
      reporte.niveles.forEach((nivel: NivelEtiqueta) => {
        etiquetas[nivel.clave] = nivel.etiqueta;
      });
    }

    return etiquetas;
  }, [reporte]);

  const manejarCambioArea = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = evento.target.value;
    if (!valor) {
      setSelectedAreaId(null);
      setReporte(null);
      return;
    }
    setSelectedAreaId(Number(valor));
  };

  const manejarCambioMes = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const valor = evento.target.value;
    setSelectedMonth(valor);
  };

  const manejarCambioAreaAvance = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = evento.target.value;
    if (!valor) {
      setTrendAreaId(null);
      setTrendData(null);
      return;
    }
    setTrendAreaId(Number(valor));
    setTrendLimitError(null);
    setAvanceError(null);
  };

  const manejarSeleccionMesesAvance = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const opcionesSeleccionadas = Array.from(evento.target.selectedOptions).map((opt) => opt.value);

    if (opcionesSeleccionadas.length > MESES_MAXIMOS_LINEA) {
      setTrendLimitError(`Solo puedes seleccionar hasta ${MESES_MAXIMOS_LINEA} meses a la vez.`);
      Array.from(evento.target.options).forEach((option) => {
        option.selected = trendMonths.includes(option.value);
      });
      return;
    }

    setTrendLimitError(null);
    if (opcionesSeleccionadas.length === 0) {
      setAvanceError('Selecciona al menos un mes para visualizar la tendencia.');
    } else {
      setAvanceError(null);
    }
    setTrendMonths(opcionesSeleccionadas.sort());
  };

  const manejarCambioAreaAnual = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = evento.target.value;
    if (!valor) {
      setAnnualAreaId(null);
      setAnnualData(null);
      return;
    }
    setAnnualAreaId(Number(valor));
  };

  const formatearPeriodo = (anio: number, mes: number): string => {
    const fecha = new Date(anio, mes - 1, 1);
    return fecha.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatearPeriodoDesdeCadena = (valor: string): string => {
    const [anioStr, mesStr] = valor.split('-');
    const anio = Number(anioStr);
    const mes = Number(mesStr);
    if (!anio || !mes) {
      return valor;
    }
    return formatearPeriodo(anio, mes);
  };

  const obtenerCantidadPorNivel = (detalle: ComposicionNivelesDetalle, clave: NivelClave): number => {
    switch (clave) {
      case 'onboarding':
        return detalle.onboarding;
      case 'nivel_1':
        return detalle.nivel_1;
      case 'nivel_2':
        return detalle.nivel_2;
      case 'nivel_3':
        return detalle.nivel_3;
      case 'nivel_4':
        return detalle.nivel_4;
      default:
        return 0;
    }
  };

  const construirSegmentos = (detalle: ComposicionNivelesDetalle): SegmentoNivel[] => {
    const segmentos: SegmentoNivel[] = [];
    const total = detalle.total_usuarios;

    if (total <= 0) {
      return segmentos;
    }

    nivelesOrdenados.forEach((clave) => {
      const cantidad = obtenerCantidadPorNivel(detalle, clave);
      if (!cantidad) {
        return;
      }
      const porcentaje = (cantidad / total) * 100;
      segmentos.push({
        clave,
        etiqueta: etiquetasNivel[clave],
        cantidad,
        porcentaje,
        color: COLORES_NIVEL[clave],
        textoColor: COLOR_TEXTO_NIVEL[clave],
      });
    });

    return segmentos;
  };

  const mostrarContenido = () => {
    if (error) {
      return (
        <div className="reportes-mensaje error" role="alert">
          {error}
        </div>
      );
    }

    if (cargandoAreas || cargandoReporte) {
      return (
        <div className="reportes-mensaje" role="status" aria-live="polite">
          Cargando información...
        </div>
      );
    }

    if (!areas.length) {
      return (
        <div className="reportes-mensaje" role="status" aria-live="polite">
          No hay áreas disponibles para mostrar.
        </div>
      );
    }

    if (!reporte || !reporte.posiciones.length) {
      return (
        <div className="reportes-mensaje" role="status" aria-live="polite">
          No se encontraron usuarios con posiciones asignadas en esta área.
        </div>
      );
    }

    return (
      <>
        {reporte && (
          <div className="reportes-periodo">
            Periodo seleccionado: <strong>{formatearPeriodo(reporte.anio, reporte.mes)}</strong>
          </div>
        )}
        <div className="reportes-legend">
          {nivelesOrdenados.map((clave) => (
            <div className="reportes-legend__item" key={clave}>
              <span
                className="reportes-legend__swatch"
                style={{ backgroundColor: COLORES_NIVEL[clave] }}
              />
              <span>{etiquetasNivel[clave]}</span>
            </div>
          ))}
        </div>

        <div className="reportes-total">
          Total de usuarios en el área: <strong>{reporte.total_usuarios}</strong>
        </div>

        <div className="reportes-grafica">
          {reporte.posiciones.map((detalle) => {
            const segmentos = construirSegmentos(detalle);
            return (
              <div className="reportes-grafica__fila" key={detalle.posicion_id}>
                <div className="reportes-grafica__encabezado">
                  <span className="reportes-grafica__posicion">{detalle.posicion_nombre}</span>
                  <span className="reportes-grafica__total">
                    {detalle.total_usuarios} usuario{detalle.total_usuarios === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="reportes-grafica__barra" role="group" aria-label={`Distribución por niveles para ${detalle.posicion_nombre}`}>
                  {segmentos.length === 0 ? (
                    <div className="reportes-grafica__barra--vacia">Sin información</div>
                  ) : (
                    segmentos.map((segmento) => {
                      const porcentajeRedondeado =
                        segmento.porcentaje >= 10
                          ? Math.round(segmento.porcentaje)
                          : Math.round(segmento.porcentaje * 10) / 10;
                      return (
                        <div
                          key={segmento.clave}
                          className="reportes-grafica__segmento"
                          style={{
                            width: `${segmento.porcentaje}%`,
                            backgroundColor: segmento.color,
                            color: segmento.textoColor,
                          }}
                          title={`${segmento.etiqueta}: ${segmento.cantidad} usuario${segmento.cantidad === 1 ? '' : 's'} (${porcentajeRedondeado}%)`}
                          aria-label={`${segmento.etiqueta}: ${segmento.cantidad} usuario${segmento.cantidad === 1 ? '' : 's'} (${porcentajeRedondeado}%)`}
                        >
                          {segmento.porcentaje >= 12 ? `${porcentajeRedondeado}%` : ''}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <section className="reportes-contenedor">
      <header className="reportes-encabezado">
        <div>
          <h2>Avance por posición</h2>
          <p className="reportes-descripcion">
            Visualiza la distribución de usuarios por nivel alcanzado dentro de cada posición del área seleccionada.
          </p>
        </div>
        <div className="reportes-filtros">
          <div className="reportes-select-wrapper">
            <label className="reportes-select__label" htmlFor="area-select">
              Área
            </label>
            <select
              id="area-select"
              className="reportes-select"
              value={selectedAreaId ?? ''}
              onChange={manejarCambioArea}
              disabled={cargandoAreas}
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="reportes-select-wrapper">
            <label className="reportes-select__label" htmlFor="mes-select">
              Mes
            </label>
            <input
              id="mes-select"
              className="reportes-input"
              type="month"
              value={selectedMonth}
              onChange={manejarCambioMes}
              max={obtenerMesActual()}
            />
          </div>
        </div>
      </header>

      <div className="reportes-contenido">{mostrarContenido()}</div>

      <section className="reportes-linea">
        <header className="reportes-linea__cabecera">
          <div>
            <h3>Avance Mensual de Entrenamiento</h3>
            <p>Selecciona un área y hasta {MESES_MAXIMOS_LINEA} meses para visualizar la tendencia.</p>
          </div>
        </header>

        <div className="reportes-linea__filtros">
          <div className="reportes-select-wrapper">
            <label className="reportes-select__label" htmlFor="area-avance-select">
              Área
            </label>
            <select
              id="area-avance-select"
              className="reportes-select"
              value={trendAreaId ?? ''}
              onChange={manejarCambioAreaAvance}
              disabled={cargandoAreas}
            >
              {areas.map((area) => (
                <option key={`avance-${area.id}`} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div className="reportes-linea__meses">
            <label className="reportes-linea__meses-label" htmlFor="meses-avance-select">
              Meses
            </label>
            <select
              id="meses-avance-select"
              className="reportes-linea__meses-select"
              multiple
              size={6}
              value={trendMonths}
              onChange={manejarSeleccionMesesAvance}
            >
              {mesesDisponibles.map((mes) => (
                <option key={mes} value={mes}>
                  {formatearPeriodoDesdeCadena(mes)}
                </option>
              ))}
            </select>
            <span className="reportes-linea__meses-nota">
              Puedes activar hasta {MESES_MAXIMOS_LINEA} meses a la vez.
            </span>
          </div>
        </div>

        {trendLimitError && (
          <div className="reportes-mensaje error" role="alert">
            {trendLimitError}
          </div>
        )}

        <div className="reportes-linea__contenido">
          {(() => {
            if (cargandoAvance) {
              return (
                <div className="reportes-mensaje" role="status" aria-live="polite">
                  Cargando evolución mensual...
                </div>
              );
            }

            if (avanceError) {
              return (
                <div className="reportes-mensaje error" role="alert">
                  {avanceError}
                </div>
              );
            }

            if (!trendData || trendData.serie.length === 0) {
              return (
                <div className="reportes-mensaje" role="status" aria-live="polite">
                  No se registran niveles completados en los meses seleccionados.
                </div>
              );
            }

            const serie = trendData.serie;
            const maxValor = Math.max(...serie.map((punto) => punto.niveles_completados), 0);
            const ancho = 620;
            const alto = 260;
            const padding = 45;
            const anchoUtil = ancho - padding * 2;
            const altoUtil = alto - padding * 2;

            const puntos = serie.map((punto, indice) => {
              const x =
                serie.length === 1
                  ? ancho / 2
                  : padding + (indice / (serie.length - 1)) * anchoUtil;
              const ratio = maxValor === 0 ? 0 : punto.niveles_completados / maxValor;
              const y = alto - padding - ratio * altoUtil;
              return { ...punto, x, y };
            });

            const linea = puntos
              .map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`)
              .join(' ');

            const ejeX = `M ${padding} ${alto - padding} L ${ancho - padding} ${alto - padding}`;
            const ejeY = `M ${padding} ${padding} L ${padding} ${alto - padding}`;

            return (
              <>
                <svg
                  className="reportes-linea__svg"
                  viewBox={`0 0 ${ancho} ${alto}`}
                  role="img"
                  aria-label="Avance Mensual de Entrenamiento"
                >
                  <path d={ejeX} className="reportes-linea__eje" />
                  <path d={ejeY} className="reportes-linea__eje" />
                  {maxValor > 0 && (
                    <text
                      className="reportes-linea__eje-texto"
                      x={padding - 12}
                      y={padding + 4}
                      textAnchor="end"
                    >
                      {maxValor}
                    </text>
                  )}
                  <path d={linea} className="reportes-linea__trazo" />
                  {puntos.map((punto) => {
                    const etiquetaY = Math.min(punto.y - 12, alto - padding - 6);
                    return (
                      <g key={`punto-${punto.mes}`}>
                        <circle className="reportes-linea__punto" cx={punto.x} cy={punto.y} r={5} />
                        <text
                          className="reportes-linea__valor"
                          x={punto.x}
                          y={etiquetaY}
                          textAnchor="middle"
                        >
                          {punto.niveles_completados}
                        </text>
                        <text
                          className="reportes-linea__etiqueta"
                          x={punto.x}
                          y={alto - padding + 24}
                          textAnchor="middle"
                        >
                          {formatearPeriodoDesdeCadena(punto.mes)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="reportes-linea__resumen">
                  Total de niveles completados en el periodo:{' '}
                  <strong>{trendData.total_niveles}</strong>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      <section className="reportes-linea">
        <header className="reportes-linea__cabecera">
          <div>
            <h3>Avance Anual de Entrenamiento</h3>
            <p>Observa la evolución de los niveles completados en los últimos tres años.</p>
          </div>
        </header>

        <div className="reportes-linea__filtros">
          <div className="reportes-select-wrapper">
            <label className="reportes-select__label" htmlFor="area-anual-select">
              Área
            </label>
            <select
              id="area-anual-select"
              className="reportes-select"
              value={annualAreaId ?? ''}
              onChange={manejarCambioAreaAnual}
              disabled={cargandoAreas}
            >
              {areas.map((area) => (
                <option key={`anual-${area.id}`} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="reportes-linea__contenido">
          {(() => {
            if (cargandoAnual) {
              return (
                <div className="reportes-mensaje" role="status" aria-live="polite">
                  Cargando avance anual...
                </div>
              );
            }

            if (anualError) {
              return (
                <div className="reportes-mensaje error" role="alert">
                  {anualError}
                </div>
              );
            }

            if (!annualData || annualData.serie.length === 0) {
              return (
                <div className="reportes-mensaje" role="status" aria-live="polite">
                  No se registran niveles completados en los últimos años.
                </div>
              );
            }

            const serie = annualData.serie;
            const maxValor = Math.max(...serie.map((punto) => punto.niveles_completados), 0);
            const ancho = 620;
            const alto = 260;
            const padding = 45;
            const anchoUtil = ancho - padding * 2;
            const altoUtil = alto - padding * 2;

            const puntos = serie.map((punto, indice) => {
              const x =
                serie.length === 1
                  ? ancho / 2
                  : padding + (indice / (serie.length - 1)) * anchoUtil;
              const ratio = maxValor === 0 ? 0 : punto.niveles_completados / maxValor;
              const y = alto - padding - ratio * altoUtil;
              return { ...punto, x, y };
            });

            const linea = puntos
              .map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`)
              .join(' ');

            const ejeX = `M ${padding} ${alto - padding} L ${ancho - padding} ${alto - padding}`;
            const ejeY = `M ${padding} ${padding} L ${padding} ${alto - padding}`;

            return (
              <>
                <svg
                  className="reportes-linea__svg"
                  viewBox={`0 0 ${ancho} ${alto}`}
                  role="img"
                  aria-label="Avance Anual de Entrenamiento"
                >
                  <path d={ejeX} className="reportes-linea__eje" />
                  <path d={ejeY} className="reportes-linea__eje" />
                  {maxValor > 0 && (
                    <text
                      className="reportes-linea__eje-texto"
                      x={padding - 12}
                      y={padding + 4}
                      textAnchor="end"
                    >
                      {maxValor}
                    </text>
                  )}
                  <path d={linea} className="reportes-linea__trazo" />
                  {puntos.map((punto) => {
                    const etiquetaY = Math.min(punto.y - 12, alto - padding - 6);
                    return (
                      <g key={`punto-anual-${punto.anio}`}>
                        <circle className="reportes-linea__punto" cx={punto.x} cy={punto.y} r={5} />
                        <text
                          className="reportes-linea__valor"
                          x={punto.x}
                          y={etiquetaY}
                          textAnchor="middle"
                        >
                          {punto.niveles_completados}
                        </text>
                        <text
                          className="reportes-linea__etiqueta"
                          x={punto.x}
                          y={alto - padding + 24}
                          textAnchor="middle"
                        >
                          {punto.anio}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="reportes-linea__resumen">
                  Total de niveles completados en estos años:{' '}
                  <strong>{annualData.total_niveles}</strong>
                </div>
              </>
            );
          })()}
        </div>
      </section>
    </section>
  );
};

export default Reportes;


