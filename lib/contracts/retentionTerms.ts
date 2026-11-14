/**
 * PLAZOS DE CONSERVACIÓN: UN SOLO TEXTO PARA EL CONTRATO, EL PDF Y LA PANTALLA DE FIRMA
 *
 * El cliente lee los mismos plazos en cuatro sitios: la política de privacidad
 * (`app/[locale]/legal/privacidad/page.tsx`), el artículo 31 del contrato, el recuadro RGPD del PDF
 * firmado y la pantalla previa a la firma. Decir números distintos en dos de ellos es, además de una
 * incoherencia, una información contradictoria del art. 13.2.a del RGPD. Así que el texto del
 * contrato se escribe UNA vez aquí y lo reusan el motor (`contractEngine`), el PDF y la pantalla.
 *
 * La política mantiene su propia redacción porque habla al cliente en segunda persona ("tu firma")
 * y el contrato en tercera ("el ARRENDATARIO"). Lo que no puede diferir son los NÚMEROS y las NORMAS
 * citadas: eso lo vigila `tests/contracts/politicaPrivacidadConservacion.test.ts`, que compara estos
 * textos con la página y con las constantes de la purga.
 *
 * Decisiones de Javier:
 *   - Imágenes de identidad: 100 días desde la devolución (2026-11-10).
 *   - Registro de viajeros del RD 933/2021: 3 años desde la devolución (art. 5.3 de la norma).
 *   - Contrato firmado y firma: 6 años desde la devolución (2026-11-14), por el plazo de
 *     conservación mercantil del art. 30 del Código de Comercio.
 *   - Ficha de cliente: mientras exista la cuenta; la cuenta solo se borra a petición (2026-11-12).
 *
 * Los números de los dos primeros plazos viven en `lib/booking/dataRetention.ts`
 * (`IDENTITY_IMAGE_RETENTION_DAYS`, `LEGAL_DATA_RETENTION_YEARS`), que es quien los ejecuta. Aquí se
 * repiten como literales a propósito, para no arrastrar el módulo de la purga al bundle del cliente
 * (la pantalla de firma es un componente `'use client'` que llama a `generateContractData`); el test
 * falla si alguna vez dejan de coincidir.
 *
 * AVISO SOBRE LO QUE ESTE TEXTO PROMETE: los 6 años del contrato firmado NO los ejecuta nadie
 * todavía. La purga (`lib/booking/dataRetention.ts` + `app/api/admin/retention/documents`) excluye a
 * propósito `contract_signature`, `contract_pdf_url` y el PDF archivado
 * (`BOOKING_IDENTITY_NOT_PURGED`), y además esa purga no la dispara ninguna tarea. Publicar el plazo
 * es correcto; darlo por cumplido, no.
 */

/** 6 años desde la devolución del vehículo para el contrato firmado y la firma (decisión 2026-11-14) */
export const SIGNED_CONTRACT_RETENTION_YEARS = 6

/** Norma que sostiene el plazo del contrato firmado, citada igual en el contrato y en la política */
export const SIGNED_CONTRACT_RETENTION_SOURCE = 'artículo 30 del Código de Comercio'

/**
 * Los cinco plazos, con las palabras del contrato. El primer párrafo es el encabezado y el resto son
 * viñetas: el PDF las sangra (`paragraph.startsWith('•')`) y la pantalla de firma les pone la clase
 * `csm-bullet`.
 */
export const CONTRACT_RETENTION_PARAGRAPHS: string[] = [
  'Conservación de los datos: cada categoría de datos tiene su propio plazo, contado siempre desde la devolución del vehículo.',
  '• Imágenes de los documentos de identidad: las fotografías del DNI, NIE o pasaporte y del permiso de conducir, tanto del ARRENDATARIO como del segundo conductor autorizado, se eliminan de forma irreversible a los 100 días desde la devolución del vehículo.',
  '• Datos del registro de viajeros: los datos de identificación que el ARRENDADOR está obligado a registrar y comunicar conforme al Real Decreto 933/2021 se conservan 3 años desde la devolución del vehículo, que es el plazo del artículo 5.3 de esa norma, y después se suprimen de la reserva.',
  `• Contrato de alquiler firmado y firma del ARRENDATARIO: se conservan ${SIGNED_CONTRACT_RETENTION_YEARS} años desde la devolución del vehículo, por ser el plazo de conservación de los contratos y sus justificantes que impone el ${SIGNED_CONTRACT_RETENTION_SOURCE}. En el contrato figuran también el nombre y el documento del segundo conductor autorizado, si lo hubo.`,
  '• Facturación y justificantes de pago: se conservan durante los plazos de conservación contable, mercantil y fiscal aplicables, con independencia de que la cuenta de cliente siga existiendo.',
  '• Ficha de cliente y cuenta: los datos del perfil del ARRENDATARIO se conservan mientras exista su cuenta, que se suprime únicamente a petición del propio ARRENDATARIO.',
]

/**
 * La misma información en una línea, para el recuadro RGPD del PDF y de la pantalla de firma
 * (`rgpdText.conservacion`). Los plazos completos están en el artículo 31, que ambos imprimen
 * íntegro; este resumen no puede decir nada distinto.
 */
export const CONTRACT_RETENTION_SUMMARY =
  'Imágenes de los documentos de identidad, 100 días desde la devolución del vehículo; datos del registro de viajeros (RD 933/2021), 3 años; ' +
  `contrato firmado y firma, ${SIGNED_CONTRACT_RETENTION_YEARS} años (${SIGNED_CONTRACT_RETENTION_SOURCE}); facturación, los plazos contables, mercantiles y fiscales aplicables; ` +
  'ficha de cliente, mientras exista la cuenta. El detalle está en el artículo 31 de este contrato.'
