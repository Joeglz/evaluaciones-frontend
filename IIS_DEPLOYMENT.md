# Guía de Despliegue en IIS de Windows

Este documento explica cómo desplegar la aplicación React en IIS (Internet Information Services) de Windows.

## Requisitos Previos

1. **IIS instalado** en Windows Server o Windows con IIS habilitado
2. **URL Rewrite Module** instalado en IIS (requerido para el archivo `web.config`)
   - Descargar desde: https://www.iis.net/downloads/microsoft/url-rewrite
   - O instalar desde: `Install-WindowsFeature -name IIS-URLRewrite`

## Pasos de Despliegue

### 1. Construir la Aplicación

Ejecuta el siguiente comando para generar la versión de producción:

```bash
npm run build
```

Esto creará una carpeta `build/` con todos los archivos optimizados para producción.

### 2. Configurar IIS

1. **Crear un sitio web o aplicación en IIS:**
   - Abre el Administrador de IIS (IIS Manager)
   - Crea un nuevo sitio web o aplicación
   - Especifica el directorio físico apuntando a la carpeta `build/` del proyecto

2. **Configurar el Pool de Aplicaciones:**
   - Asegúrate de que el Application Pool esté configurado con:
     - .NET CLR Version: "No Managed Code" (ya que es una aplicación estática)
     - Managed Pipeline Mode: "Integrated"

3. **Permisos:**
   - Asegúrate de que el usuario del Application Pool (por defecto `IIS_IUSRS`) tenga permisos de lectura en la carpeta `build/`

### 3. Verificar el Módulo URL Rewrite

El archivo `web.config` requiere el módulo URL Rewrite de IIS. Si no está instalado:

- **Instalación manual:**
  1. Descarga desde: https://www.iis.net/downloads/microsoft/url-rewrite
  2. Instala el módulo
  3. Reinicia IIS

- **Instalación con PowerShell (como Administrador):**
```powershell
Install-WindowsFeature -name IIS-URLRewrite
```

### 4. Configuración de la API Backend

Si tu aplicación hace llamadas a una API backend, asegúrate de:

1. Configurar CORS en el servidor backend para permitir las solicitudes desde el dominio de IIS
2. Verificar que la URL base de la API esté correctamente configurada en `src/services/api.ts`

### 5. Verificar el Despliegue

1. Abre un navegador y accede a la URL de tu aplicación
2. Verifica que:
   - La aplicación carga correctamente
   - Las rutas funcionan (navega entre diferentes vistas)
   - Los recursos estáticos (CSS, JS, imágenes) se cargan correctamente
   - Las llamadas a la API funcionan

## Estructura de Archivos

Después del build, la estructura en IIS debería ser:

```
[Carpeta del sitio IIS]/
├── index.html
├── web.config          (copiado desde public/)
├── static/
│   ├── css/
│   │   └── main.[hash].css
│   └── js/
│       └── main.[hash].js
├── favicon.ico
├── manifest.json
└── otros archivos estáticos...
```

## Solución de Problemas

### Error 500.19 - Error de configuración

**Problema:** El archivo `web.config` no se puede leer.

**Solución:**
- Verifica que el módulo URL Rewrite esté instalado
- Verifica los permisos del archivo `web.config`
- Verifica que el XML esté bien formado

### Las rutas no funcionan / Error 404

**Problema:** Al navegar a rutas específicas, aparece un error 404.

**Solución:**
- Verifica que el módulo URL Rewrite esté instalado y habilitado
- Verifica que el archivo `web.config` esté en la raíz de la carpeta `build/`
- Reinicia IIS después de instalar el módulo

### Los recursos estáticos no se cargan

**Problema:** CSS, JS o imágenes no se cargan.

**Solución:**
- Verifica que los archivos existan en la carpeta `build/`
- Verifica los permisos de lectura en la carpeta
- Verifica la configuración de MIME types en `web.config`

### CORS errors

**Problema:** Errores de CORS al hacer llamadas a la API.

**Solución:**
- Configura CORS en el servidor backend para permitir el dominio de IIS
- Verifica la configuración de la URL base de la API

## Notas Adicionales

- El archivo `web.config` se copia automáticamente desde `public/` a `build/` durante el proceso de build
- Si necesitas modificar la configuración de IIS después del despliegue, edita el archivo `web.config` en la carpeta `build/` o modifica `public/web.config` y vuelve a hacer el build
- Para desarrollo local, puedes usar IIS Express o el servidor de desarrollo de React (`npm start`)

