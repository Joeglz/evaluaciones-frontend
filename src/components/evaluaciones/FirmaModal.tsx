import React from 'react';
import { FaEraser, FaSave } from 'react-icons/fa';
import { TIPO_FIRMA_PRODUCCION, esFirmaModalEvaluador } from './helpers';

export type FirmaModalInfo = { tipo: string; nombre: string };

export type FirmaModalOpcionFirmante = { id: number; full_name: string };

export type FirmaModalProps = {
  open: FirmaModalInfo | null;
  firmanteId: number | null;
  onFirmanteChange: (id: number | null) => void;
  opcionesFirmante: FirmaModalOpcionFirmante[];
  canvasRef: React.RefObject<HTMLCanvasElement | null> | React.MutableRefObject<HTMLCanvasElement | null>;
  selectedUserName: string;
  currentUserLabel: string;
  modoSoloFirmasEntrenador: boolean;
  isEntrenador: boolean;
  hasSignatureForTipo: boolean;
  guardandoFirma: boolean;
  puedeGuardar: boolean;
  onClose: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onClear: () => void;
  onSave: () => void | Promise<void>;
};

const FirmaModal: React.FC<FirmaModalProps> = ({
  open,
  firmanteId,
  onFirmanteChange,
  opcionesFirmante,
  canvasRef,
  selectedUserName,
  currentUserLabel,
  modoSoloFirmasEntrenador,
  isEntrenador,
  hasSignatureForTipo,
  guardandoFirma,
  puedeGuardar,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onClear,
  onSave,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-firma" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Firma - {open.nombre}</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="modal-body">
          {open.tipo === 'empleado' ? (
            <div className="firma-firmante-info">
              Firmante: <strong>{selectedUserName || 'Empleado'}</strong>
            </div>
          ) : modoSoloFirmasEntrenador && isEntrenador ? (
            <div className="firma-firmante-info">
              Firmante (entrenador): <strong>{currentUserLabel}</strong>
            </div>
          ) : (
            <div className="firma-firmante-select">
              <label>Selecciona firmante</label>
              {opcionesFirmante.length > 0 ? (
                <select
                  value={firmanteId ?? ''}
                  onChange={(e) =>
                    onFirmanteChange(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                >
                  <option value="">Selecciona un firmante</option>
                  {opcionesFirmante.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="firma-firmante-info">
                  {open.tipo === TIPO_FIRMA_PRODUCCION
                    ? 'No hay supervisores disponibles para firmar.'
                    : esFirmaModalEvaluador(open.tipo, open.nombre)
                      ? 'No hay supervisores ni entrenadores del área disponibles para firmar.'
                      : 'No hay usuarios disponibles para firmar.'}
                </div>
              )}
            </div>
          )}
          <div className="firma-canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={600}
              height={250}
              className="firma-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={onPointerLeave}
            />
          </div>
          <div className="firma-controls">
            <button
              type="button"
              className="btn-clear-firma"
              onClick={onClear}
              disabled={!hasSignatureForTipo}
            >
              <FaEraser /> Limpiar
            </button>
            <button
              type="button"
              className="btn-guardar-firma"
              onClick={() => {
                void onSave();
              }}
              disabled={guardandoFirma || !puedeGuardar}
            >
              <FaSave /> {guardandoFirma ? 'Guardando...' : 'Guardar Firma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmaModal;
