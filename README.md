# Frontend - Sistema de Evaluaciones

Frontend desarrollado con React y TypeScript.

## Requisitos

- Node.js 18+
- npm

## Desarrollo Local

### Instalación

```bash
# Instalar dependencias
npm install
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start
```

El frontend estará disponible en: http://localhost:3000

### Scripts disponibles

```bash
npm start          # Servidor de desarrollo
npm build          # Construir para producción
npm test           # Ejecutar tests
npm run eject      # Ejectar configuración (no recomendado)
```

## Estructura

```
frontend/
├── public/         # Archivos públicos
│   └── width_800.png  # Logo de Avery Dennison
├── src/
│   ├── components/ # Componentes React
│   │   ├── Login.tsx
│   │   └── Login.css
│   ├── services/   # Servicios API
│   ├── App.tsx     # Componente principal
│   └── App.css     # Estilos globales
├── package.json    # Dependencias
└── README.md       # Este archivo
```

## Características

- ✅ **Login**: Formulario de autenticación con logo de Avery Dennison
- ✅ **Responsive**: Funciona en móvil, tablet y desktop
- ✅ **Colores**: Paleta corporativa (rojo #e12026 y blanco)
- ✅ **Hot Reload**: Cambios automáticos durante desarrollo
- ✅ **TypeScript**: Tipado estático
- ✅ **CSS Modules**: Estilos organizados

## Configuración

El frontend se conecta automáticamente al backend en:
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/v1/health/

Asegúrate de que el backend esté ejecutándose antes de iniciar el frontend.