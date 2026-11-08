---
name: edit-crlf-files
description: Muchos archivos del árbol de trabajo están en CRLF; ediciones multilínea por script o heredoc se rompen
metadata:
  type: feedback
---

Varios archivos de `app/[locale]/admin/` y `middleware.ts` están en CRLF en el disco (el índice de git es LF, `core.autocrlf=true`). No hay Python en el entorno.

**Why:** en esta sesión, ediciones multilínea con `node` + heredoc o `node -e` dejaron saltos de línea reales dentro de cadenas y regex (`\\n` mal escapado) y rompieron tsc.
**How to apply:** para cambios multilínea escribe un script `.js` con la herramienta Write (no heredoc ni `node -e`), normaliza `\r\n` a `\n` antes de reemplazar y restáuralo después; ejecuta `npx tsc --noEmit` tras cada tanda. Los reemplazos de una sola línea con Edit funcionan bien.
