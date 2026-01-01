# HabitFlow - Personal Habit Tracker
## Documentación Técnica Completa v6.0

---

## Resumen Ejecutivo

**HabitFlow** es una aplicación de escritorio multiplataforma diseñada para el seguimiento exhaustivo de hábitos, actividades y datos personales. La aplicación permite registrar, visualizar y analizar múltiples aspectos de la vida diaria desde una interfaz centralizada e intuitiva.

**Estado actual**: Frontend completo implementado con diseño dark mode, sistema de widgets modular, gestión de assets, vistas de seguimiento extenso y calendario de actividades.

**Cliente**: chamero  
**Desarrollador**: DaniPP (Danilo López)  
**Inicio del proyecto**: Diciembre 2025  
**Versión actual**: 6.0

---

## Stack Tecnológico

### Frontend & UI
- **Electron**: Framework principal para aplicación desktop multiplataforma
- **React 19.2.0**: Librería UI con componentes funcionales y hooks
- **TypeScript 5.x**: Tipado estático para mayor seguridad y mantenibilidad
- **Tailwind CSS v4**: Framework CSS utility-first para estilos
- **shadcn/ui**: Sistema de componentes accesibles y personalizables

### Visualización de Datos
- **Recharts**: Librería para gráficos interactivos (líneas, barras, donut, áreas)

### Gestión de Estado
- **React Context API**: Estado global compartido entre componentes
- **LocalStorage**: Persistencia de datos local en el dispositivo

### Base de Datos (Próximo)
- **SQL Server LocalDB**: Base de datos local para mayor escalabilidad
- Alternativa: SQLite para simplicidad y portabilidad

---

## Arquitectura del Proyecto

\`\`\`
habitflow/
├── app/                              # Rutas y páginas de la aplicación
│   ├── page.tsx                     # Dashboard principal
│   ├── layout.tsx                   # Layout raíz con providers
│   ├── globals.css                  # Estilos globales y tema
│   ├── calendar/                    # Vista de calendario
│   │   └── page.tsx
│   ├── assets/                      # Gestión de recursos visuales
│   │   ├── page.tsx                 # Vista principal de assets
│   │   └── loading.tsx              # Estado de carga
│   └── tracking/                    # Vistas de seguimiento extenso
│       ├── weight/page.tsx
│       ├── exercise/page.tsx
│       ├── diet/page.tsx
│       ├── tasks/page.tsx
│       ├── books/page.tsx
│       ├── tv/page.tsx
│       ├── gaming/page.tsx
│       └── media/page.tsx
│
├── components/                       # Componentes React reutilizables
│   ├── widgets/                     # Widgets del dashboard
│   │   ├── exercise-widget.tsx
│   │   ├── diet-widget.tsx
│   │   ├── weight-widget.tsx
│   │   ├── tasks-widget.tsx
│   │   ├── media-widget.tsx
│   │   ├── tv-widget.tsx
│   │   ├── books-widget.tsx
│   │   └── gaming-widget.tsx
│   ├── ui/                          # Componentes base de shadcn
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── progress.tsx
│   │   └── ... (30+ componentes)
│   ├── sidebar.tsx                  # Navegación lateral
│   ├── dashboard-header.tsx         # Header con controles
│   └── app-layout.tsx               # Layout wrapper
│
├── contexts/                         # Estado global
│   └── app-data-context.tsx         # Provider de datos de la app
│
├── types/                            # Definiciones TypeScript
│   └── index.ts                     # Tipos: Asset, ActivityLog, etc.
│
├── lib/                              # Utilidades y helpers
│   ├── utils.ts                     # Función cn() y utilidades
│   └── asset-utils.ts               # Gestión de assets
│
├── hooks/                            # Custom React hooks
│   ├── use-mobile.tsx               # Detección de dispositivo móvil
│   └── use-toast.ts                 # Sistema de notificaciones
│
└── package.json                      # Dependencias del proyecto
\`\`\`

---

## Funcionalidades Implementadas ✅

### 1. Dashboard Principal

El dashboard es el corazón de la aplicación, diseñado para mostrar un resumen completo del día actual de un vistazo.

#### Widgets Disponibles:

**Exercise Widget**
- Visualización de horas de ejercicio del día
- Barra de progreso hacia objetivo diario
- Comparativa con objetivo semanal
- Entrada rápida de nuevas sesiones

**Diet Widget**
- Tracking de macronutrientes (Proteínas, Carbohidratos, Grasas)
- Gráfico tipo donut con distribución porcentual
- Contador de calorías totales
- Entrada rápida de comidas

**Weight Widget**
- Gráfico de línea temporal del peso
- Visualización de tendencia (subiendo/bajando)
- Indicador de peso objetivo
- Entrada rápida de nuevo peso

**Tasks Widget**
- Lista de tareas del día
- Checkbox interactivo para marcar completadas
- Porcentaje de completitud
- Entrada rápida de nueva tarea

**Media Widget (Redes Sociales)**
- Tiempo total en redes sociales
- Desglose por plataforma (Instagram, Twitter, TikTok, etc.)
- Gráfico de barras horizontales
- Sistema de categorías extensible

**TV Widget (Series/Películas)**
- Serie actual en progreso
- Episodios vistos vs totales
- Barra de progreso de temporada
- Entrada rápida de episodios

**Books Widget (Lectura)**
- Libro actual
- Páginas leídas hoy
- Tiempo de lectura
- Progreso total del libro

**Gaming Widget**
- Tiempo de juego del día
- Último juego jugado
- Estadísticas semanales
- Entrada rápida de sesión

#### Características del Dashboard:
- Layout responsive tipo grid (2x4 en desktop)
- Entrada rápida desde cada widget (sin cambiar de vista)
- Modo oscuro por defecto (dark gray/black)
- Animaciones suaves en interacciones
- Actualización en tiempo real

### 2. Sistema de Gestión de Assets

Sistema completo para administrar imágenes y recursos visuales que se utilizan en los trackers.

#### Características Principales:

**Sistema de Staging**
- Los assets se "preparan" antes de confirmar
- Vista previa antes de guardar
- Opción de cancelar o confirmar carga
- Evita errores al subir archivos

**Métodos de Carga**
1. Drag & Drop: Arrastra imágenes directamente
2. File Picker: Botón para seleccionar archivos
3. Clipboard (Ctrl+V): Pega imágenes capturadas

**Categorización Automática**
- Games: Portadas de videojuegos
- Books: Portadas de libros
- TV: Posters de series/películas
- Apps: Iconos de aplicaciones
- Other: Categoría general

**Gestión de Assets**
- Vista en Grid o Lista
- Búsqueda por nombre
- Filtrado por categoría
- Previsualización ampliada
- Edición de metadatos (nombre, categoría)
- Descarga individual
- Eliminación con confirmación
- Eliminación en cascada (elimina referencias en logs)

**Almacenamiento**
- Formato Base64 (sin servidor necesario)
- Metadatos: nombre, tipo, tamaño, categoría, fechas
- Persistencia en LocalStorage
- Sin límite de assets (sujeto a capacidad del navegador)

### 3. Vistas de Seguimiento Extenso

Cada categoría de widget tiene su propia vista detallada con información histórica completa.

#### Weight Tracking (`/tracking/weight`)
- Gráfico de línea temporal con zoom
- Historial completo de registros
- Estadísticas: peso promedio, mínimo, máximo
- Tendencia semanal/mensual
- Formulario para agregar peso
- Tabla con todos los registros históricos

#### Exercise Tracking (`/tracking/exercise`)
- Gráfico de barras de horas por día
- Filtros por tipo de ejercicio
- Estadísticas de frecuencia
- Registro detallado: tipo, duración, intensidad
- Calendario de consistencia

#### Diet Tracking (`/tracking/diet`)
- Gráfico de calorías diarias
- Desglose de macronutrientes por comida
- Historial de comidas
- Análisis nutricional semanal
- Búsqueda de alimentos comunes

#### Tasks Tracking (`/tracking/tasks`)
- Vista Kanban de tareas
- Filtros: completadas, pendientes, todas
- Categorías de tareas
- Fechas de vencimiento
- Prioridades

#### Media Tracking (`/tracking/media`)
- Gráfico de tiempo por plataforma
- Comparativas semanales
- Integración con assets (logos de apps)
- Estadísticas de uso

#### Books Tracking (`/tracking/books`)
- Biblioteca completa
- Estado: leyendo, completado, pendiente
- Portadas desde assets
- Estadísticas de lectura: páginas/día
- Rating personal

#### TV Tracking (`/tracking/tv`)
- Biblioteca de series/películas
- Estado de progreso por temporada
- Posters desde assets
- Rating personal
- Fechas de visualización

#### Gaming Tracking (`/tracking/gaming`)
- Biblioteca de juegos
- Tiempo total por juego
- Portadas desde assets
- Estadísticas de sesiones
- Rating personal

### 4. Calendario de Actividades

Vista mensual con todas las actividades registradas.

**Características**:
- Vista mensual navegable
- Indicadores visuales por tipo de actividad
- Colores diferentes por categoría
- Click en día para ver detalles
- Navegación entre meses
- Marcadores de días con actividad

### 5. Sistema de Datos Persistentes

**Context Global: `AppDataProvider`**

El corazón del sistema de datos que gestiona todo el estado de la aplicación.

**Funciones principales**:
\`\`\`typescript
- addAsset(asset): Agregar nuevo asset
- updateAsset(id, updates): Actualizar asset existente
- deleteAsset(id): Eliminar asset (con cascada)
- getAssetById(id): Obtener asset específico
- addActivityLog(log): Agregar registro de actividad
- updateActivityLog(id, updates): Actualizar registro
- deleteActivityLog(id): Eliminar registro
- getActivityLogsByType(type): Filtrar por tipo
- getActivityLogsByDate(date): Filtrar por fecha
\`\`\`

**Tipos de Datos**:

\`\`\`typescript
// Asset
{
  id: string
  name: string
  category: 'games' | 'books' | 'tv' | 'apps' | 'other'
  type: string (image/png, etc.)
  size: number
  data: string (Base64)
  createdAt: Date
  updatedAt: Date
}

// ActivityLog
{
  id: string
  type: 'exercise' | 'diet' | 'weight' | 'task' | 'media' | 'book' | 'gaming' | 'tv'
  date: Date
  data: any (específico por tipo)
  assetId?: string (referencia opcional)
  createdAt: Date
  updatedAt: Date
}
\`\`\`

**Persistencia**:
- Auto-save en LocalStorage cada cambio
- Hidratación al cargar la app
- Sincronización en tiempo real entre componentes
- Sistema de backup automático (próximo)

---

## Diseño Visual

### Paleta de Colores (Dark Mode)

**Tema Oscuro** (por defecto)
\`\`\`css
--background: 220 30% 8%        /* #0F1419 - Negro azulado */
--foreground: 210 40% 98%       /* Blanco suave */
--card: 220 25% 12%             /* Gris muy oscuro */
--card-foreground: 210 40% 98%
--primary: 217 91% 60%          /* Azul brillante #3B82F6 */
--primary-foreground: 222 47% 11%
--secondary: 217 33% 17%        /* Azul oscuro */
--muted: 215 20% 20%            /* Gris medio */
--accent: 217 91% 60%           /* Azul acento */
--destructive: 0 84% 60%        /* Rojo */
--border: 217 20% 20%           /* Bordes sutiles */
--radius: 0.5rem                /* Bordes redondeados */
\`\`\`

**Tema Claro** (disponible, no predeterminado)
\`\`\`css
--background: 0 0% 100%         /* Blanco */
--foreground: 222 47% 11%       /* Negro azulado */
--card: 0 0% 100%
--primary: 221 83% 53%          /* Azul */
/* ... resto de colores claros */
\`\`\`

### Tipografía

**Fuente Principal**: Space Grotesk (headings)
- Moderna, legible, profesional
- Pesos: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Fuente Secundaria**: DM Sans (body)
- Optimizada para lectura
- Excelente legibilidad en pantallas

**Escala Tipográfica**:
- H1: 2.25rem (36px) - Títulos principales
- H2: 1.875rem (30px) - Títulos de sección
- H3: 1.5rem (24px) - Subtítulos
- Body: 1rem (16px) - Texto normal
- Small: 0.875rem (14px) - Texto secundario

### Principios de Diseño

1. **Dark First**: Diseño oscuro por defecto para uso prolongado
2. **Entrada Rápida**: Cada widget permite entrada sin cambiar de vista
3. **Glanceability**: Ver información importante de un vistazo
4. **Consistencia**: Mismos patrones en toda la aplicación
5. **Responsive**: Adaptable a diferentes tamaños de ventana
6. **Accesibilidad**: Contraste WCAG AA, navegación por teclado

---

## Roadmap de Características Futuras

### Fase 1: Trackers Adicionales (Próximas 2-4 semanas)

#### Mood Tracker
**Descripción**: Sistema para registrar y analizar estados de ánimo a lo largo del tiempo.

**Características**:
- Escala 1-10 para calificar el ánimo
- Múltiples entradas por día
- Cálculo de promedio, mínimo y máximo por día
- Gráfico de línea temporal
- Notas opcionales por entrada
- Correlación con otras actividades
- Vista de calendario con colores según ánimo

**Casos de uso**:
- Identificar patrones de ánimo
- Detectar triggers (alcohol → bajo ánimo)
- Seguimiento de salud mental

#### Social Tracker
**Descripción**: Seguimiento de interacciones sociales diarias.

**Características**:
- Registro de personas con las que interactuó
- Método de contacto (llamada, texto, persona, video)
- Duración de interacción
- Calidad de la interacción (1-10)
- Estadísticas de frecuencia por persona
- Alertas de "hace tiempo sin contactar"
- Gráfico de red social

**Casos de uso**:
- Mantener relaciones activas
- Identificar aislamiento social
- Correlación: ánimo alto después de socializar

#### Custom Tracker System
**Descripción**: Sistema para crear trackers personalizados sin programación.

**Características**:
- Interfaz de creación de tracker
- Tipos de datos disponibles:
  - Contador simple (ej: vasos de agua)
  - Checkbox (ej: hice la cama)
  - Número (ej: minutos de meditación)
  - Escala 1-10 (ej: energía del día)
  - Texto corto (ej: clima del día)
  - Selector (ej: tipo de desayuno)
- Widget automático en dashboard
- Vista de seguimiento generada automáticamente
- Gráficos según tipo de dato
- Exportación de datos

**Ejemplos de trackers personalizados**:
- Limpieza de habitación (checkbox diario)
- Vasos de agua (contador)
- Horas de sueño (número)
- Nivel de estrés (escala 1-10)
- Clima (selector: soleado, nublado, lluvioso)
- Medicamentos tomados (checkbox)

### Fase 2: Análisis y Correlaciones (4-6 semanas)

#### Correlations Page
**Descripción**: Página dedicada a encontrar patrones y correlaciones entre diferentes actividades.

**Características detectables**:
- Ánimo bajo después de consumir alcohol
- Ánimo alto después de socializar
- Mejor sueño después de hacer ejercicio
- Más productivo (tareas) después de leer
- Peso más bajo en días con más ejercicio
- Más tiempo en redes sociales en días de bajo ánimo

**Visualización**:
- Gráficos de dispersión (scatter plots)
- Líneas de tendencia
- Porcentaje de correlación
- Ejemplos específicos de días
- Sugerencias automáticas basadas en datos

**Análisis automático**:
- Escaneo semanal de datos
- Notificaciones de correlaciones encontradas
- Insights personalizados

#### Statistics Dashboard
**Descripción**: Vista centralizada de todas las estadísticas importantes.

**Métricas incluidas**:
- Última vez que [acción]: bebí alcohol, comí pizza, fui al gym, etc.
- Totales históricos: días trabajados, libros leídos, juegos completados
- Promedios: peso promedio, horas de ejercicio/semana
- Rachas: días consecutivos de ejercicio, sin alcohol, etc.
- Comparativas: esta semana vs semana pasada
- Records personales: peso más bajo, más ejercicio en un día

**Tarjetas de estadísticas**:
- "Hace X días desde última vez que..."
- "Has [acción] X veces en total"
- "Racha actual: X días de [actividad]"
- "Record: X [métrica] el [fecha]"

### Fase 3: Mejoras de Sistema (6-8 semanas)

#### Migración a SQL Database
**Por qué**:
- LocalStorage tiene límite de 10MB
- SQL permite consultas más complejas
- Mejor rendimiento con muchos datos
- Relaciones entre tablas más eficientes

**Base de datos propuesta**: SQL Server LocalDB
- Se ejecuta localmente (sin servidor)
- Incluido con Windows
- Multiplataforma con alternativas (SQLite)
- Backups automáticos

**Estructura de tablas**:
\`\`\`sql
- assets (id, name, category, data, created_at, updated_at)
- activity_logs (id, type, date, data_json, asset_id, created_at)
- custom_trackers (id, name, data_type, config_json)
- mood_logs (id, date, value, notes, created_at)
- social_logs (id, date, person, method, duration, quality)
- settings (key, value)
\`\`\`

#### Sistema de Backup y Exportación
**Características**:
- Backup automático diario
- Ubicación de backups configurable
- Exportación manual a JSON/CSV
- Importación de datos
- Restauración desde backup
- Sincronización a la nube (opcional)

#### Notificaciones de Escritorio
**Usando Electron Notifications**:
- Recordatorios: "No has registrado tu peso hoy"
- Rachas: "¡5 días consecutivos de ejercicio!"
- Correlaciones: "Descubrimos un patrón en tus datos"
- Logros: "¡Completaste 10 libros este año!"

#### Goals & Achievements System
**Características**:
- Definir objetivos personalizados
- Seguimiento de progreso
- Sistema de logros (achievements)
- Notificaciones al completar
- Historial de objetivos alcanzados

### Fase 4: Avanzado (8-12 semanas)

#### Interfaz de Configuración Avanzada
- Personalización de widgets (orden, tamaño, color)
- Configuración de objetivos por categoría
- Preferencias de notificaciones
- Temas personalizados
- Shortcuts de teclado

#### Sistema de Tags y Categorías
- Tags personalizados para actividades
- Filtrado por tags
- Agrupación automática
- Búsqueda avanzada

#### Modo Mobile (Electron → Expo)
- Misma base de código
- Adaptación de UI para móvil
- Sincronización entre dispositivos
- Entrada rápida desde teléfono

---

## Guía de Uso

### Primer Uso

1. **Abrir la aplicación**: Doble click en HabitFlow.exe
2. **Dashboard vacío**: En el primer uso, todos los widgets estarán vacíos
3. **Agregar datos**: Click en cualquier widget para entrada rápida
4. **Subir assets**: Ir a Assets → Arrastrar imágenes

### Flujo Diario Típico

**Mañana**:
1. Abrir HabitFlow
2. Registrar peso del día (Weight Widget)
3. Ver tareas del día (Tasks Widget)
4. Planificar actividades

**Durante el día**:
1. Completar tareas (click en checkbox)
2. Registrar comidas (Diet Widget)
3. Registrar ejercicio (Exercise Widget)

**Noche**:
1. Registrar tiempo en redes sociales (Media Widget)
2. Actualizar serie vista (TV Widget)
3. Registrar páginas leídas (Books Widget)
4. Ver resumen del día

### Entrada Rápida vs Vista Detallada

**Entrada Rápida** (desde Dashboard):
- Para datos simples y frecuentes
- Sin salir del dashboard
- Ideal para flujo rápido

**Vista Detallada** (desde Tracking):
- Para entrada compleja
- Con más campos y opciones
- Ver historial completo
- Análisis de datos

### Gestión de Assets

**Subir imágenes**:
1. Ir a Assets (sidebar)
2. Arrastrar imagen O Click "Upload" O Ctrl+V
3. Revisar en staging
4. Confirmar o cancelar

**Usar assets en trackers**:
- Al agregar juego/libro/serie
- Selector de assets en formulario
- Preview de imagen seleccionada

### Navegación

**Sidebar**:
- Dashboard: Pantalla principal
- Calendar: Vista mensual
- Assets: Gestión de imágenes
- Tracking: Menú desplegable con 8 vistas
- Settings: Configuración (próximo)

**Shortcuts** (próximo):
- Ctrl+D: Dashboard
- Ctrl+C: Calendar
- Ctrl+A: Assets
- Ctrl+1-8: Tracking views

---

## Problemas Conocidos y Soluciones

### Límite de LocalStorage
**Problema**: LocalStorage tiene límite de ~10MB
**Impacto**: Con muchos assets, puede llenarse
**Solución temporal**: Comprimir imágenes antes de subir
**Solución permanente**: Migración a SQL (Fase 3)

### Rendimiento con Muchos Datos
**Problema**: Con 1000+ registros, el dashboard puede tardar
**Solución actual**: Limitar a últimos 30 días en widgets
**Solución futura**: Paginación y lazy loading

### Sin Sincronización entre Dispositivos
**Estado**: No implementado aún
**Próximo**: Fase 4 con modo mobile
**Alternativa actual**: Backups manuales

---

## Instalación y Configuración

### Requisitos del Sistema

**Mínimos**:
- Windows 10/11, macOS 10.13+, Linux (Ubuntu 18.04+)
- 4GB RAM
- 500MB espacio en disco
- Resolución mínima: 1280x720

**Recomendados**:
- 8GB RAM
- 1GB espacio en disco (para datos)
- Resolución: 1920x1080 o superior

### Instalación

**Desarrollo** (actual):
\`\`\`bash
# Clonar repositorio
git clone [repository-url]

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
\`\`\`

**Producción** (próximo):
1. Descargar HabitFlow-Setup.exe
2. Ejecutar instalador
3. Seguir wizard de instalación
4. Abrir HabitFlow desde escritorio

### Configuración Inicial

1. **Primer inicio**: Wizard de bienvenida (próximo)
2. **Objetivos**: Definir objetivos iniciales por categoría
3. **Assets**: Subir primeras imágenes
4. **Personalización**: Elegir tema (dark/light)

---

## Próximos Pasos Inmediatos

### Para el Cliente (chamero)

1. **Revisar documento**: Confirmar que todo refleja la visión
2. **Priorizar features**: De las fases 1-4, ¿cuáles son más importantes?
3. **Feedback del diseño**: ¿El dark mode actual está bien?
4. **Llamada de planificación**: Organizar ideas y crear plan detallado

### Para Desarrollo (DaniPP)

1. **Finalizar documentación**: Agregar screenshots de cada vista
2. **Mood Tracker**: Implementar (Fase 1, prioridad alta)
3. **Social Tracker**: Implementar (Fase 1, prioridad alta)
4. **Custom Tracker System**: Diseñar arquitectura
5. **Testing**: Probar todos los widgets con datos reales
6. **Bug fixes**: Resolver cualquier problema encontrado

---

## Presupuesto y Timeline

### Pagos Realizados
- **Pago inicial**: $14 USD (3 de diciembre, 2025)
- **Pendiente de liberar**: ~$15 USD (hold de la plataforma)

### Presupuesto Acordado
- **Frontend base + funcionalidad básica**: $100-200 USD
- **Desktop + Mobile**: $200-300 USD
- **Adiciones y personalizaciones**: Por definir según scope

### Timeline Estimado

**Semana 1-2** (actual):
- ✅ Diseño y estructura del frontend
- ✅ Implementación de 8 widgets
- ✅ Sistema de assets
- ✅ Vistas de tracking
- ✅ Documentación

**Semana 3-4**:
- Mood Tracker completo
- Social Tracker completo
- Custom Tracker v1
- Testing exhaustivo

**Semana 5-6**:
- Correlations Page v1
- Statistics Dashboard
- Bug fixes y optimizaciones

**Semana 7-8**:
- Migración a SQL
- Sistema de backup
- Notificaciones de escritorio

**Mes 3+**:
- Features avanzadas según prioridad del cliente
- Modo mobile (si deseado)
- Polish y mejoras UX

---

## Contacto y Soporte

**Desarrollador**: DaniPP (Danilo López)
- Discord: DaniPP
- Portfolio: https://dani.a1devhub.tech/
- GitHub: https://github.com/PapLion

**Cliente**: chamero
- Discord: chamero._. 
- Timezone: EST (New York)

**Método de pago**: Binance (USDT via APT network)

**Horario de trabajo**: 
- Desarrollo: Diario (excepto 3h de universidad)
- Reportes: Diarios al final del día (GMT-5)
- Disponibilidad: Casi todo el día para mensajes
- Llamadas: Con aviso previo para organizar horario

---

## Conclusión

HabitFlow está en excelente camino para convertirse en la aplicación de tracking personal más completa y personalizable. El frontend está sólido, el sistema de datos es robusto y la arquitectura permite agregar features fácilmente.

**Lo que hace especial a HabitFlow**:
1. **Verdaderamente personalizable**: Custom trackers para cualquier cosa
2. **Análisis inteligente**: Correlaciones automáticas entre datos
3. **Entrada rápida**: Diseñado para uso diario sin fricción
4. **Visualmente atractivo**: Dark mode profesional
5. **Local-first**: Tus datos en tu computadora, sin servidores

El proyecto tiene bases sólidas y un roadmap claro. Con las fases planificadas, HabitFlow evolucionará de un tracker simple a un sistema completo de análisis de vida personal.

---

**Documento generado**: 5 de diciembre, 2025  
**Versión del documento**: 1.0  
**Versión de HabitFlow**: 6.0  
**Próxima actualización**: Después de llamada de planificación con cliente

---

## Apéndice A: Glosario Técnico

- **Widget**: Componente visual en el dashboard que muestra datos específicos
- **Asset**: Imagen o recurso visual subido por el usuario
- **Activity Log**: Registro individual de una actividad (ejercicio, comida, etc.)
- **Tracking View**: Vista detallada con historial completo de una categoría
- **Staging**: Estado temporal antes de confirmar una acción
- **LocalStorage**: Almacenamiento del navegador, limitado a ~10MB
- **Context API**: Sistema de React para compartir estado entre componentes
- **Electron**: Framework para crear aplicaciones desktop con tecnologías web

## Apéndice B: Estructura de Datos

### Asset Object
\`\`\`typescript
{
  id: "uuid-v4",
  name: "Portada de Atomic Habits",
  category: "books",
  type: "image/png",
  size: 245678,
  data: "data:image/png;base64,iVBORw0KGg...",
  createdAt: "2025-12-05T10:30:00Z",
  updatedAt: "2025-12-05T10:30:00Z"
}
\`\`\`

### Activity Log Object (Exercise Example)
\`\`\`typescript
{
  id: "uuid-v4",
  type: "exercise",
  date: "2025-12-05",
  data: {
    exerciseType: "Running",
    duration: 45, // minutos
    intensity: "moderate",
    caloriesBurned: 450
  },
  assetId: null,
  createdAt: "2025-12-05T18:30:00Z",
  updatedAt: "2025-12-05T18:30:00Z"
}
\`\`\`

### Activity Log Object (Book Example)
\`\`\`typescript
{
  id: "uuid-v4",
  type: "book",
  date: "2025-12-05",
  data: {
    title: "Atomic Habits",
    author: "James Clear",
    pagesRead: 25,
    timeSpent: 30, // minutos
    currentPage: 125,
    totalPages: 320,
    status: "reading"
  },
  assetId: "asset-uuid-for-cover",
  createdAt: "2025-12-05T22:00:00Z",
  updatedAt: "2025-12-05T22:00:00Z"
}
\`\`\`

## Apéndice C: Referencias y Recursos

### Librerías Utilizadas
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
- Tailwind CSS: https://tailwindcss.com/
- shadcn/ui: https://ui.shadcn.com/
- Recharts: https://recharts.org/
- Electron: https://www.electronjs.org/

### Inspiración de Diseño
- Notion: Sistema de bloques modulares
- Obsidian: Local-first approach
- Habitica: Gamificación de hábitos
- Exist.io: Correlaciones de datos

---

**Fin del documento**
