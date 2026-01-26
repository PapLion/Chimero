# DOcumentacion de arquitectura

He analizado la documentación completa de Habit Flow (mencionado internamente como Chimero). Entiendo perfectamente la estructura y la magnitud del proyecto. Es una aplicación ambiciosa de "Quantified Self" (autocuantificación) que combina gestión de tareas, seguimiento de hábitos y análisis de datos, todo envuelto en una aplicación de escritorio vía Electron.

Aquí tienes el Mapa Mental de Arquitectura que he construido basándome en tus archivos (APP.md y DOCUMENTATION.md). Esto confirma que tengo el contexto cargado para que podamos trabajar:

1. El Núcleo (Frontend & Routing - /app)
Tecnología: Next.js (App Router).

Dashboard (page.tsx): No es un dashboard estático. Es un sistema tipo "inventario de Resident Evil" (grid interactivo) usando @dnd-kit, donde los widgets (Trackers) se arrastran y organizan.

Módulos Principales:

Assets: Gestor de archivos multimedia local.

Calendar: Vista mensual con filtrado por categorías (colores específicos).

Statistics: El motor de análisis. Punto clave: Todo el cálculo (correlaciones, rachas, desviación estándar) es local, no usa APIs externas.

Tracking: Páginas dedicadas para cada vertical (Libros, Dieta, Gym, Gaming, Humor, Social, etc.).

2. El "Cerebro" Lógico (/lib y /types)
stats-service.ts: Es crucial. Aquí vive la lógica matemática (Pearson correlation, rachas). Simula una base de datos para cálculos.

grid-utils.ts: Gestiona la lógica espacial de los widgets (colisiones, compactación, búsqueda de espacio libre).

Tipado (/types): Veo que el proyecto es estrictamente tipado (TypeScript). Tienes interfaces separadas para la DB (DBItem, DBDietEntry) y para la UI/Widgets. Esto es vital para mantener el orden en un proyecto tan grande.

3. Gestión de Estado y Persistencia (/contexts)
AppDataContext: Actúa como tu "Backend" en el cliente.

Centraliza el CRUD (Create, Read, Update, Delete).

Maneja la persistencia en localStorage.

Sincroniza el estado de todos los trackers y configuraciones de diseño.

4. La Capa de Escritorio (/electron)
Convierte la web app en nativa.

preload.js: El puente seguro (contextBridge) para que el frontend hable con el sistema operativo (notificaciones, sistema de archivos en el futuro).

5. UI Kit (/components)
Usas Shadcn UI como base (en /ui), pero tienes una capa fuerte de componentes de negocio (/components) como InventoryGrid, TrackerWidget y los diálogos de creación.

Observación: Entiendo por qué dices que es "molesto" o pesado. La complejidad radica en que estás construyendo tres cosas a la vez:

Un sistema de gestión de contenidos (Assets/DB).

Un motor de análisis de datos (Statistics).

Un gestor de ventanas/grid altamente interactivo (Dashboard).

Estoy listo con este contexto. ¿Por qué parte quieres empezar la explicación paso a paso? (Puede ser un módulo específico que te esté dando problemas o una nueva funcionalidad que quieras añadir).

## Carpeta app (ARchivo aparte para explicarlo)

## Carpeta Types
El código dentro de la carpeta `types` define una serie de interfaces y tipos de TypeScript que son fundamentales para el proyecto Chimero. A continuación, se detalla su función:

### `types/database.ts`
Este archivo define los tipos relacionados con la base de datos y la estructura de los datos que se manejan en el proyecto. Incluye:

1. **Tipos de elementos principales**:
   - `DBItem`: Representa un elemento genérico con propiedades como `id`, `name`, `category`, y fechas de creación y actualización.
   - `ItemCategory`: Define las categorías posibles para los elementos, como comida, ejercicio, personas, medios, actividades y ubicaciones.
   - `DBTag`: Representa una etiqueta que puede asociarse a los elementos, con propiedades como `id`, `name`, `color`, y fechas de creación.
   - `DBItemTag`: Define la relación entre elementos y etiquetas mediante `item_id` y `tag_id`.

2. **Tipos de entradas específicas**:
   - **Dieta**: `DBDietEntry` y `DBDietEntryItem` para manejar entradas de dieta, incluyendo información sobre comidas, cantidades, unidades y valores nutricionales.
   - **Estado de ánimo**: `DBMoodEntry` y `DBMoodFactor` para registrar el estado de ánimo, niveles de energía, ansiedad y factores asociados.
   - **Social**: `DBPerson` y `DBSocialEntry` para gestionar interacciones sociales, incluyendo métodos de contacto y calidad de las interacciones.
   - **Ejercicio**: `DBExerciseEntry` y `DBExerciseSet` para registrar actividades físicas, duración, calorías quemadas y series de ejercicios.
   - **Medios**: `DBMediaEntry` para registrar el consumo de medios como juegos, películas, música, podcasts y libros.

3. **Tipos de estadísticas y análisis**:
   - `ItemStats`: Proporciona estadísticas sobre el uso de elementos, como conteo total, fechas de uso y etiquetas asociadas.
   - `CorrelationResult`: Define resultados de correlaciones entre factores, útil para análisis de datos.
   - `TrackerStats`: Ofrece estadísticas sobre el seguimiento de actividades, como tendencias, rachas y desviaciones estándar.

4. **Tipos de sugerencias de entrada rápida**:
   - `QuickEntrySuggestion`: Proporciona sugerencias para entradas rápidas basadas en elementos recientes, frecuentes o favoritos.

### `types/index.ts`
Este archivo define tipos relacionados con la interfaz de usuario y la funcionalidad del dashboard. Incluye:

1. **Tipos de widgets**:
   - `WidgetProps`: Propiedades base para los widgets.
   - Tipos específicos para widgets como `ExerciseData`, `DietData`, `WeightData`, `TasksData`, `MediaData`, `BooksData`, `GamingData`, `TVData`, `MoodData` y `SocialData`. Cada uno de estos tipos define la estructura de datos necesaria para renderizar información específica en los widgets del dashboard.

2. **Tipos de activos**:
   - `AssetCategory` y `AssetType`: Definen categorías y tipos de activos como imágenes, SVG, JPG, PNG, entre otros.
   - `Asset`: Representa un activo con propiedades como `id`, `name`, `category`, `url`, `type`, `size`, y fechas de subida y actualización.

3. **Tipos comunes y compartidos**:
   - `ProgressMetric`: Define métricas de progreso con valores actuales, objetivos, porcentajes y unidades.
   - `TrendData`: Proporciona información sobre tendencias, incluyendo valores, direcciones y cambios porcentuales.
   - `TimeRange`: Define rangos de tiempo con fechas de inicio y fin, y una etiqueta descriptiva.

4. **Tipos de actividad del usuario**:
   - `ActivityLog`: Registra actividades del usuario con detalles como tipo de actividad, marca de tiempo, datos específicos y notas.
   - `DailyStats`: Proporciona estadísticas diarias sobre actividades registradas, tiempo total rastreado y metas completadas.

5. **Tipos de calendario**:
   - `CalendarEvent`: Define eventos en el calendario con propiedades como `id`, `date`, `activityType`, `title`, `completed` y datos asociados.

6. **Tipos de seguimiento personalizado**:
   - `CustomTrackerFieldType`: Define tipos de campos para seguimientos personalizados, como números, escalas, casillas de verificación, texto, tiempo, contadores, calificaciones y selecciones.
   - `CustomTrackerFieldConfig`: Configura campos personalizados con propiedades como `id`, `label`, `type`, `required`, `min`, `max`, `step`, `options`, `timeUnit`, `defaultValue` y `helpText`.
   - `CustomTrackerConfig`: Configura un seguimiento personalizado con propiedades como `id`, `name`, `description`, `icon`, `color`, `fields`, `showOnDashboard`, `widgetSize`, `hasGoal`, `goalField`, `goalValue`, `goalType`, `chartType`, `createdAt` y `updatedAt`.
   - `CustomTrackerEntry`: Representa una entrada en un seguimiento personalizado con propiedades como `id`, `trackerId`, `timestamp`, `data` y `notes`.

7. **Tipos de diseño del dashboard**:
   - `WidgetId`: Identifica widgets mediante IDs específicos o personalizados.
   - `WidgetGridSize` y `WidgetPosition`: Definen el tamaño y la posición de los widgets en el dashboard.
   - `DashboardWidget`: Representa un widget en el dashboard con propiedades como `id`, `type`, `size`, `position` y `visible`.
   - `DashboardLayout`: Define el diseño del dashboard con una lista de widgets, columnas de la cuadrícula y fecha de actualización.
   - `TrackingPageSection` y `TrackingPageLayout`: Definen secciones y diseños para páginas de seguimiento.

En resumen, los archivos en la carpeta `types` proporcionan una estructura de datos robusta y bien definida que soporta tanto la lógica de la base de datos como la interfaz de usuario del proyecto Chimero. Estos tipos son esenciales para garantizar la consistencia y el manejo adecuado de los datos en toda la aplicación.

## Carpeta lib

La carpeta `lib` contiene utilidades y servicios esenciales para el funcionamiento del proyecto Chimero. A continuación, se detalla la función de cada archivo:

### `lib/asset-utils.ts`
Este archivo proporciona utilidades para la gestión de activos (assets) como imágenes y otros archivos multimedia. Incluye funciones para:

1. **Conversión de archivos a Base64**: La función [`fileToBase64()`](lib/asset-utils.ts:6) convierte un objeto `File` a una cadena Base64, útil para almacenar o transmitir archivos en formato de texto.

2. **Descarga de archivos desde Base64**: La función [`downloadBase64File()`](lib/asset-utils.ts:18) permite descargar un archivo desde una cadena Base64, extrayendo el tipo MIME y los datos para crear un blob y generar un enlace de descarga.

3. **Obtención de extensiones de archivo**: La función [`getFileExtension()`](lib/asset-utils.ts:64) determina la extensión de un archivo a partir de su nombre o tipo MIME, útil para validar y manejar diferentes formatos de archivo.

4. **Validación de URLs de imágenes**: La función [`isValidImageUrl()`](lib/asset-utils.ts:87) verifica si una cadena es una URL de imagen válida o una cadena Base64 de imagen.

### `lib/grid-utils.ts`
Este archivo contiene utilidades para gestionar la cuadrícula de widgets en el dashboard, similar al estilo de inventario de Resident Evil. Incluye:

1. **Configuración de la cuadrícula**: Define constantes como [`GRID_COLS`](lib/grid-utils.ts:4), [`GRID_ROWS`](lib/grid-utils.ts:5), [`CELL_SIZE`](lib/grid-utils.ts:6) y [`GRID_GAP`](lib/grid-utils.ts:7) para configurar el diseño de la cuadrícula.

2. **Validación de posiciones**: La función [`isValidPosition()`](lib/grid-utils.ts:10) verifica si una posición en la cuadrícula es válida para un widget de cierto tamaño, evitando colisiones con otros widgets y respetando los límites de la cuadrícula.

3. **Búsqueda de posiciones disponibles**: La función [`findAvailablePosition()`](lib/grid-utils.ts:47) encuentra la primera posición disponible en la cuadrícula para colocar un widget de un tamaño específico.

4. **Compactación de widgets**: La función [`compactWidgets()`](lib/grid-utils.ts:64) reorganiza los widgets en la cuadrícula para eliminar espacios vacíos y optimizar el uso del espacio.

5. **Manejo de arrastrar y soltar**: La función [`handleGridDragEnd()`](lib/grid-utils.ts:90) gestiona el evento de arrastrar y soltar widgets en la cuadrícula, actualizando sus posiciones y compactando la cuadrícula si es necesario.

### `lib/stats-service.ts`
Este archivo implementa un motor de análisis local para generar estadísticas y correlaciones sin depender de APIs externas. Incluye:

1. **Almacén de datos simulado**: Define un [`DataStore`](lib/stats-service.ts:25) y un [`mockDataStore`](lib/stats-service.ts:38) que simula una base de datos con datos de ejemplo para pruebas y desarrollo.

2. **Generación de datos simulados**: La función [`generateMockEntries()`](lib/stats-service.ts:78) genera entradas simuladas para diferentes tipos de seguimiento, como estado de ánimo, dieta, ejercicio y social.

3. **Cálculo de estadísticas**:
   - [`calculateStdDeviation()`](lib/stats-service.ts:149): Calcula la desviación estándar de un conjunto de valores.
   - [`calculateCorrelation()`](lib/stats-service.ts:160): Calcula el coeficiente de correlación de Pearson entre dos conjuntos de datos.
   - [`calculateStreak()`](lib/stats-service.ts:180): Determina la racha actual y máxima de días consecutivos con entradas.
   - [`calculateTrend()`](lib/stats-service.ts:232): Analiza la tendencia de un conjunto de valores a lo largo del tiempo.

4. **Clase `StatsService`**: Proporciona métodos para:
   - Obtener la última vez que se usó un elemento específico ([`getLastTimeItemUsed()`](lib/stats-service.ts:261)).
   - Contar el uso total de un elemento en un rango de tiempo ([`getTotalItemCount()`](lib/stats-service.ts:312)).
   - Buscar elementos con estadísticas de uso ([`searchItems()`](lib/stats-service.ts:362)).
   - Obtener estadísticas para un tipo de seguimiento específico ([`getTrackerStats()`](lib/stats-service.ts:393)).
   - Calcular correlaciones entre el estado de ánimo y otros factores ([`getCorrelations()`](lib/stats-service.ts:443)).

### `lib/utils.ts`
Este archivo proporciona utilidades comunes para el proyecto, como:

1. **Combinación de clases CSS**: La función [`cn()`](lib/utils.ts:4) utiliza `clsx` y `tailwind-merge` para combinar clases CSS de manera eficiente, evitando conflictos y optimizando el uso de Tailwind CSS.

En resumen, la carpeta `lib` contiene herramientas esenciales para la gestión de activos, la manipulación de la interfaz de usuario, el análisis de datos y la utilidad general del proyecto. Estos archivos son fundamentales para el funcionamiento eficiente y la experiencia del usuario en Chimero.

## Carpeta electron

La carpeta `electron` contiene los archivos necesarios para configurar y ejecutar la aplicación Chimero como una aplicación de escritorio utilizando Electron. A continuación, se detalla la función de cada archivo:

### `electron/main.js`
Este archivo es el punto de entrada principal de la aplicación Electron. Se encarga de configurar y gestionar la ventana principal de la aplicación, así como de manejar eventos del ciclo de vida de la aplicación. Las funciones clave incluyen:

1. **Configuración de la ventana principal**:
   - Crea una ventana de Electron con propiedades específicas como tamaño, posición, icono y estilo de la barra de título ([`createWindow()`](electron/main.js:11)).
   - Configura preferencias web como el preload script, la integración de Node.js y el aislamiento de contexto para mayor seguridad.

2. **Carga de la aplicación**:
   - En modo de desarrollo, carga la aplicación desde `http://localhost:3000` y abre las herramientas de desarrollo ([`mainWindow.loadURL()`](electron/main.js:35)).
   - En modo de producción, inicia el servidor Next.js y carga la aplicación desde el servidor local ([`startNextServer()`](electron/main.js:56)).

3. **Manejo de enlaces externos**:
   - Configura un manejador para abrir enlaces externos en el navegador del sistema en lugar de dentro de la aplicación ([`mainWindow.webContents.setWindowOpenHandler()`](electron/main.js:46)).

4. **Menú personalizado**:
   - Crea un menú personalizado para la aplicación con opciones como "About", "Preferences", "Quit", y otras opciones estándar de edición y vista ([`createMenu()`](electron/main.js:86)).

5. **Ciclo de vida de la aplicación**:
   - Maneja eventos como `ready`, `activate`, `window-all-closed` y `before-quit` para gestionar el ciclo de vida de la aplicación y asegurar que los recursos se liberen correctamente.

### `electron/preload.js`
Este archivo actúa como un puente entre el proceso principal de Electron y el proceso de renderizado (la interfaz de usuario). Su función principal es exponer APIs seguras al proceso de renderizado mediante el uso de `contextBridge`. Las funciones clave incluyen:

1. **Exposición de APIs seguras**:
   - Expone un objeto `electronAPI` al proceso de renderizado, que contiene métodos y propiedades seguras para interactuar con el sistema operativo y la aplicación Electron ([`contextBridge.exposeInMainWorld()`](electron/preload.js:4)).

2. **Información de la plataforma**:
   - Proporciona información sobre la plataforma en la que se está ejecutando la aplicación ([`platform`](electron/preload.js:6)).

3. **Control de la ventana**:
   - Expone métodos para minimizar, maximizar y cerrar la ventana de la aplicación ([`minimize`](electron/preload.js:12), [`maximize`](electron/preload.js:13), [`close`](electron/preload.js:14)).

4. **Operaciones del sistema de archivos**:
   - Proporciona métodos para guardar y cargar datos, aunque actualmente están configurados para ser implementados en el futuro ([`saveData`](electron/preload.js:17), [`loadData`](electron/preload.js:18)).

5. **Notificaciones**:
   - Expone un método para mostrar notificaciones al usuario ([`showNotification`](electron/preload.js:21)).

6. **Manejo de errores**:
   - Configura un escucha de eventos para manejar errores en el proceso de renderizado y registrarlos en la consola ([`window.addEventListener()`](electron/preload.js:25)).

En resumen, la carpeta `electron` es fundamental para transformar la aplicación web de Chimero en una aplicación de escritorio multiplataforma. `main.js` gestiona la ventana principal y el ciclo de vida de la aplicación, mientras que `preload.js` proporciona un puente seguro para que la interfaz de usuario interactúe con las capacidades nativas de Electron.

## Carpeta context

La carpeta `contexts` contiene archivos relacionados con la gestión del estado global de la aplicación utilizando el contexto de React. En este caso, el archivo `app-data-context.tsx` es fundamental para centralizar y compartir datos y funcionalidades entre los componentes de la aplicación. A continuación, se detalla su función:

### `contexts/app-data-context.tsx`
Este archivo define un contexto de React llamado `AppDataContext` que se utiliza para gestionar y compartir el estado global de la aplicación. Las funciones clave incluyen:

1. **Definición del contexto**:
   - Crea un contexto de React llamado `AppDataContext` utilizando `createContext` ([`AppDataContext`](contexts/app-data-context.tsx:53)).
   - Define una interfaz `AppDataContextType` que especifica los datos y funciones disponibles en el contexto ([`AppDataContextType`](contexts/app-data-context.tsx:25)).

2. **Proveedor del contexto**:
   - Implementa un componente `AppDataProvider` que actúa como proveedor del contexto ([`AppDataProvider`](contexts/app-data-context.tsx:81)).
   - Este componente utiliza el hook `useState` para gestionar el estado de los datos de la aplicación, como activos, registros de actividad, seguimientos personalizados, entradas de seguimiento, diseño del dashboard y diseños de páginas de seguimiento.

3. **Persistencia de datos**:
   - Utiliza el `localStorage` para guardar y cargar datos, asegurando que la información persista entre sesiones de la aplicación ([`useEffect`](contexts/app-data-context.tsx:90)).
   - Los datos se guardan y cargan automáticamente al inicializar la aplicación y al cambiar el estado de los datos.

4. **Funciones para gestionar datos**:
   - Proporciona funciones para agregar, actualizar y eliminar activos ([`addAsset`](contexts/app-data-context.tsx:155), [`updateAsset`](contexts/app-data-context.tsx:165), [`deleteAsset`](contexts/app-data-context.tsx:171)).
   - Incluye funciones para gestionar registros de actividad ([`addActivityLog`](contexts/app-data-context.tsx:234), [`updateActivityLog`](contexts/app-data-context.tsx:242), [`deleteActivityLog`](contexts/app-data-context.tsx:246)).
   - Ofrece funciones para gestionar seguimientos personalizados y sus entradas ([`addCustomTracker`](contexts/app-data-context.tsx:250), [`updateCustomTracker`](contexts/app-data-context.tsx:277), [`deleteCustomTracker`](contexts/app-data-context.tsx:312), [`addCustomTrackerEntry`](contexts/app-data-context.tsx:322), [`updateCustomTrackerEntry`](contexts/app-data-context.tsx:331), [`deleteCustomTrackerEntry`](contexts/app-data-context.tsx:335)).

5. **Gestión del diseño del dashboard**:
   - Proporciona funciones para actualizar la posición de los widgets, el diseño del dashboard y la visibilidad de los widgets ([`updateWidgetPosition`](contexts/app-data-context.tsx:343), [`updateDashboardLayout`](contexts/app-data-context.tsx:351), [`toggleWidgetVisibility`](contexts/app-data-context.tsx:359)).
   - Incluye funciones para verificar si un seguimiento es visible en el dashboard ([`isTrackerVisibleOnDashboard`](contexts/app-data-context.tsx:367)).

6. **Gestión de diseños de páginas de seguimiento**:
   - Proporciona funciones para actualizar y obtener diseños de páginas de seguimiento ([`updateTrackingPageLayout`](contexts/app-data-context.tsx:372), [`getTrackingPageLayout`](contexts/app-data-context.tsx:379)).

7. **Hook personalizado para acceder al contexto**:
   - Define un hook personalizado `useAppData` que facilita el acceso al contexto desde cualquier componente de la aplicación ([`useAppData`](contexts/app-data-context.tsx:418)).

En resumen, el archivo `app-data-context.tsx` es esencial para la gestión del estado global de la aplicación Chimero. Proporciona un contexto centralizado que permite a los componentes acceder y modificar datos de manera consistente y eficiente, asegurando que la información se mantenga sincronizada y persista entre sesiones.

## Carpeta componentes/ui 
La carpeta `components/ui` contiene una colección de componentes de interfaz de usuario reutilizables, diseñados para ser utilizados en la aplicación Chimero. Estos componentes están basados en la biblioteca de componentes de código abierto Shadcn UI, que proporciona una serie de componentes accesibles y personalizables para aplicaciones modernas. A continuación, se detalla la función de algunos de los archivos más importantes:

### `components/ui/accordion.tsx`
Este archivo define un componente de acordeón que permite mostrar y ocultar contenido de manera interactiva. Incluye subcomponentes como `AccordionItem`, `AccordionTrigger` y `AccordionContent` para gestionar la estructura y el comportamiento del acordeón.

### `components/ui/alert-dialog.tsx`
Proporciona un diálogo de alerta que se utiliza para confirmar acciones críticas o mostrar información importante. Incluye subcomponentes como `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction` y `AlertDialogCancel` para gestionar la estructura y el comportamiento del diálogo.

### `components/ui/alert.tsx`
Define un componente de alerta para mostrar mensajes de advertencia, error o éxito. Incluye subcomponentes como `AlertTitle` y `AlertDescription` para gestionar el contenido de la alerta.

### `components/ui/button.tsx`
Proporciona un componente de botón personalizable con diferentes variantes y tamaños. Utiliza la función `cn` para combinar clases CSS de manera eficiente.

### `components/ui/calendar.tsx`
Define un componente de calendario para seleccionar fechas. Utiliza la biblioteca `react-day-picker` para gestionar la funcionalidad del calendario y proporciona subcomponentes como `CalendarDayButton` para personalizar la apariencia de los días.

### `components/ui/card.tsx`
Proporciona un componente de tarjeta para mostrar contenido en un formato estructurado. Incluye subcomponentes como `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription` y `CardContent` para gestionar la estructura de la tarjeta.

### `components/ui/chart.tsx`
Define un componente de gráfico para visualizar datos. Utiliza la biblioteca `recharts` para gestionar la funcionalidad del gráfico y proporciona subcomponentes como `ChartTooltip`, `ChartTooltipContent`, `ChartLegend` y `ChartLegendContent` para personalizar la apariencia y el comportamiento del gráfico.

### `components/ui/checkbox.tsx`
Proporciona un componente de casilla de verificación para seleccionar opciones. Utiliza la biblioteca `radix-ui` para gestionar la funcionalidad de la casilla de verificación.

### `components/ui/dialog.tsx`
Define un componente de diálogo para mostrar contenido en una ventana emergente. Incluye subcomponentes como `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle` y `DialogDescription` para gestionar la estructura y el comportamiento del diálogo.

### `components/ui/dropdown-menu.tsx`
Proporciona un componente de menú desplegable para mostrar opciones en un menú contextual. Incluye subcomponentes como `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubTrigger` y `DropdownMenuSubContent` para gestionar la estructura y el comportamiento del menú.

### `components/ui/form.tsx`
Define un componente de formulario para gestionar la entrada de datos. Utiliza la biblioteca `react-hook-form` para gestionar la funcionalidad del formulario y proporciona subcomponentes como `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` y `FormField` para gestionar la estructura y el comportamiento del formulario.

### `components/ui/input.tsx`
Proporciona un componente de entrada de texto para capturar datos del usuario. Utiliza la función `cn` para combinar clases CSS de manera eficiente.

### `components/ui/popover.tsx`
Define un componente de popover para mostrar contenido en una ventana emergente. Incluye subcomponentes como `PopoverTrigger` y `PopoverContent` para gestionar la estructura y el comportamiento del popover.

### `components/ui/select.tsx`
Proporciona un componente de selección para elegir opciones de una lista. Incluye subcomponentes como `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton` y `SelectScrollDownButton` para gestionar la estructura y el comportamiento del selector.

### `components/ui/sheet.tsx`
Define un componente de hoja para mostrar contenido en una ventana emergente lateral. Incluye subcomponentes como `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle` y `SheetDescription` para gestionar la estructura y el comportamiento de la hoja.

### `components/ui/sidebar.tsx`
Proporciona un componente de barra lateral para mostrar contenido en una barra lateral. Incluye subcomponentes como `SidebarTrigger`, `SidebarRail`, `SidebarInset`, `SidebarInput`, `SidebarHeader`, `SidebarFooter`, `SidebarSeparator`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuLink`, `SidebarMenuLabel`, `SidebarMenuSeparator`, `SidebarMenuShortcut`, `SidebarMenuGroup`, `SidebarMenuSub`, `SidebarMenuSubTrigger`, `SidebarMenuSubContent`, `SidebarMenuIndicator` y `SidebarMenuViewport` para gestionar la estructura y el comportamiento de la barra lateral.

### `components/ui/table.tsx`
Define un componente de tabla para mostrar datos en formato tabular. Incluye subcomponentes como `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell` y `TableCaption` para gestionar la estructura y el comportamiento de la tabla.

### `components/ui/toast.tsx`
Proporciona un componente de toast para mostrar mensajes temporales. Incluye subcomponentes como `ToastProvider`, `ToastViewport`, `ToastTitle`, `ToastDescription`, `ToastClose` y `ToastAction` para gestionar la estructura y el comportamiento del toast.

### `components/ui/tooltip.tsx`
Define un componente de tooltip para mostrar información adicional al pasar el cursor sobre un elemento. Incluye subcomponentes como `TooltipProvider`, `TooltipTrigger` y `TooltipContent` para gestionar la estructura y el comportamiento del tooltip.

En resumen, la carpeta `components/ui` proporciona una amplia gama de componentes de interfaz de usuario reutilizables y personalizables que son esenciales para construir la interfaz de la aplicación Chimero. Estos componentes están diseñados para ser accesibles, modulares y fáciles de integrar en diferentes partes de la aplicación.

## Carpeta componentes 

La carpeta `components` contiene una colección de componentes de React que son específicos de la aplicación Chimero. A diferencia de los componentes genéricos en `components/ui`, estos componentes están diseñados para funciones específicas dentro de la aplicación. A continuación, se detalla la función de cada archivo:

### `components/app-layout.tsx`
Este archivo define el diseño principal de la aplicación, incluyendo la barra lateral y el área de contenido principal. Utiliza el componente `Sidebar` y `DashboardHeader` para estructurar la interfaz de usuario.

### `components/create-tracker-dialog.tsx`
Proporciona un diálogo para crear nuevos trackers personalizados. Permite a los usuarios definir campos personalizados, configurar metas y seleccionar opciones de visualización para sus trackers.

### `components/custom-tracker-widget.tsx`
Define un widget para mostrar datos de trackers personalizados. Muestra el progreso hacia las metas y permite la navegación a la página de detalles del tracker.

### `components/dashboard-header.tsx`
Proporciona un encabezado para el dashboard que muestra la fecha actual y permite la navegación entre días. Incluye estadísticas resumidas como el número de actividades y el tiempo rastreado.

### `components/draggable-section.tsx`
Define una sección arrastrable para el dashboard. Utiliza la biblioteca `@dnd-kit/sortable` para permitir que los usuarios reorganicen las secciones del dashboard.

### `components/draggable-widget.tsx`
Define un widget arrastrable para el dashboard. Similar a `draggable-section.tsx`, pero diseñado para widgets individuales.

### `components/grid-draggable-widget.tsx`
Proporciona un widget arrastrable basado en una cuadrícula. Permite la colocación precisa de widgets en una cuadrícula y es utilizado en el sistema de inventario.

### `components/inventory-grid.tsx`
Define una cuadrícula de inventario para organizar widgets. Utiliza la biblioteca `@dnd-kit/core` para gestionar la funcionalidad de arrastrar y soltar.

### `components/quick-entry-popover.tsx`
Proporciona un popover para la entrada rápida de datos. Permite a los usuarios seleccionar elementos recientes, frecuentes o favoritos para una entrada rápida.

### `components/sidebar.tsx`
Define la barra lateral de la aplicación. Incluye navegación a diferentes secciones de la aplicación, como el dashboard, el calendario, los activos y los trackers personalizados.

### `components/theme-provider.tsx`
Proporciona un proveedor de tema para la aplicación. Utiliza la biblioteca `next-themes` para gestionar el tema oscuro y claro.

### `components/tracker-widget.tsx`
Define un widget para mostrar datos de diferentes tipos de trackers, como tareas, libros, dieta, ejercicio, juegos, medios, estado de ánimo, social, TV y peso. Utiliza la biblioteca `recharts` para visualizar datos en gráficos.

En resumen, la carpeta `components` contiene componentes específicos de la aplicación Chimero que son esenciales para su funcionalidad. Estos componentes están diseñados para ser reutilizables y modulares, lo que facilita la construcción y el mantenimiento de la interfaz de usuario de la aplicación.