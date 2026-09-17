const fs = require('fs');

const inv = JSON.parse(fs.readFileSync('detailed_media_info.json', 'utf8'));

// Build detailed mapping with content description, category, and proposed web path
const categorized = inv.map(item => {
  let model = item.relFolder; // ROOT, NEO, SPACE
  let category = '';
  let subcategory = '';
  let cleanName = '';
  let description = '';
  let formatAction = '';

  const f = item.file;

  if (model === 'ROOT') {
    if (f === 'IMG_0836.MOV') {
      category = 'lifestyle / hero';
      subcategory = 'detalles / lifestyle';
      cleanName = 'public/videos/lifestyle/lifestyle-cutting-fruit-sea.mp4';
      description = 'Detalle de cocina frente al mar (cortando fruta fresca con vistas panorámicas a la costa).';
      formatAction = 'MOV -> MP4 (H.264, web faststart, escalado/comprimido)';
    } else if (f === 'IMG_0853.MOV') {
      category = 'lifestyle / hero';
      subcategory = 'detalles / lifestyle';
      cleanName = 'public/videos/lifestyle/lifestyle-moka-coffee-sea.mp4';
      description = 'Momento café moka por la mañana con vistas abiertas al mar desde el interior de la furgoneta.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1037.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (salón)';
      cleanName = 'public/videos/campers/neo/neo-interior-dining-table-wine.mp4';
      description = 'Ambiente interior acogedor en salón comedor NEO con mesa de madera, copa de vino y flores silvestres.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1047.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (salón / cabina)';
      cleanName = 'public/videos/campers/neo/neo-interior-tour-panoramic.mp4';
      description = 'Toma panorámica interior mostrando la distribución del salón, mesa de roble y acabados premium.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1085.MOV') {
      category = 'lifestyle';
      subcategory = 'conducción / roadtrip';
      cleanName = 'public/videos/lifestyle/lifestyle-roadtrip-window-driving.mp4';
      description = 'Experiencia de ruta: plano subjetivo conduciendo a través de la ventanilla con paisaje mediterráneo.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1572.MOV') {
      category = 'lifestyle';
      subcategory = 'interior / lifestyle';
      cleanName = 'public/videos/lifestyle/lifestyle-relax-window-view.mp4';
      description = 'Atardecer/relax contemplando el paisaje natural a través del ventanal lateral.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1573.MOV') {
      category = 'lifestyle';
      subcategory = 'interior / lifestyle';
      cleanName = 'public/videos/lifestyle/lifestyle-sunset-glance.mp4';
      description = 'Clip corto de luz dorada en cabina con brisa y vistas a la naturaleza.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_1646.HEIC') {
      category = 'hero / lifestyle';
      subcategory = 'lifestyle / salón';
      cleanName = 'public/images/hero/hero-breakfast-sea-horizon.webp';
      description = 'Foto icónica de portada/hero: viajero desayunando en el salón trasero con las puertas dobles abiertas hacia el mar azul.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_1935.PNG') {
      category = 'campers/neo';
      subcategory = 'interior (salón)';
      cleanName = 'public/images/campers/neo/interior/neo-salon-daylight.webp';
      description = 'Salón trasero con tapicería gris y mesa central en madera de roble iluminada por luz natural.';
      formatAction = 'PNG -> WebP (q=85) optimizado';
    } else if (f === 'IMG_1936.PNG') {
      category = 'campers/neo';
      subcategory = 'detalles / garaje';
      cleanName = 'public/images/campers/neo/details/neo-garage-bike-storage.webp';
      description = 'Gran maletero/garaje trasero modular con bicicleta de gravel asegurada en el compartimento inferior.';
      formatAction = 'PNG -> WebP (q=85) optimizado';
    } else if (f === 'IMG_1956.PNG') {
      category = 'campers/neo';
      subcategory = 'exterior';
      cleanName = 'public/images/campers/neo/exterior/neo-exterior-front-three-quarter.webp';
      description = 'Exterior 3/4 frontal de la Fiat Ducato en gris campovolo con lunas tintadas y diseño moderno.';
      formatAction = 'PNG -> WebP (q=85) optimizado';
    } else if (f === 'IMG_2005.mov') {
      category = 'campers/neo';
      subcategory = 'detalles / lifestyle';
      cleanName = 'public/videos/campers/neo/neo-garage-loading-bike.mp4';
      description = 'Demostración de funcionalidad: guardando la bicicleta en el garaje trasero bajo la cama.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_2014.MOV') {
      category = 'campers/neo';
      subcategory = 'exterior / lifestyle';
      cleanName = 'public/videos/campers/neo/neo-closing-rear-doors.mp4';
      description = 'Cierre de puertas traseras mostrando el logo y la línea camper lista para la aventura.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    }
  } else if (model === 'NEO') {
    if (f === 'IMG_4790.MOV') {
      category = 'campers/neo';
      subcategory = 'exterior';
      cleanName = 'public/videos/campers/neo/neo-exterior-walkaround-side.mp4';
      description = 'Recorrido exterior en vídeo mostrando lateral derecho, puerta corredera y gráficos Nomade Nation.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4792.MOV') {
      category = 'campers/neo';
      subcategory = 'exterior';
      cleanName = 'public/videos/campers/neo/neo-exterior-rear-view.mp4';
      description = 'Encuadre exterior de las puertas traseras dobles y zaga.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4794.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (cocina / salón)';
      cleanName = 'public/videos/campers/neo/neo-interior-entrance-pan.mp4';
      description = 'Entrada a la furgoneta mostrando mueble de cocina, encimera y perspectiva hacia el salón.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4798.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (baño)';
      cleanName = 'public/videos/campers/neo/neo-interior-bathroom-cabin.mp4';
      description = 'Cabina de baño completa con WC Dometic, ducha integrada, plato con tarima de teca y claraboya.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4800.MOV') {
      category = 'campers/neo';
      subcategory = 'exterior';
      cleanName = 'public/videos/campers/neo/neo-exterior-side-detail.mp4';
      description = 'Detalle de la puerta trasera abierta con ventana abatible.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4801.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (cocina)';
      cleanName = 'public/videos/campers/neo/neo-kitchen-burners-sink.mp4';
      description = 'Detalle de encimera con dos fuegos a gas Dometic con tapa de cristal y fregadero con grifo monomando negro.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4806.MOV') {
      category = 'campers/neo';
      subcategory = 'interior (salón)';
      cleanName = 'public/videos/campers/neo/neo-salon-convertible-space.mp4';
      description = 'Perspectiva del salón convertible y almacenaje superior de altillos con iluminación LED.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4817.MOV') {
      category = 'campers/neo';
      subcategory = 'detalles / acabados';
      cleanName = 'public/videos/campers/neo/neo-details-led-lighting.mp4';
      description = 'Techo de palillería de madera con iluminación LED indirecta integrada y aire acondicionado Dometic.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4821_OK.MOV') {
      category = 'campers/neo';
      subcategory = 'presentación (destacado)';
      cleanName = 'public/videos/campers/neo/neo-highlight-showcase.mp4';
      description = 'Plano de presentación interior premium seleccionado como toma definitiva (toma OK del set de rodaje).';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_4822.MOV') {
      category = 'campers/neo';
      subcategory = 'detalles / lifestyle';
      cleanName = 'public/videos/campers/neo/neo-details-craftsmanship.mp4';
      description = 'Detalles de tapizado, costuras y armarios altos.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5078.HEIC') {
      category = 'campers/neo';
      subcategory = 'interior (cama / salón)';
      cleanName = 'public/images/campers/neo/interior/neo-bed-view-outdoors.webp';
      description = 'Gran cama doble montada con ropa de cama blanca, cojines bordados y vistas a la naturaleza con portón abierto.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5082.HEIC') {
      category = 'campers/neo';
      subcategory = 'interior (cocina / baño)';
      cleanName = 'public/images/campers/neo/interior/neo-kitchen-module-bathroom.webp';
      description = 'Módulo completo de cocina con fogones de cristal, grifo de diseño negro mate y persiana corredera del baño.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5087.HEIC') {
      category = 'campers/neo';
      subcategory = 'interior (salón / techo)';
      cleanName = 'public/images/campers/neo/interior/neo-saloon-table-ceiling.webp';
      description = 'Perspectiva gran angular del salón comedor, mesa central, techo de listones de madera y climatizador de techo.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5088.HEIC') {
      category = 'campers/neo';
      subcategory = 'interior (salón / comedor)';
      cleanName = 'public/images/campers/neo/interior/neo-dining-room-daylight.webp';
      description = 'Salón comedor inundado de sol con vistas al exterior por la puerta corredera abierta.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_6848.HEIC') {
      category = 'hero / lifestyle';
      subcategory = 'exterior / lifestyle';
      cleanName = 'public/images/hero/hero-cliffside-aperitif-sea.webp';
      description = 'Fotografía premium estilo editorial: aperitivo con vermut y sillas de camping junto a la furgoneta al borde de un acantilado sobre el mar.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    }
  } else if (model === 'SPACE') {
    if (f === 'IMG_2177.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (cocina / distribución)';
      cleanName = 'public/images/campers/space/interior/space-kitchen-counter-cabin.webp';
      description = 'Perspectiva interior de la Space mostrando el pasillo central, módulo de cocina y columna técnica.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_2183.HEIC') {
      category = 'campers/space';
      subcategory = 'archivo dañado';
      cleanName = 'N/A (Descartado: cabecera MP4/HEIC corrupta de origen)';
      description = 'Archivo original de cámara con header incompleto (sustituido por IMG_2184 que captura idéntico encuadre con perfecta calidad).';
      formatAction = 'Descartar / Omitir';
    } else if (f === 'IMG_2184.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (salón panorámico)';
      cleanName = 'public/images/campers/space/interior/space-lounge-spacious-daylight.webp';
      description = 'Salón panorámico en U de gran tamaño con enormes cojines, mucha luz natural y acabados cálidos.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_2192.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (cama basculante)';
      cleanName = 'public/images/campers/space/interior/space-electric-drop-down-bed.webp';
      description = 'Innovador sistema de cama eléctrica suspendida del techo bajando sobre el salón con sólo pulsar un botón.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_2197.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (cine / proyector)';
      cleanName = 'public/images/campers/space/interior/space-cinema-projector-lounge.webp';
      description = 'Configuración de cine en salón: pantalla de proyección desplegada desde el techo, dron y portátil de edición sobre la mesa.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_2208.HEIC') {
      category = 'campers/space';
      subcategory = 'detalles / almacenaje';
      cleanName = 'public/images/campers/space/details/space-lounge-storage-camping-gear.webp';
      description = 'Bancos del salón con amplio almacenaje inferior mostrando sillas de camping guardadas ordenadamente.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5782.MOV') {
      category = 'campers/space';
      subcategory = 'interior (cocina)';
      cleanName = 'public/videos/campers/space/space-kitchen-cooktop-details.mp4';
      description = 'Detalle en movimiento de los quemadores a gas de diseño, tabla de corte y fregadero.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5784.MOV') {
      category = 'campers/space';
      subcategory = 'interior (baño / ducha)';
      cleanName = 'public/videos/campers/space/space-bathroom-shower-tour.mp4';
      description = 'Tour en vídeo de la cabina de ducha independiente de la Space con puerta corredera hermética.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5792.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (cama de matrimonio)';
      cleanName = 'public/images/campers/space/interior/space-king-bed-prepared.webp';
      description = 'La cama suspendida bajada por completo a ras de confort, vestida con sábanas y almohadas listas para dormir.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5795.MOV') {
      category = 'campers/space';
      subcategory = 'interior (salón / comedor)';
      cleanName = 'public/videos/campers/space/space-lounge-overview.mp4';
      description = 'Plano general del salón comedor amplio con iluminación cálida.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5844.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (salón panorámico)';
      cleanName = 'public/images/campers/space/interior/space-saloon-rear-doors-open.webp';
      description = 'Salón con puertas traseras abiertas, inundado de luz natural y plantas decorativas en repisas.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5853.MOV') {
      category = 'campers/space';
      subcategory = 'detalles / tecnología';
      cleanName = 'public/videos/campers/space/space-ceiling-ac-lights.mp4';
      description = 'Plano cenital del techo técnico, salidas de aire y luminarias táctiles.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5856.MOV') {
      category = 'campers/space';
      subcategory = 'interior (distribución completa)';
      cleanName = 'public/videos/campers/space/space-walkthrough-entrance.mp4';
      description = 'Recorrido completo desde la entrada hacia el salón pasando por cocina y baño.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5857.MOV') {
      category = 'campers/space';
      subcategory = 'detalles / acabados';
      cleanName = 'public/videos/campers/space/space-woodwork-cabinet-finish.mp4';
      description = 'Detalle de texturas de madera, tiradores embutidos y ensamblajes de alta ebanistería.';
      formatAction = 'MOV -> MP4 (H.264, web faststart)';
    } else if (f === 'IMG_5858.HEIC') {
      category = 'campers/space';
      subcategory = 'detalles / cocina';
      cleanName = 'public/images/campers/space/details/space-faucet-herb-shelf.webp';
      description = 'Primer plano editorial del grifo monomando negro, estante especiero y maceta con planta natural.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    } else if (f === 'IMG_5861.HEIC') {
      category = 'campers/space';
      subcategory = 'interior (salón / cabina)';
      cleanName = 'public/images/campers/space/interior/space-dining-lounge-frontview.webp';
      description = 'Perspectiva del salón hacia los asientos giratorios delanteros.';
      formatAction = 'HEIC -> WebP (q=85) + JPG fallback';
    }
  }

  return {
    ...item,
    model,
    category,
    subcategory,
    cleanName,
    description,
    formatAction
  };
});

fs.writeFileSync('categorized_inventory.json', JSON.stringify(categorized, null, 2));
console.log('Processed and saved categorized_inventory.json');
