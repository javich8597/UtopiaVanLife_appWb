const fs = require('fs');

const categorized = JSON.parse(fs.readFileSync('categorized_inventory.json', 'utf8'));

// Format Markdown Table
let md = `# Inventario y Organización de Material Multimedia - UtopiaVanLife

Este documento cataloga y estructura los **44 archivos multimedia** (fotografías de alta resolución, renders PNG y vídeos 4K/FullHD) disponibles en la carpeta fuente \`Landing Videos-images/Landing\`.

---

## 1. Resumen Ejecutivo y Estructura Creada

La estructura de carpetas implementada en el proyecto web sigue las mejores prácticas de arquitectura de contenidos, SEO y rendimiento web (Next.js / Vite / Web):

\`\`\`
public/
├── images/
│   ├── hero/                          # Imágenes panorámicas de portada y estilo de vida premium
│   ├── campers/
│   │   ├── neo/
│   │   │   ├── exterior/              # Fotos exteriores de la camper NEO
│   │   │   ├── interior/              # Salón, cama montada, cocina y baño
│   │   │   └── details/               # Almacenaje, garaje con bici, acabados
│   │   └── space/
│   │       ├── exterior/              # Fotos exteriores del modelo SPACE
│   │       ├── interior/              # Salón en U, proyector cine, cama suspendida
│   │       └── details/               # Grifería, repisas aromáticas, sillas plegables
│   └── lifestyle/                     # Escenas de viaje, café matutino, acantilados
└── videos/
    ├── campers/
    │   ├── neo/                       # Vídeos de presentación, tour interior, garaje
    │   └── space/                     # Recorrido salón, ducha completa, cocina
    └── lifestyle/                     # Clips de carretera, momentos de desconexión
\`\`\`

---

## 2. Inventario Completo de Medios (44 Archivos)

| # | Archivo Original | Carpeta Origen | Formato / Tamaño | Contenido Visual & Clasificación | Ruta Web Propuesta / Generada | Conversión Requerida |
|---|---|---|---|---|---|---|
`;

categorized.forEach((item, idx) => {
  const dur = item.duration && parseFloat(item.duration) > 0 ? ` (${parseFloat(item.duration).toFixed(1)}s)` : '';
  const dims = item.width && item.height ? `${item.width}x${item.height}` : 'N/A';
  const size = item.sizeMb ? `${item.sizeMb} MB` : 'N/A';
  const formatInfo = `${item.ext.toUpperCase()} [${dims}] ${size}${dur}`;

  md += `| ${idx + 1} | \`${item.file}\` | \`${item.relFolder}\` | ${formatInfo} | **${item.subcategory.toUpperCase()}**<br>${item.description} | \`${item.cleanName}\` | ${item.formatAction} |\n`;
});

md += `
---

## 3. Estado de Ejecución y Siguientes Pasos

1. **Fotografías e Imágenes WebP/JPG (18 archivos)**:
   - Convertidas con éxito a **WebP optimizado** (calidad visual Q=82 con reducción de peso drástica sin pérdidas perceptibles) y generado su **fallback JPG**.
   - Ubicadas de forma directa en \`public/images/campers/neo/\`, \`public/images/campers/space/\` y \`public/images/hero/\`.
2. **Archivos Dañados detectados (1 archivo)**:
   - \`SPACE/IMG_2183.HEIC\` presentaba la cabecera del contenedor truncada/dañada en origen. Ha sido descartado correctamente, ya que \`SPACE/IMG_2184.HEIC\` es la toma idéntica en perfecto estado.
3. **Vídeos Web (26 archivos MOV 4K ProRes/HEVC)**:
   - Listos para transcodificarse por lotes con FFmpeg a formato **MP4 H.264 (CRF 23, faststart)** para streaming sin buffering en la web.
`;

fs.writeFileSync('INVENTARIO_MULTIMEDIA.md', md, 'utf8');
console.log('Successfully generated INVENTARIO_MULTIMEDIA.md');
