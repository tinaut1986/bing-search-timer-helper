# Bing Search Timer Helper - Historial de Cambios
 
## [1.9.0] - 2026-01-12

### Nuevas Características (Integración Microsoft Rewards)
- **Visualización de Puntos**: Ahora puedes ver tu saldo total de puntos de Microsoft Rewards directamente en el recuadro.
- **Conversión a Tarjetas Amazon**: Cálculo automático del valor de tus puntos en euros para tarjetas regalo de Amazon (1€ = 1338 pts).
- **Progreso de Búsquedas Diario**: Indicador de búsquedas realizadas hoy (ej: 12/30) basado en los datos reales de tu cuenta.
- **Estado de Tareas Diarias**: Alerta visual que indica si tienes el "Set Diario" de tareas pendiente o completado.
- **Monitor de Seguridad de Cuenta**: Indicador del estado de la cuenta para detectar rápidamente suspensiones o bloqueos.
- **Extracción de Datos de Alta Fidelidad**: Integración con los scripts internos de Bing (`ModernRewards`) para obtener datos en tiempo real con máxima precisión.

## [1.8.2] - 2025-12-29

### Nuevas Características
- **Estado de Sesión en Widget Minimizado**: Ahora el widget muestra el progreso de la sesión (X/Y) y el temporizador directamente en el texto del manejador cuando está minimizado.
- **Prevención de Suspensión (Wake Lock)**: Implementado el uso de Screen Wake Lock para mantener el dispositivo encendido durante las sesiones automáticas, ideal para uso en móviles.
- **Aviso de Objetivo**: El temporizador ahora muestra explícitamente "¡Objetivo alcanzado!" al finalizar el tiempo programado.

### Mejoras y Correcciones
- **Internacionalización**: Reforzado el sistema de traducciones con soporte para parámetros dinámicos y nuevas etiquetas.
- **Estabilidad de UI**: Mejoras en la persistencia del estado (minimizado/maximizado) y posicionamiento del widget.

## [1.8.1] - 2025-12-23

### Mejoras y Correcciones
- **Soporte Móvil (SPA)**: Corregido error donde el cronómetro se detenía al navegar en dispositivos móviles.
- **Sesión Automática en Móvil**: Las sesiones ahora continúan correctamente en dispositivos móviles sin necesidad de recargar la página manualmente.

## [1.8.0] - 2025-12-23

### Nuevas Características
- **Sesión de Búsqueda Automática**: Ahora puedes programar un número específico de búsquedas automáticas.
- **Algoritmo de Tiempos Realista**: Las búsquedas se realizan con intervalos aleatorios (80% > 10s, 20% 5-10s) para mayor seguridad.
- **Persistencia de Sesión**: Las sesiones automáticas continúan automáticamente incluso después de recargar la página.
- **Contador Total Diario**: Añadido un indicador de cuántas búsquedas totales (únicas) has realizado hoy.
- **Controles en Modo Minimizado**: Nuevos botones para realizar búsquedas rápidas o pausar/reanudar la sesión desde el widget minimizado.
- **Pausa Inteligente de Scroll**: El auto-scroll se detiene automáticamente durante el tecleo de una búsqueda y solo se activa si hay una sesión en marcha.
- **Notificaciones de Fin de Sesión**: La extensión te avisa con una notificación del sistema cuando se completa la sesión programada.
- **Aviso de Responsabilidad**: Añadido un modal obligatorio de aceptación antes de iniciar sesiones automáticas, con opción de guardado persistente y acceso rápido desde el icono ⚠️.

### Mejoras y Correcciones
- **Internacionalización**: Soportados nuevos idiomas y etiquetas corregidas para mayor claridad.
- **Estabilidad**: Corregidos errores de carga de la interfaz y sincronización de colores de los botones.

## [1.7.0] - 2025-12-22

### Nuevas Características
- **⌨️ Simulación de Escritura Realista**: Ahora la extensión puede "teclear" las búsquedas por ti imitando el comportamiento humano, incluyendo erratas naturales, pausas y correcciones automáticas.
- **🔽 Modo Minimizado**: ¿Te molesta el widget? Ahora puedes minimizarlo para que ocupe el mínimo espacio posible, manteniendo visible el temporizador y el botón de búsqueda rápida.
- **📱 Soporte Móvil Mejorado**: Interfaz optimizada para pantallas táctiles y mejoras en la función de búsqueda automática.
- **🌍 Multilenguaje**: Interfaz traducida completamente al Español, Catalán, Inglés, Francés, Italiano y Portugués.

### Otras características principales
- **Temporizador Visual**: Define un objetivo de tiempo. El contador cambia de color para avisarte visualmente.
- **Generador de Búsquedas Únicas**: Crea búsquedas aleatorias basadas en videojuegos para no repetir búsquedas el mismo día.
- **Listas Personalizables**: Edita las plantillas y los datos desde las opciones.
- **Widget Movible**: Arrástralo y colócalo donde más cómodo te resulte.

## [1.6.0] - 2025-08-08

### Mejoras y Correcciones
- **Rediseño de la interfaz de botones**: Se ha renovado el diseño de los botones para una mejor experiencia de usuario. El botón principal de búsqueda es ahora más grande y prominente. Los botones secundarios son más compactos.
- **Temporizador fiable**: Corregido un error que causaba que el temporizador no se reiniciara automáticamente después de realizar una búsqueda.
- **Compatibilidad mejorada**: Solucionado un problema de compatibilidad con Firefox al eliminar la propiedad version_name del manifiesto para garantizar una carga sin advertencias.

## [1.5.0] - 2025-05-20

### Mejoras
- **Compatibilidad extendida**: Ahora el complemento funciona en todas las páginas de Bing, no solo en las búsquedas.
- **Menú contextual**: Se ha añadido un menú emergente accesible desde el icono de la extensión.

### Correcciones
- **Temporizador**: Corregido un error en el temporizador que causaba imprecisión cuando la pestaña estaba inactiva.
- **Rendimiento**: Optimizaciones varias para mejorar el rendimiento del temporizador.
