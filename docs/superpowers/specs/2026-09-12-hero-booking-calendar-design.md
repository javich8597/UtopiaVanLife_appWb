# Especificación de Diseño: Selector de Fechas y Viajeros en Inicio (HeroSection)

**Fecha:** 2026-09-12  
**Estado:** Aprobado  
**Objetivo:** Reemplazar los inputs nativos de tipo date en la barra de búsqueda del inicio (`HeroSection.tsx`) por un calendario emergente (popover/dropdown) interactivo, moderno, cómodo y con la estética de Utopia Van Life, además de fijar el límite máximo de viajeros a 3 plazas.

---

## 1. Contexto y Requisitos

1. **Ubicación:** `components/home/HeroSection.tsx` (barra de búsqueda de la pantalla de inicio).
2. **Selector de Fechas:**
   - Sustituir los inputs `<input type="date">` por dos disparadores (Llegada y Salida) tipo botón/píldora dentro de la barra de búsqueda `glass`.
   - Si no hay fecha elegida: *"Añadir fecha"*.
   - Si hay fecha: mostrar formato legible, por ej. *"18 jun"* o *"18 de jun"*.
   - Al hacer clic en cualquiera de los dos, se abre un popover flotante posicionado sobre/bajo la barra con el componente `BookingCalendar`.
   - Soporta cierre al hacer clic fuera (detectando clicks en `document`) y al completar el rango de fechas.
3. **Límite de Viajeros:**
   - Selector `pax` limitado estrictamente a un rango de 1 a 3 personas (`Math.min(3, p + 1)`).
   - Botón `+` deshabilitado visualmente y funcionalmente cuando `pax === 3`.
4. **Navegación:**
   - Al pulsar "Buscar", redirige a `/campers?from=YYYY-MM-DD&to=YYYY-MM-DD&pax=N`.
