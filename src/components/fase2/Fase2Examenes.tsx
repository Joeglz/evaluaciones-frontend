import React, { useMemo, useState } from 'react';
import { FASE2_AREAS, FASE2_USUARIOS, pickPreguntasExamenAleatorias } from '../../mock/fase2/data';
import { NIVELES_EXAMEN_AUTO, type Fase2PreguntaExamen, type NivelEvaluacion } from '../../mock/fase2/types';

type ExamStep = 'setup' | 'taking' | 'result';

const Fase2Examenes: React.FC = () => {
  const piloto = FASE2_AREAS.find((a) => a.esPiloto)?.id ?? 2;
  const [areaId, setAreaId] = useState(piloto);
  const [nivel, setNivel] = useState<NivelEvaluacion>(2);
  const [usuarioId, setUsuarioId] = useState(
    () => FASE2_USUARIOS.find((u) => u.areaId === piloto)?.id ?? FASE2_USUARIOS[0]?.id ?? 1
  );
  const [step, setStep] = useState<ExamStep>('setup');
  const [preguntas, setPreguntas] = useState<Fase2PreguntaExamen[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);

  const usuariosArea = useMemo(
    () => FASE2_USUARIOS.filter((u) => u.areaId === areaId),
    [areaId]
  );

  const iniciarExamen = () => {
    const picked = pickPreguntasExamenAleatorias(areaId, nivel, 10);
    setPreguntas(picked);
    setRespuestas({});
    setStep('taking');
  };

  const finalizar = () => {
    let ok = 0;
    preguntas.forEach((p) => {
      if (respuestas[p.id] === p.correcta) ok += 1;
    });
    setScore(ok);
    setStep('result');
  };

  if (step === 'setup') {
    return (
      <div>
        <h2>Exámenes de certificación</h2>
        <p className="fase2-note" style={{ marginTop: '0.5rem' }}>
          Se disparan <strong>automáticamente al completar N2, N3 o N4</strong>. El sistema elige{' '}
          <strong>hasta 10 preguntas</strong> del banco (al azar si hay 15+; si hay menos, salen todas). N1 no lleva examen
          aleatorio: es la seguridad bloqueante.
        </p>

        <div className="fase2-bloque-gris" style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Área{' '}
            <select
              value={areaId}
              onChange={(e) => {
                const nextArea = Number(e.target.value);
                setAreaId(nextArea);
                setUsuarioId(FASE2_USUARIOS.find((u) => u.areaId === nextArea)?.id ?? 1);
              }}
              style={{ minHeight: 44, marginLeft: '0.5rem' }}
            >
              {FASE2_AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {a.esPiloto ? ' (piloto)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Nivel (auto){' '}
            <select
              value={nivel}
              onChange={(e) => setNivel(Number(e.target.value) as NivelEvaluacion)}
              style={{ minHeight: 44, marginLeft: '0.5rem' }}
            >
              {NIVELES_EXAMEN_AUTO.map((n) => (
                <option key={n} value={n}>
                  Nivel {n}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            Evaluado{' '}
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(Number(e.target.value))}
              style={{ minHeight: 44, marginLeft: '0.5rem' }}
            >
              {usuariosArea.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.numeroEmpleado})
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="fase2-btn-primary" onClick={iniciarExamen}>
          Simular examen al completar el nivel (10 al azar)
        </button>
      </div>
    );
  }

  if (step === 'taking') {
    return (
      <div>
        <h2>Examen en curso — N{nivel}</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          {preguntas.length} preguntas · cada evaluado recibe un cuestionario distinto
        </p>
        <div style={{ marginTop: '1rem' }}>
          {preguntas.map((p, idx) => (
            <div key={p.id} className="fase2-card" style={{ marginBottom: '0.75rem', cursor: 'default' }}>
              <strong>
                {idx + 1}. {p.texto}
              </strong>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {p.opciones.map((op, oi) => (
                  <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44 }}>
                    <input
                      type="radio"
                      name={`q-${p.id}`}
                      checked={respuestas[p.id] === oi}
                      onChange={() => setRespuestas((prev) => ({ ...prev, [p.id]: oi }))}
                    />
                    {op}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="fase2-btn-primary" onClick={finalizar}>
          Enviar respuestas
        </button>
      </div>
    );
  }

  const aprobado = score >= 8;
  return (
    <div>
      <h2>Resultado</h2>
      <div className={`fase2-result ${aprobado ? 'ok' : 'fail'}`}>
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
          {aprobado ? 'Aprobado' : 'No aprobado'} — {score}/{preguntas.length} correctas
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
          Calificación automática. Mínimo 8/10 para certificar N{nivel}.
        </p>
      </div>
      <button
        type="button"
        className="fase2-btn-primary"
        style={{ marginTop: '1rem' }}
        onClick={() => setStep('setup')}
      >
        Nuevo examen
      </button>
    </div>
  );
};

export default Fase2Examenes;
