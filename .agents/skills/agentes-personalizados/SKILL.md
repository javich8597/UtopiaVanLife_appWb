---
name: agentes-personalizados
description: >-
  Guía y referencia técnica para crear, configurar e invocar Agentes Personalizados
  (Custom Agents) y Subagentes en Google Antigravity. Usar cuando se requiera crear o
  definir nuevos agentes especializados, configurar sus campos YAML frontmatter (name,
  description, tools, model, mainAgent, subagent, permissionMode, commandExecutionPolicy,
  skills, mcpServers), estructurar sus rutas en el proyecto (.agents/agents/), o comprender
  los flujos de invocación y delegación asíncrona.
license: Apache-2.0
metadata:
  version: 1.0.0
---

# Guía de Agentes Personalizados (Custom Agents) en Google Antigravity

Los **Agentes Personalizados (Custom Agents)** son configuraciones especializadas basadas en archivos Markdown con cabecera YAML frontmatter. Permiten resolver los dos grandes problemas de los asistentes de desarrollo genéricos:

1. **Falta de especialización**: Un asistente general no conoce las convenciones de tu proyecto, guías de estilo, reglas de dependencias o frameworks a menos que se le expliquen en cada sesión.
2. **Sobrecarga del context window (Token Bloat)**: Cargar un prompt monolítico con todas las guías de código, linters, y reglas en cada turno agota rápidamente el presupuesto de tokens y degrada la precisión del modelo.

Con los Agentes Personalizados, defines un rol concreto con su propio System Prompt acotado, un subconjunto curado de herramientas (`tools`), skills especializadas (`skills`), servidores MCP y políticas de ejecución seguras.

---

## 1. Dónde se Guardan (Ubicación y Descubrimiento)

Antigravity busca y descubre automáticamente los archivos de definición de agentes en tres niveles:

| Nivel | Ruta en el Sistema | Ámbito y Uso |
| :--- | :--- | :--- |
| **Proyecto / Workspace** *(Recomendado)* | `.agents/agents/<nombre>.md`<br>o `.agents/agents/<nombre>/agent.md` | Específico del repositorio. Se commitea en Git y queda disponible de inmediato para todos los desarrolladores del equipo sin configuración manual. |
| **Global (Usuario)** | `~/.gemini/config/agents/<nombre>.md`<br>o `~/.gemini/config/agents/<nombre>/agent.md` | Disponible en cualquier proyecto abierto por el usuario en su máquina. |
| **Plugins** | `plugins/<plugin_name>/agents/` | Agentes empaquetados dentro de un plugin reutilizable o distribuible. |

> [!NOTE]
> La prioridad de resolución sigue la jerarquía de Antigravity: un agente definido en el proyecto (`.agents/agents/`) tiene mayor precedencia que uno con el mismo nombre a nivel global.

---

## 2. Formato del Archivo de Agente

Un agente personalizado se define en un único archivo Markdown (`.md`) dividido en dos partes:
1. **Cabecera YAML frontmatter** (entre delimitadores `---`): define metadatos, permisos, herramientas y modelo.
2. **Cuerpo Markdown**: se compila directamente en el **System Prompt** del agente.

### Campos Soportados en el Frontmatter YAML

| Campo | Tipo | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `name` | `string` | *(Requerido)* | Identificador único del agente (usar letras minúsculas, números y guiones, ej. `dependency-modernizer`). |
| `description` | `string` | *(Requerido)* | Descripción detallada de qué hace y cuándo debe invocarse. El planner del orquestador la utiliza para decidir delegar tareas automáticamente. |
| `tools` | `string[]` | `[]` | Lista explícita de herramientas permitidas (ej. `view_file`, `replace_file_content`, `grep_search`, `run_command`, `manage_task`). |
| `mainAgent` | `boolean` | `true` | Si es `true`, permite interactuar con él directamente como agente principal en la UI o desde la CLI. |
| `subagent` | `boolean` | `true` | Si es `true`, permite que un agente coordinador lo invoque como trabajador secundario (`invoke_subagent`). |
| `model` | `string` | `inherit` | Nivel de modelo a utilizar: `inherit` (hereda el del llamador), `flash` (alta velocidad/bajo consumo) o `pro` (máxima capacidad de razonamiento). |
| `permissionMode` | `string` | `default` | Modo de permisos concedidos: `acceptEdits`, `bypassPermissions`, etc. |
| `commandExecutionPolicy` | `string` | `sandbox` | Política de ejecución autónoma de terminal: `sandbox`, `auto`, `off`, `eager`. |
| `skills` / `plugins` | `string[]` | `[]` | Rutas de skills específicas que este agente tiene permiso de consultar (ej. `skills/package-upgrade-rules`). |
| `mcpServers` | `object[]` | `[]` | Servidores MCP adicionales o dedicados para este agente. |

> [!CAUTION]
> **Validación estricta de `tools`**: Especificar un nombre de herramienta inexistente o mal escrito en la lista `tools` puede causar que el proceso del subagente se bloquee en tiempo de ejecución. Verifica siempre los nombres exactos (ej. `view_file`, `replace_file_content`, `grep_search`, `run_command`).

---

## 3. Características Clave y Políticas de Seguridad

### Simetría de Ejecución: Main Agent vs. Subagent
A diferencia de otras herramientas donde los agentes son exclusivamente subagentes pasivos en segundo plano, en Antigravity disfrutan de **simetría total**:

```yaml
mainAgent: true
subagent: true
```

* **Como Main Agent**: Puedes iniciar tu sesión de desarrollo hablando directamente con el agente especializado:
  - En la interfaz gráfica (Antigravity 2.0): Selecciónalo directamente desde el desplegable de agentes en el chat.
  - En la CLI: Ejecútalo con el flag `agy --agent <nombre-del-agente>`.
* **Como Subagent**: Un agente coordinador puede spawnearlo en segundo plano para realizar una tarea concreta sin contaminar su propio hilo de conversación.

### Política de Ejecución de Comandos (`commandExecutionPolicy`)
Para evitar interrupciones continuas por confirmación al ejecutar suites de tests, compilaciones o linters:

```yaml
permissionMode: acceptEdits
commandExecutionPolicy: auto
```

* `commandExecutionPolicy: auto`: Permite al agente ejecutar de forma autónoma comandos estándar seguros (ej. `npm test`, `npm run build`, `pytest`) para ciclos rápidos de ensayo y error en background.
* Los comandos de alto riesgo (como borrado masivo de archivos o eliminación de datos de producción) continúan requiriendo confirmación manual obligatoria independientemente de esta directiva.

### Reducción de Ruido con Skills y Herramientas Acotadas
En lugar de cargar todas las herramientas de la base de código (navegadores, bases de datos, APIs externas) y decenas de skills en cada prompt:
- Si el agente solo necesita auditar código, asígnale únicamente `view_file` y `grep_search`.
- Si el agente solo necesita actualizar dependencias, asígnale `run_command`, `view_file`, `replace_file_content` y la skill de actualización.

---

## 4. Cómo se Invocan y Ejecutan

### 1. Invocación Directa (Usuario a Agente Principal)
- **GUI (Antigravity 2.0 / IDE)**: Haz clic en el selector de modelo/agente en la barra de chat y selecciona el nombre del agente.
- **CLI**:
  ```bash
  agy --agent dependency-modernizer
  ```
- **Panel `/agents`**: Escribe `/agents` en el chat para abrir el gestor interactivo y alternar entre agentes disponibles.

### 2. Invocación Asíncrona (Orquestador a Subagente)
El agente principal utiliza la herramienta `invoke_subagent` indicando el rol y el prompt inicial:

- **Aislamiento de contexto**: El subagente arranca con un context window limpio. No hereda el historial conversacional anterior, ahorrando tokens.
- **Opciones de Workspace**:
  - `inherit`: Ejecuta sobre el mismo directorio de trabajo del padre.
  - `branch`: Crea un Git worktree aislado temporal para no interferir con cambios en caliente.
  - `share`: Comparte almacenamiento de archivos sin clonar.
- **Límite de anidamiento**: Antigravity impone un límite estricto de **10 niveles de profundidad** para evitar bucles o recursión infinita.
- **Ciclo de vida**:
  - `Running`: Ejecutando pasos y herramientas.
  - `Idle`: Tarea completada; envía el resultado al padre y espera dormido. Si recibe un nuevo mensaje, se despierta automáticamente conservando su memoria previa.
  - `Killed`: Terminado manualmente o por el padre; limpia worktrees temporales.

---

## 5. Monitorización y Ergonomía en la CLI / GUI

Antigravity proporciona controles y atajos integrados para trabajar con subagentes sin fricción:

- **Panel `/agents`**: Muestra una lista en tiempo real de todos los agentes activos, completados o terminados con su estado y paso actual.
- **Teletransporte (`Alt + J`)**: Si un subagente en background solicita autorización manual (ej. ejecutar una migración o escribir un archivo sensible), pulsar `Alt + J` salta directamente a la vista en detalle de ese subagente.
- **Confirmación Rápida Fast-Path (`Ctrl + K`)**: Aparece un aviso en el prompt principal (ej. `Subagent 3 pide ejecutar "npm test"`). Pulsar `Ctrl + K` aprueba la acción inmediatamente sin abandonar la conversación principal.
- **Comando `/tasks`**: Supervisa procesos en segundo plano que no sean agentes (ej. servidores locales, compilaciones largas).

---

## 6. Blueprints y Ejemplos Prácticos

### Ejemplo 1: Modernizador de Dependencias
Archivo: `.agents/agents/dependency-modernizer.md`

```markdown
---
name: dependency-modernizer
description: Especialista en actualizar dependencias, paquetes npm y verificar que la suite de pruebas del proyecto pase limpiamente.
model: flash
mainAgent: true
subagent: true
permissionMode: acceptEdits
commandExecutionPolicy: auto
tools:
  - view_file
  - replace_file_content
  - run_command
  - manage_task
---

# Instrucciones Principales
Eres un asistente de modernización y actualización de dependencias de software.

## Responsabilidades
1. Lee los archivos de manifiesto de dependencias (`package.json`, `package-lock.json`, etc.).
2. Identifica paquetes desactualizados y evalúa actualizaciones menores o de parches primero.
3. Ejecuta comandos de instalación y de validación (`npm test`, `npm run build`).
4. Si un test falla tras una actualización, diagnostica la rotura o revierte el cambio de forma limpia.
```

---

### Ejemplo 2: Auditor de Seguridad y Buenas Prácticas
Archivo: `.agents/agents/code-auditor.md`

```markdown
---
name: code-auditor
description: Subagente de análisis estático, revisión de seguridad, detección de secretos y antipatrones de código.
model: pro
mainAgent: false
subagent: true
commandExecutionPolicy: sandbox
tools:
  - view_file
  - grep_search
  - list_dir
skills:
  - skills/security-checklist
---

# System Prompt
Eres un auditor experto de seguridad y calidad de código. Tu objetivo es inspeccionar el código fuente sin realizar modificaciones destructivas.

## Pautas de Revisión
1. Realiza análisis estático exhaustivo identificando vulnerabilidades (XSS, inyecciones, secretos en texto claro).
2. No modifiques ningún archivo. Emite un informe estructurado con criticidad (Alta, Media, Baja).
3. Para cada hallazgo, proporciona el archivo, número de línea y recomendación concreta de mitigación.
```

---

### Ejemplo 3: Diseñador UI/UX Adaptativo para Móviles
Archivo: `.agents/agents/mobile-ui-specialist.md`

```markdown
---
name: mobile-ui-specialist
description: Especialista en diseño responsive móvil, CSS moderno, ergonomía táctil y adaptación de layouts para smartphones y tablets.
model: pro
mainAgent: true
subagent: true
tools:
  - view_file
  - replace_file_content
  - multi_replace_file_content
  - grep_search
---

# Rol y Directrices de Maquetación Móvil
Eres un ingeniero especialista en diseño frontend responsivo para dispositivos móviles.

## Directrices de Diseño
1. Asegura que los touch targets midan al menos 44px de altura/ancho.
2. Evita barras de scroll horizontal no deseadas; revisa `overflow-x` y `max-width: 100%`.
3. Respeta siempre las áreas seguras con `env(safe-area-inset-bottom)` y `env(safe-area-inset-top)`.
4. Utiliza clases CSS estructuradas y variables dinámicas en lugar de estilos inline rígidos.
```

---

## 7. Resumen de Flujo de Trabajo para Crear un Agente

1. Crea la carpeta `.agents/agents/` en la raíz de tu proyecto si no existe.
2. Crea el archivo `<nombre-del-agente>.md`.
3. Completa la cabecera YAML con `name`, `description`, `tools`, `mainAgent`, `subagent`, `model` y `commandExecutionPolicy`.
4. Redacta el prompt del sistema detallado en el cuerpo en Markdown.
5. Haz commit del archivo en Git para que todo tu equipo disponga del agente automáticamente.
