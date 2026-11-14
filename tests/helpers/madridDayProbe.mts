/**
 * Imprime días civiles de Europe/Madrid para unos instantes fijos, usando las funciones del
 * proyecto. No es un test: lo ejecuta `tests/qa_retencionSegundaRonda.test.ts` en procesos hijos con
 * `TZ` distinto, y la salida tiene que ser idéntica en todas las zonas.
 *
 * Si algún día `madridDay` o `addDaysToDay` vuelven a apoyarse en el reloj o la zona de la máquina
 * (`toISOString()`, `getDate()`, `setDate()`), este programa dará salidas distintas según `TZ` y el
 * test se pondrá rojo. No lleva la extensión `.test.ts` a propósito: `npm test` no debe recogerlo.
 */
import { addDaysToDay } from '../../lib/booking/dataRetention'
import { madridDay } from '../../lib/booking/secondDriver'

/** Instantes de riesgo: justo pasada la medianoche de Madrid y alrededor de los cambios de hora */
const INSTANTES = [
    '2026-03-28T23:30:00Z', // 2026-03-29 00:30 Madrid (CET), el día del cambio de primavera
    '2026-03-29T22:30:00Z', // 2026-03-30 00:30 Madrid (CEST), el día siguiente
    '2026-10-24T22:30:00Z', // 2026-10-25 00:30 Madrid (CEST), el día del cambio de otoño
    '2026-10-25T23:30:00Z', // 2026-10-26 00:30 Madrid (CET), el día siguiente
    '2026-07-15T22:30:00Z', // una noche de verano
    '2026-11-12T23:30:00Z', // una noche de invierno
]

const DIAS = [0, 1, 2, 3, 7, 30, 100]

for (const iso of INSTANTES) {
    const hoy = madridDay(new Date(iso))
    const atras = DIAS.map(d => `${d}:${addDaysToDay(hoy, -d)}`).join(' ')
    console.log(`${iso} -> ${hoy} | ${atras}`)
}
