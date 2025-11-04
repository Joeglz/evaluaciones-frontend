# Configuración de URLs del Backend

## Variables de Entorno

Para configurar las URLs del backend, puedes crear un archivo `.env` en la carpeta `frontend/` con las siguientes variables:

```bash
# URL base del API (incluye /api/v1)
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1

# URL base del backend (sin /api/v1, para archivos media)
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Ejemplos para Diferentes Entornos

### Desarrollo Local
```bash
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Docker
```bash
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Producción
```bash
REACT_APP_API_BASE_URL=https://tu-dominio.com/api/v1
REACT_APP_BACKEND_URL=https://tu-dominio.com
```

### Staging
```bash
REACT_APP_API_BASE_URL=https://staging.tu-dominio.com/api/v1
REACT_APP_BACKEND_URL=https://staging.tu-dominio.com
```

## Uso en el Código

La función `getMediaUrl()` en `services/api.ts` construye automáticamente las URLs completas para archivos media usando estas variables de entorno.

```typescript
import { getMediaUrl } from '../services/api';

// Para mostrar una imagen de firma
<img src={getMediaUrl(user.signature)} alt="Firma" />
```

## Valores por Defecto

Si no se configuran las variables de entorno, se usarán los valores por defecto según el entorno:

**Desarrollo (npm start):**
- `REACT_APP_API_BASE_URL`: `/api/v1` (usa proxy a localhost:8000)
- `REACT_APP_BACKEND_URL`: vacío (usa proxy)

**Producción (npm run build:prod o build):**
- `REACT_APP_API_BASE_URL`: `http://10.12.46.229:8000/api/v1`
- `REACT_APP_BACKEND_URL`: `http://10.12.46.229:8000`

## Scripts de Build

### Desarrollo Local
```bash
npm start
# Usa proxy configurado en package.json (localhost:8000)
```

### Build para Producción
```bash
# Build con IP de producción por defecto
npm run build:prod

# O build normal (usa valores por defecto según NODE_ENV)
npm run build
```

El script `build:prod` automáticamente configura las variables de entorno para producción con la IP del servidor.

