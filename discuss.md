# Épica 2 — Nota pendiente: Lógica diferenciada por arquetipo

## Estado
Gap de **spec del cliente**, no de código. El código actual está completo.

## Qué dijo el cliente
> "It also looks like some of the important trackers such as Books, Gaming, Media, Diet were removed. I have ideas for all those as well."

Las ideas específicas nunca llegaron en los mensajes visibles.

## Decisión actual
Se dejó como **texto libre** intencionalmente. El cliente no especificó formato, y forzar un tipo rígido (rating de estrellas, duración en horas, etc.) sin spec es over-engineering que podría no coincidir con lo que él tenía en mente.

## Qué hacer cuando el cliente especifique
Cuando diga exactamente qué quiere para cada arquetipo, implementar en:
- `apps/electron/src/renderer/src/lib/entry-config.ts` → función `getEntryConfig()` (líneas 19-183)
- Cada arquetipo ya tiene su bloque de configuración:
  - Books → líneas 24-33
  - Gaming → líneas 48-57
  - Media → líneas 60-69
  - Diet → líneas 105-114

## Ejemplos de lo que podría pedir
- Books: rating de estrellas (1-5), páginas leídas, estado (reading/finished/DNF)
- Gaming: horas de sesión, plataforma, porcentaje de completado
- Media: episodios vistos, temporada actual, rating
- Diet: calorías, macros, tipo de comida

## Prioridad
🟡 Baja — no bloquea ninguna épica. Retomar cuando el cliente lo especifique.