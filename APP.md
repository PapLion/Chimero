# Carpeta APP

## Assets

La carpeta `app/assets` contiene los archivos relacionados con la gestión de activos en la aplicación Chimero. A continuación, se detalla la función de cada archivo:

### `app/assets/loading.tsx`
Este archivo define un componente de carga para la página de activos. Actualmente, el componente no muestra nada, lo que significa que no hay un indicador de carga visible para los usuarios mientras se cargan los activos.

### `app/assets/page.tsx`
Este archivo define la página principal para la gestión de activos en la aplicación. Proporciona una interfaz completa para subir, visualizar, editar y eliminar activos. A continuación, se detallan las principales funcionalidades:

1. **Subida de Activos**: Permite a los usuarios subir archivos de imagen (SVG, PNG, JPG, GIF, WebP) mediante arrastrar y soltar o seleccionando archivos desde su dispositivo. También soporta la función de pegar imágenes desde el portapapeles.

2. **Vista Previa y Confirmación**: Cuando un usuario sube un archivo, se muestra una vista previa del activo junto con un formulario para ingresar el nombre y la categoría del activo. El usuario puede confirmar la subida o cancelarla.

3. **Filtros y Búsqueda**: Proporciona opciones para filtrar activos por categoría y buscar activos por nombre. Las categorías incluyen "All Assets", "Games", "Books", "TV & Movies", "Apps & Media", y "Other".

4. **Vistas de Activos**: Los usuarios pueden alternar entre una vista de cuadrícula y una vista de lista para visualizar los activos. La vista de cuadrícula muestra los activos en un formato de tarjetas, mientras que la vista de lista muestra los activos en un formato de lista detallado.

5. **Edición y Eliminación**: Permite a los usuarios editar los detalles de los activos y eliminarlos. La edición incluye la capacidad de cambiar el nombre y la categoría del activo.

6. **Descarga de Activos**: Los usuarios pueden descargar activos individuales en su formato original.

7. **Notificaciones**: Muestra notificaciones de éxito o error para acciones como subir, editar, eliminar y descargar activos.

En resumen, la carpeta `app/assets` proporciona una interfaz completa para la gestión de activos en la aplicación Chimero, permitiendo a los usuarios subir, visualizar, editar, eliminar y descargar activos de manera eficiente.

## Calendar

La carpeta `app/calendar` contiene los archivos relacionados con la funcionalidad del calendario en la aplicación Chimero. A continuación, se detalla la función de cada archivo:

### `app/calendar/page.tsx`
Este archivo define la página del calendario en la aplicación. Proporciona una interfaz para visualizar y navegar por un calendario mensual, permitiendo a los usuarios ver sus actividades y progreso a lo largo del tiempo. A continuación, se detallan las principales funcionalidades:

1. **Navegación por Meses**: Permite a los usuarios navegar entre meses utilizando botones de "anterior" y "siguiente". El calendario muestra el mes y el año actual en la parte superior.

2. **Filtros por Categoría**: Proporciona opciones para filtrar actividades por categoría. Las categorías incluyen "Exercise", "Diet", "Weight", "Tasks", "TV", "Books", "Media" y "Gaming". Cada categoría tiene un color asociado para facilitar la identificación visual.

3. **Visualización del Calendario**: Muestra un calendario mensual con los días del mes organizados en una cuadrícula. Los días se muestran con sus números correspondientes y se resaltan los días con actividades registradas.

4. **Selección de Días**: Permite a los usuarios seleccionar un día específico para ver más detalles sobre las actividades registradas en ese día. Cuando se selecciona un día, se muestra una sección con detalles de las actividades registradas para ese día.

5. **Detalles de Actividades**: Muestra detalles de las actividades registradas para el día seleccionado. Cada categoría de actividad muestra la cantidad de tiempo registrado para esa categoría.

En resumen, la carpeta `app/calendar` proporciona una interfaz completa para la visualización y navegación del calendario en la aplicación Chimero, permitiendo a los usuarios ver y filtrar sus actividades y progreso a lo largo del tiempo.

## Statistics 

La carpeta `app/statistics` contiene los archivos relacionados con la funcionalidad de estadísticas y análisis en la aplicación Chimero. A continuación, se detalla la función de cada archivo:

### `app/statistics/loading.tsx`
Este archivo define un componente de carga para la página de estadísticas. Actualmente, el componente no muestra nada, lo que significa que no hay un indicador de carga visible para los usuarios mientras se cargan las estadísticas.

### `app/statistics/page.tsx`
Este archivo define la página de estadísticas en la aplicación. Proporciona una interfaz para visualizar y analizar estadísticas y correlaciones en los datos de los usuarios. A continuación, se detallan las principales funcionalidades:

1. **Búsqueda Retroactiva**: Permite a los usuarios buscar en su historial de actividades y elementos. Por ejemplo, pueden buscar "cuándo comí tacos por última vez" o "total de huevos en 2024". Los resultados de la búsqueda muestran el número de veces que se registró un elemento y la última vez que se usó.

2. **Selección de Rango de Tiempo**: Permite a los usuarios seleccionar un rango de tiempo para las estadísticas, como los últimos 7 días, 30 días, 90 días, un año o todo el tiempo.

3. **Estadísticas de Estado de Ánimo**: Muestra estadísticas sobre el estado de ánimo, incluyendo el promedio diario, el número total de entradas registradas, la racha actual y la racha máxima.

4. **Estadísticas de Ejercicio**: Muestra estadísticas sobre las sesiones de ejercicio, incluyendo el número total de sesiones, el promedio diario y la desviación estándar.

5. **Rachas**: Muestra la racha actual y la racha máxima de actividades registradas.

6. **Consistencia del Estado de Ánimo**: Muestra la consistencia del estado de ánimo utilizando una barra de progreso y una puntuación de desviación estándar.

7. **Análisis de Patrones y Correlaciones**: Muestra correlaciones entre diferentes actividades y cómo se afectan mutuamente. Por ejemplo, puede mostrar cómo el ejercicio afecta el estado de ánimo o cómo la dieta afecta la energía. Estas correlaciones se calculan localmente sin el uso de APIs de IA.

8. **Estadísticas Detalladas por Tracker**: Proporciona pestañas para ver estadísticas detalladas de diferentes trackers, como estado de ánimo, ejercicio, dieta y social. Cada pestaña muestra estadísticas específicas como el número total de entradas, el promedio diario, la racha actual y la racha máxima.

En resumen, la carpeta `app/statistics` proporciona una interfaz completa para la visualización y análisis de estadísticas en la aplicación Chimero, permitiendo a los usuarios buscar en su historial, ver estadísticas detalladas y descubrir correlaciones entre diferentes actividades.

## Page.tsx, Layout.tsx & globals.css
La carpeta `app` contiene los archivos principales de la aplicación Chimero. A continuación, se detalla la función de cada archivo:

### `app/page.tsx`
Este archivo define la página principal de la aplicación. Proporciona un dashboard personalizable donde los usuarios pueden organizar y visualizar widgets de diferentes trackers. Utiliza la biblioteca `@dnd-kit/core` para permitir que los usuarios arrastren y suelten widgets en una cuadrícula. Los widgets pueden ser de diferentes tipos, como tareas, libros, dieta, ejercicio, juegos, medios, estado de ánimo, social, TV y peso, así como trackers personalizados. La página también gestiona la disposición de los widgets y actualiza el diseño del dashboard cuando los usuarios reorganizan los widgets.

### `app/layout.tsx`
Este archivo define el diseño principal de la aplicación. Configura las fuentes y los metadatos de la aplicación, como el título y la descripción. También define el proveedor de datos de la aplicación y el diseño de la aplicación, que incluye la barra lateral y el área de contenido principal. Utiliza el componente `AppLayout` para estructurar la interfaz de usuario y el proveedor `AppDataProvider` para gestionar el estado global de la aplicación.

### `app/globals.css`
Este archivo define los estilos globales de la aplicación. Configura las variables de tema para el modo oscuro y claro, y define estilos para elementos como la barra de desplazamiento y el efecto de brillo en los widgets. Utiliza Tailwind CSS para definir los estilos y proporciona una base consistente para la apariencia de la aplicación.

En resumen, la carpeta `app` contiene los archivos principales que definen la estructura, el diseño y los estilos de la aplicación Chimero. Estos archivos trabajan juntos para proporcionar una interfaz de usuario coherente y personalizable para los usuarios.

## trackers 

La carpeta `app/trackers` contiene los archivos relacionados con la gestión de trackers personalizados en la aplicación Chimero. A continuación, se detalla la función de cada archivo:

### `app/trackers/page.tsx`
Este archivo define la página de gestión de trackers personalizados en la aplicación. Proporciona una interfaz para crear, visualizar, editar y eliminar trackers personalizados. A continuación, se detallan las principales funcionalidades:

1. **Creación de Trackers**: Permite a los usuarios crear nuevos trackers personalizados mediante un diálogo de creación. Los usuarios pueden definir campos personalizados, configurar metas y seleccionar opciones de visualización para sus trackers.

2. **Visualización de Trackers**: Muestra una lista de todos los trackers personalizados creados por el usuario. Cada tracker se muestra como un widget personalizado que incluye información como el nombre, la categoría, el progreso hacia las metas y el número de entradas registradas.

3. **Gestión de Visibilidad**: Permite a los usuarios alternar la visibilidad de los trackers en el dashboard principal. Los usuarios pueden elegir mostrar u ocultar trackers específicos en el dashboard.

4. **Edición y Eliminación**: Proporciona opciones para editar y eliminar trackers personalizados. Los usuarios pueden editar los detalles de los trackers y eliminarlos si ya no son necesarios. La eliminación de un tracker también elimina todos los datos asociados con él.

5. **Interfaz de Usuario**: La página muestra un mensaje de "No custom trackers yet" si el usuario no ha creado ningún tracker personalizado. Este mensaje incluye un botón para crear el primer tracker personalizado.

En resumen, la carpeta `app/trackers` proporciona una interfaz completa para la gestión de trackers personalizados en la aplicación Chimero, permitiendo a los usuarios crear, visualizar, editar y eliminar trackers personalizados de manera eficiente.

## tracking 

Los archivos dentro de la carpeta `app/tracking` en el proyecto Chimero son responsables de implementar las páginas de seguimiento para diferentes categorías de actividades y datos personales. Cada archivo representa una página específica que permite a los usuarios monitorear y gestionar información relacionada con libros, trackers personalizados, dieta, ejercicio, juegos, medios, estado de ánimo, interacciones sociales, tareas, televisión y peso. A continuación, se detalla la función de cada archivo:

1. **app/tracking/books/page.tsx**: Implementa la página de seguimiento de libros, mostrando widgets para libros actualmente en lectura, tiempo de lectura, metas anuales, libros completados, lista de lectura y géneros favoritos.

2. **app/tracking/custom/[id]/page.tsx**: Proporciona una página dinámica para trackers personalizados, permitiendo a los usuarios visualizar y gestionar datos específicos de sus trackers personalizados.

3. **app/tracking/diet/page.tsx**: Muestra información relacionada con la dieta, incluyendo calorías consumidas, proteínas, carbohidratos, grasas, comidas del día, ingesta de agua y puntuación nutricional.

4. **app/tracking/exercise/page.tsx**: Presenta datos de ejercicio, como el entrenamiento del día, calorías quemadas, minutos activos, metas semanales, rachas de entrenamiento, entrenamientos recientes y récords personales.

5. **app/tracking/gaming/page.tsx**: Muestra información sobre el tiempo de juego, juegos actuales, logros, rachas de juego, juegos recientes y estadísticas semanales.

6. **app/tracking/media/page.tsx**: Proporciona un resumen del tiempo de pantalla, límite diario, desglose de aplicaciones, comparación semanal, aplicaciones más usadas y puntuación de productividad.

7. **app/tracking/mood/page.tsx**: Permite a los usuarios monitorear su estado de ánimo, mostrando el estado de ánimo actual, promedio diario, rachas de ánimo, tendencias semanales, factores de ánimo e historial de entradas de ánimo.

8. **app/tracking/social/page.tsx**: Muestra información sobre interacciones sociales, incluyendo interacciones del día, resumen semanal, métodos de contacto, contactos recientes, planes próximos y amigos cercanos.

9. **app/tracking/tasks/page.tsx**: Implementa una página para gestionar tareas, permitiendo a los usuarios organizar y visualizar sus tareas pendientes y completadas.

10. **app/tracking/tv/page.tsx**: Proporciona información sobre programas de televisión, incluyendo lo que se está viendo actualmente, episodios del día, tiempo de visualización, lista de seguimiento, programas recientemente terminados y programas mejor valorados.

11. **app/tracking/weight/page.tsx**: Muestra datos relacionados con el peso, como el peso actual, meta de peso, cambio semanal, IMC, historial de peso, mediciones corporales y fotos de progreso.

Todos estos archivos utilizan componentes reutilizables y siguen un patrón similar para gestionar la disposición de widgets en una cuadrícula, permitiendo a los usuarios arrastrar y soltar widgets para personalizar su experiencia de seguimiento.