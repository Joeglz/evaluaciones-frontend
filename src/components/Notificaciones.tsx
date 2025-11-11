import React, { useCallback, useEffect, useState } from 'react';
import { FaBell, FaBellSlash, FaCheckCircle, FaSyncAlt, FaTrash } from 'react-icons/fa';
import { apiService, Notificacion } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './Notificaciones.css';

const Notificaciones: React.FC = () => {
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
      showSuccess('Notificación eliminada.');
    } catch (error: any) {
      console.error('Error eliminando notificación', error);
      showError(error.message || 'No se pudo eliminar la notificación.');
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

        {notificaciones.map((notificacion) => (
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
                    Evaluación: <strong>{notificacion.evaluacion_nombre}</strong>
                  </span>
                ) : null}
                {notificacion.firma_tipo_display ? (
                  <span className="detalle">
                    Tipo de firma: <strong>{notificacion.firma_tipo_display}</strong>
                  </span>
                ) : null}
                <span className="detalle">
                  Fecha: {new Date(notificacion.created_at).toLocaleString('es-MX')}
                </span>
              </div>
            </div>
            <div className="notificacion-acciones">
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
        ))}
      </div>
    </div>
  );
};

export default Notificaciones;

