# Guía y Reglas de Desarrollo del Proyecto (Utopia Van Life)

## Reglas de Maquetación y Responsive Mobile (Next.js & Style JSX)

1. **Prohibido usar inline styles para layout estructural:**
   - Nunca aplicar `display: flex`, `display: grid`, `flex-direction`, `padding`, `gap`, `width: 100%`, o `text-align` mediante `style={{ ... }}` en elementos contenedores o de layout.
   - Todo layout estructural debe definirse mediante clases CSS en los bloques `<style jsx>`.

2. **Garantía de adaptabilidad en dispositivos móviles:**
   - Los estilos inline tienen mayor especificidad en CSS y anulan las reglas `@media` de `<style jsx>`, impidiendo la adaptación responsive en pantallas móviles.
   - Solo se permiten inline styles para valores puramente dinámicos generados en tiempo de ejecución (ej. variables CSS en inline styles `--custom-color`, o posiciones calculadas por JS).

3. **Breakpoints estándar del proyecto:**
   - `>= 861px`: Vista escritorio completa (sidebar fija, tablas expandidas).
   - `<= 860px`: Colapso de sidebar a barra móvil compacta o navegación superior/inferior.
   - `<= 640px`: Apilado vertical de acciones, botones a ancho completo (40-44px touch target), modales adaptados a bottom sheet y paddings reducidos.
