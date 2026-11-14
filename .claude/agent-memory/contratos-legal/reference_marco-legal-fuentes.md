---
name: marco-legal-fuentes
description: Dónde buscar y verificar el marco legal citado (BOE TRLGDCU con offsets útiles, AEPD, EUR-Lex), y qué artículos ya se han comprobado textualmente
metadata:
  type: reference
---

**TRLGDCU (RDL 1/2007)** — texto consolidado en BOE:
`https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555` (ELI: `https://www.boe.es/eli/es/rdlg/2007/11/16/1/con`).
Son ~510.000 caracteres: con WebFetch hay que paginar con `offset`. Tramos útiles comprobados el 2026-11-08:

- `offset: 170000` → artículo 60 (información previa; 60.2.c "precio total, incluidos todos los impuestos y tasas" y "gastos adicionales por servicios accesorios") y artículo 80.1 (80.1.a concreción, claridad y sencillez; 80.1.c buena fe y justo equilibrio).
- `offset: 200000` → artículo 80.2: "Cuando se ejerciten acciones individuales, en caso de duda sobre el sentido de una cláusula prevalecerá la interpretación más favorable al consumidor."
- `offset: 270000` → artículo 103.l): excluye el desistimiento en, entre otros, "alquiler de vehículos" "si los contratos prevén una fecha o un periodo de ejecución específicos".

El propio BOE advierte de que la consolidación es informativa y sin valor jurídico.

**RGPD: EUR-Lex en HTML NO sirve.** `legal-content/ES/TXT/HTML/?uri=CELEX:32016R0679` devuelve una página de 534 caracteres (la carga JavaScript) y `eli/reg/2016/679/oj/spa` solo da la portada del Diario Oficial. Lo que funciona (comprobado el 2026-11-14): descargar el DOUE desde el BOE, `https://www.boe.es/doue/2016/119/L00001-00088.pdf`. WebFetch no lo lee, pero guarda el PDF en disco y su texto se saca sin dependencias: inflar con `zlib` cada bloque `stream…endstream`, leer las cadenas `(...)` de las líneas con `Tj/TJ` y **sumar 29** al código de cada carácter (la fuente EUAlbertina va desplazada; los acentos se pierden, el resto es literal). Ojo: en el texto extraído los títulos salen como `Ar tculo 14`, con espacio.

Artículos verificados textualmente así el 2026-11-14: **12.3** (un mes desde la recepción, prorrogable otros dos, avisando de la prórroga dentro del primer mes), **13.2.a** (plazo de conservación «o, cuando no sea posible, los criterios utilizados para determinar este plazo»), **14** completo (14.2.a plazo; **14.2.f la fuente de los datos**; 14.3.a un mes; 14.5.a ya dispone de la información; **14.5.b** imposible o esfuerzo desproporcionado → «el responsable adoptará medidas adecuadas […] inclusive haciendo pública la información»), **17.1 y 17.3** (b obligación legal, e defensa de reclamaciones).

Otras fuentes comprobadas el 2026-11-14:

- **RD 933/2021** (registro de viajeros), `https://www.boe.es/buscar/act.php?id=BOE-A-2021-17461`: el plazo de conservación es el **art. 5.3**, «tres años a contar desde la finalización del servicio o prestación contratada».
- **Código de Comercio art. 30**, `https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627`: **seis años** de conservación de libros, correspondencia y justificantes, contados desde el último asiento. Es el plazo que manda sobre el contrato firmado.
- **LOPDGDD art. 32** (bloqueo), `https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673`: al suprimir hay que bloquear (identificar y reservar) y solo dejar los datos a disposición de jueces, Ministerio Fiscal y Administraciones durante la prescripción. La página es de 292.611 caracteres: hay que paginar con `offset`.
- **Código Civil art. 1964.2** (prescripción de acciones personales, 5 años): NO verificado. `act.php?id=BOE-A-1889-4763` pagina por libros y no llega al artículo con `offset`; los parámetros `&tn=&p=` dan HTTP 400.

Otras fuentes que hay que citar siempre vigentes, nunca de memoria: AEPD (guía de cookies y criterios de conservación), EUR-Lex (RGPD, eIDAS), BOE (LOPDGDD, LSSI).

**How to apply:** no citar un artículo sin haberlo leído en la fuente en esa sesión; etiquetar como SIN VERIFICAR lo que no se haya podido abrir.
