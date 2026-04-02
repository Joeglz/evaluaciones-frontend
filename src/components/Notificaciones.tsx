import React, { useCallback, useEffect, useState } from 'react';
import {
  FaBell,
  FaBellSlash,
  FaCheckCircle,
  FaCheckDouble,
  FaSyncAlt,
  FaTrash,
  FaPenFancy,
} from 'react-icons/fa';
import { apiService, Notificacion, NotificacionMetadata } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './Notificaciones.css';

interface NotificacionesProps {
  onIrAFirmarEvaluacion?: (evaluacionUsuarioId: number) => void;
  onNotificacionesActualizadas?: () => void;
}

const Notificaciones: React.FC<NotificacionesProps> = ({ onIrAFirmarEvaluacion, onNotificacionesActualizadas }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [soloNoLeidas, setSoloNoLeidas] = useState<boolean>(false);
  const { toasts, removeToast, showError, showSuccess } = useToast();

  const cargarNotificaciones = useCallback(async () => {
    try {
      setCargando(true);
      const data = await apiService.obtenerNotificaciones({ solo_no_leidas: soloNoLeidas });
      setNotificaciones(data);
    } catch (error: any) {
      console.error('Error cargando notificaciones', error);
      showError(error.message || 'No se pudieron cargar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [soloNoLeidas, showError]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  const marcarComoLeida = async (notificacion: Notificacion, esLeida: boolean) => {
    try {
      await apiService.marcarNotificacionLeida(notificacion.id, esLeida);
      setNotificaciones((prev) =>
        prev.map((item) =>
          item.id === notificacion.id ? { ...item, es_leida: esLeida } : item
        )
      );
      onNotificacionesActualizadas?.();
      showSuccess(esLeida ? 'Notificación marcada como leída.' : 'Notificación marcada como no leída.');
    } catch (error: any) {
      console.error('Error actualizando notificación', error);
      showError(error.message || 'No se pudo actualizar la notificación.');
    }
  };

  const eliminarNotificacion = async (notificacion: Notificacion) => {
    try {
      await apiService.eliminarNotificacion(notificacion.id);
      setNotificaciones((prev) => prev.filter((item) => item.id !== notificacion.id));
      onNotificacionesActualizadas?.();
      showSuccess('Notificación eliminada.');
    } catch (error: any) {
      console.error('Error eliminando notificación', error);
      showError(error.message || 'No se pudo eliminar la notificación.');
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      setCargando(true);
      const resultado = await apiService.marcarTodasNotificacionesLeidas();
      await cargarNotificaciones();
      onNotificacionesActualizadas?.();
      showSuccess(
        resultado.actualizadas > 0
          ? `Se marcaron ${resultado.actualizadas} notificación(es) como leídas.`
          : 'No había notificaciones sin leer.'
      );
    } catch (error: any) {
      console.error('Error al marcar todas como leídas', error);
      showError(error.message || 'No se pudieron marcar las notificaciones.');
    } finally {
      setCargando(false);
    }
  };

  const eliminarTodasLasLeidas = async () => {
    if (
      !window.confirm(
        '¿Eliminar todas las notificaciones ya leídas? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    try {
      setCargando(true);
      const resultado = await apiService.eliminarNotificacionesLeidas();
      await cargarNotificaciones();
      onNotificacionesActualizadas?.();
      showSuccess(
        resultado.eliminadas > 0
          ? `Se eliminaron ${resultado.eliminadas} notificación(es) leídas.`
          : 'No había notificaciones leídas para eliminar.'
      );
    } catch (error: any) {
      console.error('Error al eliminar notificaciones leídas', error);
      showError(error.message || 'No se pudieron eliminar las notificaciones.');
    } finally {
      setCargando(false);
    }
  };

  const renderEstadoIcono = (notificacion: Notificacion) => {
    if (notificacion.es_leida) {
      return <FaCheckCircle className="estado-icono leida" title="Notificación leída" />;
    }
    return <FaBell className="estado-icono pendiente" title="Notificación pendiente" />;
  };

  return (
    <div className="notificaciones-container">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="notificaciones-header">
        <h2>Notificaciones</h2>
        <div className="notificaciones-actions">
          <label className="filtro-checkbox">
            <input
              type="checkbox"
              checked={soloNoLeidas}
              onChange={(e) => setSoloNoLeidas(e.target.checked)}
            />
            Mostrar solo no leídas
          </label>
          <button
            type="button"
            className="btn-marcar-todas-leidas"
            onClick={marcarTodasComoLeidas}
            disabled={cargando}
            title="Marcar todas las notificaciones como leídas"
          >
            <FaCheckDouble aria-hidden /> Marcar todas como leídas
          </button>
          <button
            type="button"
            className="btn-eliminar-leidas"
            onClick={eliminarTodasLasLeidas}
            disabled={cargando}
            title="Eliminar todas las notificaciones que ya están leídas"
          >
            <FaTrash aria-hidden /> Eliminar leídas
          </button>
          <button
            type="button"
            className="btn-recargar"
            onClick={cargarNotificaciones}
            disabled={cargando}
          >
            <FaSyncAlt /> {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="notificaciones-lista">
        {cargando && notificaciones.length === 0 ? (
          <div className="notificaciones-placeholder">
            <FaBell className="placeholder-icon" />
            <p>Cargando notificaciones...</p>
          </div>
        ) : null}

        {!cargando && notificaciones.length === 0 ? (
          <div className="notificaciones-placeholder">
            <FaBellSlash className="placeholder-icon" />
            <p>No hay notificaciones por el momento.</p>
          </div>
        ) : null}

        {notificaciones.map((notificacion) => {
          const esFirmaPendiente = (notificacion.tipo || '').toLowerCase() === 'firma_pendiente';
          const meta: NotificacionMetadata = notificacion.metadata ?? {};
          const evaluacionUsuarioId = meta.evaluacion_usuario_id;
          const puedeIrAFirmar = esFirmaPendiente && typeof evaluacionUsuarioId === 'number' && onIrAFirmarEvaluacion;

          return (
            <div
              key={notificacion.id}
              className={`notificacion-item ${notificacion.es_leida ? 'leida' : 'pendiente'}`}
            >
              <div className="notificacion-estado">{renderEstadoIcono(notificacion)}</div>
              <div className="notificacion-contenido">
                <h3 className="notificacion-titulo">{notificacion.titulo}</h3>
                <p className="notificacion-mensaje">{notificacion.mensaje}</p>
                <div className="notificacion-detalles">
                  {notificacion.evaluacion_nombre ? (
                    <span className="detalle">
                      Operación / evaluación: <strong>{notificacion.evaluacion_nombre}</strong>
                    </span>
                  ) : null}
                  {meta.operador_nombre ? (
                    <span className="detalle">
                      Operador: <strong>{String(meta.operador_nombre)}</strong>
                    </span>
                  ) : null}
                  {meta.area_nombre ? (
                    <span className="detalle">
                      Área: <strong>{String(meta.area_nombre)}</strong>
                    </span>
                  ) : null}
                  {meta.grupo_nombre ? (
                    <span className="detalle">
                      Grupo: <strong>{String(meta.grupo_nombre)}</strong>
                    </span>
                  ) : null}
                  {meta.posicion_nombre ? (
                    <span className="detalle">
                      Posición: <strong>{String(meta.posicion_nombre)}</strong>
                    </span>
                  ) : null}
                  {notificacion.firma_tipo_display ? (
                    <span className="detalle">
                      Tipo de firma: <strong>{notificacion.firma_tipo_display}</strong>
                    </span>
                  ) : null}
                  <span className="detalle">
                    Registrado: {new Date(notificacion.created_at).toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
              <div className="notificacion-acciones">
                {puedeIrAFirmar && (
                  <button
                    type="button"
                    className="btn-ir-firmar"
                    onClick={() => {
                      onIrAFirmarEvaluacion(evaluacionUsuarioId);
                      if (!notificacion.es_leida) {
                        marcarComoLeida(notificacion, true);
                      }
                    }}
                  >
                    <FaPenFancy /> Ir a firmar
                  </button>
                )}
                <button
                  type="button"
                  className="btn-estado"
                  onClick={() => marcarComoLeida(notificacion, !notificacion.es_leida)}
                >
                  {notificacion.es_leida ? 'Marcar como no leída' : 'Marcar como leída'}
                </button>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => eliminarNotificacion(notificacion)}
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notificaciones;

