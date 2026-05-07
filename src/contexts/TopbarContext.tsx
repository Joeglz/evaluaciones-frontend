import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// Permite a cualquier vista interna "tomar control" del encabezado del
// dashboard (mostrando un botón de volver y un título contextual) en lugar de
// pintar su propia barra superior dentro de la sección.
export interface TopbarOverride {
  kicker?: string;
  title: string;
  badge?: {
    label: string;
    className?: string;
  };
  onBack?: () => void;
  backLabel?: string;
}

interface TopbarContextValue {
  override: TopbarOverride | null;
  setOverride: (override: TopbarOverride | null) => void;
}

const TopbarContext = createContext<TopbarContextValue>({
  override: null,
  setOverride: () => {},
});

export const TopbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [override, setOverrideState] = useState<TopbarOverride | null>(null);

  const setOverride = useCallback((next: TopbarOverride | null) => {
    setOverrideState(next);
  }, []);

  return (
    <TopbarContext.Provider value={{ override, setOverride }}>
      {children}
    </TopbarContext.Provider>
  );
};

export const useTopbar = () => useContext(TopbarContext);

// Hook utilitario: registra un override mientras se mantenga `enabled` y lo
// limpia automáticamente al desmontar / al cambiar a `false`.
export const useTopbarOverride = (
  override: TopbarOverride | null,
  deps: React.DependencyList,
) => {
  const { setOverride } = useTopbar();
  useEffect(() => {
    setOverride(override);
    return () => setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
