import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as purgePOST } from '../app/api/admin/retention/documents/route'
import {
    BOOKING_IDENTITY_NOT_PURGED,
    BOOKING_LEGAL_DATA_COLUMNS,
    HOLDER_IDENTITY_PREFIXES,
    IDENTITY_IMAGE_RETENTION_DAYS,
    LEGAL_DATA_RETENTION_YEARS,
    SECOND_DRIVER_IDENTITY_PREFIXES,
    addDaysToDay,
    addYearsToDay,
    bookingRetentionPlan,
    holderImagePurgeDecision,
    identityImagePurgeDay,
    imageCandidateCutoffDay,
    legalCandidateCutoffDay,
    legalDataPurgeColumns,
    legalDataPurgePatch,
    legalDataPurgeDay,
    pendingImagePurges,
    pendingLegalPurges,
    redactPricingBreakdown,
    selectIdentityFiles,
} from '../lib/booking/dataRetention'

/**
 * POLÍTICA DE CONSERVACIÓN DE LA DOCUMENTACIÓN DE IDENTIDAD (decisión de Javier, 2026-11-10):
 * «Purgar imágenes de Storage a los 100 días tras la devolución; retener datos legales 3 años por
 * RD 933/2021».
 *
 * Todo con RELOJ CONGELADO (`mock.timers`): un test anclado al reloj de la máquina caduca solo, y
 * aquí los dos plazos son de 100 días y de 3 años.
 *
 * Qué se comprueba: las dos fronteras (el día 100 y el 101, y el tercer año), que el día se mide en
 * Europe/Madrid y no en UTC, las reservas sin `end_date`, sin fechas y canceladas, las copias
 * duplicadas del mismo documento, que la ruta SIMULA por defecto y que ejecutarla dos veces no
 * vuelve a contar nada.
 *
 * Lo que NO prueba: Supabase real, RLS, Storage real, las políticas del bucket `documents` ni que
 * las columnas de la migración 20261110 existan en la base (está PREPARADA, SIN APLICAR).
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'
const B_VIEJA = '11111111-aaaa-4bbb-8ccc-111111111111'
const B_FUTURA = '22222222-aaaa-4bbb-8ccc-222222222222'
const B_SIN_FECHAS = '33333333-aaaa-4bbb-8ccc-333333333333'

/** Devolución el 10 de junio de 2026: +100 días es el 18 de septiembre; +3 años, el 10 de junio de 2029 */
const DEVOLUCION = '2026-06-10'
const DIA_100 = '2026-09-18'
const DIA_3_ANOS = '2029-06-10'

const booking = (extra: Row = {}): Row => ({
    id: B_VIEJA,
    user_id: CLIENTE,
    status: 'completed',
    payment_status: 'paid',
    start_date: '2026-06-03',
    end_date: DEVOLUCION,
    ...extra,
})

const at = (iso: string) => new Date(iso)

describe('Conservación: los dos plazos sobre la misma reserva', () => {
    it('los plazos son constantes con nombre y valen 100 días y 3 años', () => {
        assert.equal(IDENTITY_IMAGE_RETENTION_DAYS, 100)
        assert.equal(LEGAL_DATA_RETENTION_YEARS, 3)
    })

    it('cuenta los dos plazos desde la devolución', () => {
        assert.equal(identityImagePurgeDay(booking()), DIA_100)
        assert.equal(legalDataPurgeDay(booking()), DIA_3_ANOS)
    })

    it('la aritmética de días no se apoya en la zona de la máquina', () => {
        assert.equal(addDaysToDay('2026-06-10', 100), DIA_100)
        assert.equal(addDaysToDay('2026-12-31', 1), '2027-01-01', 'cruza el año')
        assert.equal(addDaysToDay('2026-02-28', 1), '2026-03-01', 'febrero de un año normal')
        assert.equal(addDaysToDay('2024-02-28', 1), '2024-02-29', 'febrero de un año bisiesto')
        assert.equal(addDaysToDay('2026-09-18', -100), '2026-06-10', 'y hacia atrás')
        assert.equal(addDaysToDay('no-es-un-dia', 1), '', 'un día inválido no inventa una fecha')
        assert.equal(addDaysToDay(null, 1), '')
    })

    it('tres años sobre un 29 de febrero ruedan al 1 de marzo: un día MÁS de conservación', () => {
        assert.equal(addYearsToDay('2024-02-29', 3), '2027-03-01')
        assert.equal(legalDataPurgeDay(booking({ end_date: '2024-02-29' })), '2027-03-01')
        assert.equal(addYearsToDay('2026-06-10', -3), '2023-06-10', 'y hacia atrás, para el corte de la consulta')
    })
})

describe('Conservación: la frontera del día 100', () => {
    afterEach(() => mock.timers.reset())
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    it('el día 99 todavía no, el 100 sí y el 101 sigue vencido', () => {
        const row = booking()

        freeze('2026-09-17T10:00:00Z')
        assert.equal(bookingRetentionPlan(row).imageDue, false, 'día 99: se conserva')
        assert.equal(pendingImagePurges([row]).length, 0)

        mock.timers.reset()
        freeze('2026-09-18T10:00:00Z')
        assert.equal(bookingRetentionPlan(row).imageDue, true, 'día 100: se borra')
        assert.equal(pendingImagePurges([row]).length, 1)

        mock.timers.reset()
        freeze('2026-09-19T10:00:00Z')
        assert.equal(bookingRetentionPlan(row).imageDue, true, 'día 101: sigue pendiente de borrar')
    })

    it('la frontera es la medianoche de MADRID, no la de UTC (verano, CEST)', () => {
        const row = booking()

        // 23:30 del día 99 en Madrid: en UTC ya es el día 100, y no debe borrarse
        freeze('2026-09-17T21:30:00Z')
        assert.equal(bookingRetentionPlan(row).imageDue, false)

        // 00:30 del día 100 en Madrid: en UTC sigue siendo el 99, y sí debe borrarse
        mock.timers.reset()
        freeze('2026-09-17T22:30:00Z')
        assert.equal(bookingRetentionPlan(row).imageDue, true)
    })

    it('y también en invierno (CET), con una devolución de agosto', () => {
        // 2026-08-21 + 100 días = 2026-11-29, ya en horario de invierno (+01:00)
        const row = booking({ end_date: '2026-08-21' })
        assert.equal(identityImagePurgeDay(row), '2026-11-29')

        freeze('2026-11-28T22:30:00Z') // 23:30 del 28 en Madrid
        assert.equal(bookingRetentionPlan(row).imageDue, false)

        mock.timers.reset()
        freeze('2026-11-28T23:30:00Z') // 00:30 del 29 en Madrid
        assert.equal(bookingRetentionPlan(row).imageDue, true)
    })
})

describe('Conservación: la frontera de los 3 años', () => {
    afterEach(() => mock.timers.reset())
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    it('el día anterior al tercer aniversario todavía no, y el aniversario sí', () => {
        const row = booking()

        freeze('2029-06-09T10:00:00Z')
        assert.equal(bookingRetentionPlan(row).legalDue, false)
        assert.equal(pendingLegalPurges([row]).length, 0)

        mock.timers.reset()
        freeze('2029-06-10T10:00:00Z')
        assert.equal(bookingRetentionPlan(row).legalDue, true)
        assert.equal(pendingLegalPurges([row]).length, 1)
    })

    it('a los 100 días vencen las imágenes pero NO los datos legales: son dos plazos', () => {
        freeze('2026-09-18T10:00:00Z')
        const plan = bookingRetentionPlan(booking())
        assert.equal(plan.imageDue, true)
        assert.equal(plan.legalDue, false)
        assert.equal(plan.imagePurgeDay, DIA_100)
        assert.equal(plan.legalPurgeDay, DIA_3_ANOS)
    })

    it('los días de corte de la consulta salen de hoy menos cada plazo', () => {
        freeze('2026-09-18T10:00:00Z')
        assert.equal(imageCandidateCutoffDay(), DEVOLUCION)
        assert.equal(legalCandidateCutoffDay(), '2023-09-18')
    })
})

describe('Conservación: reservas raras', () => {
    afterEach(() => mock.timers.reset())
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    it('sin `end_date` se sitúa por la recogida', () => {
        freeze('2026-09-18T10:00:00Z')
        const row = booking({ end_date: null, start_date: DEVOLUCION })
        assert.equal(bookingRetentionPlan(row).returnDay, DEVOLUCION)
        assert.equal(bookingRetentionPlan(row).imagePurgeDay, DIA_100)
        assert.equal(bookingRetentionPlan(row).imageDue, true)
    })

    it('sin ninguna fecha no se purga sola: queda marcada para revisarla a mano', () => {
        freeze('2030-01-01T10:00:00Z')
        const row = booking({ id: B_SIN_FECHAS, start_date: null, end_date: null })
        const plan = bookingRetentionPlan(row)
        assert.equal(plan.blocked, 'no_dates')
        assert.equal(plan.imagePurgeDay, '')
        assert.equal(plan.imageDue, false)
        assert.equal(plan.legalDue, false)
        assert.deepEqual(pendingImagePurges([row]), [])
        assert.deepEqual(pendingLegalPurges([row]), [])
    })

    it('una fila sin id no se purga: no se sabría a qué carpeta pertenece', () => {
        freeze('2030-01-01T10:00:00Z')
        assert.equal(bookingRetentionPlan(booking({ id: null })).blocked, 'no_id')
        assert.deepEqual(pendingImagePurges([booking({ id: null })]), [])
    })

    it('una reserva cancelada también purga SUS fotos: ese viaje no se hizo', () => {
        freeze('2026-09-18T10:00:00Z')
        const row = booking({ status: 'cancelled' })
        assert.equal(bookingRetentionPlan(row).imageDue, true)
        assert.equal(pendingImagePurges([row]).length, 1)
    })

    it('ordena de la devolución más antigua a la más reciente', () => {
        freeze('2030-01-01T10:00:00Z')
        const antigua = booking({ id: B_VIEJA, end_date: '2025-01-10' })
        const reciente = booking({ id: B_FUTURA, end_date: '2026-01-10' })
        assert.deepEqual(pendingImagePurges([reciente, antigua]).map(p => p.bookingId), [B_VIEJA, B_FUTURA])
    })
})

describe('Conservación: la carpeta del titular es de la CUENTA, no de la reserva', () => {
    afterEach(() => mock.timers.reset())
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    it('una reserva viva por delante retiene las fotos del titular aunque otra haya vencido', () => {
        freeze('2026-09-18T10:00:00Z')
        const vencida = booking()
        const futura = booking({ id: B_FUTURA, status: 'confirmed', start_date: '2027-06-01', end_date: '2027-06-08' })

        // La reserva vieja sí tiene su purga vencida...
        assert.equal(bookingRetentionPlan(vencida).imageDue, true)
        // ...pero la carpeta compartida no se toca: el DNI hace falta para la reserva de 2027
        const decision = holderImagePurgeDecision([vencida, futura])
        assert.equal(decision.due, false)
        assert.equal(decision.reason, 'retained')
        assert.equal(decision.purgeDay, '2027-09-16')
    })

    it('cuando han vencido todas las reservas vivas, la carpeta del titular se purga', () => {
        freeze('2027-09-16T10:00:00Z')
        const decision = holderImagePurgeDecision([
            booking(),
            booking({ id: B_FUTURA, status: 'completed', start_date: '2027-06-01', end_date: '2027-06-08' }),
        ])
        assert.equal(decision.due, true)
        assert.equal(decision.reason, 'due')
    })

    it('una reserva CANCELADA no alarga la conservación de la carpeta del titular', () => {
        freeze('2026-09-18T10:00:00Z')
        const viva = booking()
        const cancelada = booking({ id: B_FUTURA, status: 'cancelled', start_date: '2027-06-01', end_date: '2027-06-08' })
        const decision = holderImagePurgeDecision([viva, cancelada])
        assert.equal(decision.due, true, 'la cancelada no cuenta: manda la última reserva VIVA')
        assert.equal(decision.purgeDay, DIA_100)
    })

    it('si la cuenta solo tiene reservas muertas, se usan esas: la carpeta llega a purgarse', () => {
        freeze('2026-09-18T10:00:00Z')
        const decision = holderImagePurgeDecision([booking({ status: 'cancelled' })])
        assert.equal(decision.due, true)
        assert.equal(decision.purgeDay, DIA_100)
    })

    it('una reserva viva sin fechas bloquea la purga del titular en vez de borrar a ciegas', () => {
        freeze('2030-01-01T10:00:00Z')
        const decision = holderImagePurgeDecision([
            booking(),
            booking({ id: B_SIN_FECHAS, status: 'confirmed', start_date: null, end_date: null }),
        ])
        assert.equal(decision.due, false)
        assert.equal(decision.reason, 'undatable_booking')
        assert.equal(decision.purgeDay, '')
    })

    it('sin reservas no se puede situar el plazo', () => {
        freeze('2030-01-01T10:00:00Z')
        assert.deepEqual(holderImagePurgeDecision([]), { purgeDay: '', due: false, reason: 'no_bookings' })
        assert.deepEqual(holderImagePurgeDecision(null), { purgeDay: '', due: false, reason: 'no_bookings' })
    })

    it('no hay ninguna función de purga del PERFIL: ese plazo no está decidido', async () => {
        // `accountLegalPurgeDecision` existía y solo la ejercitaban los tests. Un ayudante exportado
        // que nadie llama parece código vivo y no lo es (hallazgo de `seguridad-auditor`). Cuando
        // Javier decida el plazo de `public.users`, se escribe entonces.
        const modulo = await import('../lib/booking/dataRetention')
        assert.ok(!('accountLegalPurgeDecision' in modulo))
        const fuente = readFileSync('app/api/admin/retention/documents/route.ts', 'utf8')
        assert.doesNotMatch(fuente, /from\('users'\)/, 'la purga no escribe ni lee identidad del perfil')
    })
})

describe('Conservación: qué archivos de Storage se borran', () => {
    const file = (name: string, created_at = '2026-06-01T10:00:00.000Z') => ({ name, created_at })

    it('borra TODAS las copias del mismo documento, no solo la última', () => {
        const files = [
            file('dni_front_11111111-1111-4111-8111-111111111111.jpg', '2026-06-01T10:00:00.000Z'),
            file('dni_front_22222222-2222-4222-8222-222222222222.jpg', '2026-06-02T10:00:00.000Z'),
            file('dni_front_1717171717171.jpg', '2026-05-01T10:00:00.000Z'),
            file('dni_back_33333333-3333-4333-8333-333333333333.png'),
            file('front_44444444-4444-4444-8444-444444444444.jpg'),
            file('back_55555555-5555-4555-8555-555555555555.jpg'),
        ]
        const selection = selectIdentityFiles(files, HOLDER_IDENTITY_PREFIXES)
        assert.equal(selection.purge.length, 6, 'las tres copias del anverso del DNI y los otros tres documentos')
        assert.deepEqual(selection.unknown, [])
        assert.deepEqual(selection.folders, [])
    })

    it('no toca las subcarpetas de reserva ni los nombres que no reconoce', () => {
        const selection = selectIdentityFiles(
            [
                file('dni_front_11111111-1111-4111-8111-111111111111.jpg'),
                { name: B_FUTURA, created_at: null },
                file('notas-del-cliente.txt'),
                file('dni_front.jpg'), // sin sufijo: no es un nombre que escriba la subida
            ],
            HOLDER_IDENTITY_PREFIXES
        )
        assert.deepEqual(selection.purge, ['dni_front_11111111-1111-4111-8111-111111111111.jpg'])
        assert.deepEqual(selection.folders, [B_FUTURA])
        assert.deepEqual(selection.unknown.sort(), ['dni_front.jpg', 'notas-del-cliente.txt'])
    })

    it('los prefijos del 2º conductor no se confunden con los del titular', () => {
        const files = [
            file('dni_front_11111111-1111-4111-8111-111111111111.jpg'),
            file('second_dni_front_22222222-2222-4222-8222-222222222222.jpg'),
            file('second_license_back_33333333-3333-4333-8333-333333333333.jpg'),
        ]
        const soloSegundo = selectIdentityFiles(files, SECOND_DRIVER_IDENTITY_PREFIXES)
        assert.deepEqual(soloSegundo.purge.sort(), [
            'second_dni_front_22222222-2222-4222-8222-222222222222.jpg',
            'second_license_back_33333333-3333-4333-8333-333333333333.jpg',
        ])
        assert.deepEqual(soloSegundo.unknown, ['dni_front_11111111-1111-4111-8111-111111111111.jpg'])

        const soloTitular = selectIdentityFiles(files, HOLDER_IDENTITY_PREFIXES)
        assert.deepEqual(soloTitular.purge, ['dni_front_11111111-1111-4111-8111-111111111111.jpg'])
    })

    it('una carpeta vacía no tiene nada que borrar: es lo que hace idempotente la repetición', () => {
        assert.deepEqual(selectIdentityFiles([], HOLDER_IDENTITY_PREFIXES), { purge: [], folders: [], unknown: [] })
        assert.deepEqual(selectIdentityFiles(null, HOLDER_IDENTITY_PREFIXES), { purge: [], folders: [], unknown: [] })
    })
})

describe('Conservación: qué columnas son datos del RD 933/2021', () => {
    it('vacía la identidad del registro de viajeros y deja los datos de la operación', () => {
        const row = booking({
            customer_name: 'Ana Pérez',
            customer_email: 'ana@example.com',
            customer_phone: '600000000',
            customer_dni: '12345678Z',
            customer_address: 'Calle Mayor 1, 07001 Palma',
            passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
            total_price: 1200,
            notes: '[SES.HOSPEDAJES ENVIADO: UVL-NEO-0306-1006]',
        })
        const patch = legalDataPurgePatch(row)
        assert.deepEqual(patch, {
            customer_name: null,
            customer_email: null,
            customer_phone: null,
            customer_dni: null,
            // La dirección del viajero es obligatoria en el XML del RD 933/2021 y la escribe el checkout
            customer_address: null,
            passengers: [],
        })
        assert.ok(!('total_price' in patch), 'el importe es contabilidad, no identidad')
        assert.ok(!('notes' in patch), 'la constancia del envío al Ministerio no identifica a nadie')
        assert.ok(!('start_date' in patch) && !('end_date' in patch), 'las fechas se quedan')
    })

    it('no inventa columnas que la base aún no tiene (migración 20261108 sin aplicar)', () => {
        const patch = legalDataPurgePatch(booking({ customer_name: 'Ana Pérez' }))
        assert.deepEqual(Object.keys(patch), ['customer_name'])
        for (const column of BOOKING_LEGAL_DATA_COLUMNS) {
            if (column === 'customer_name') continue
            assert.ok(!(column in patch), `${column} no está en la fila: no se escribe`)
        }
    })

    it('con las columnas del 2º conductor aplicadas, también las vacía', () => {
        const patch = legalDataPurgePatch(booking({
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
            second_driver_license: 'B-99',
            second_driver_birth_date: '1985-01-01',
            second_driver_license_date: '2010-01-01',
        }))
        assert.deepEqual(Object.keys(patch).sort(), [
            'second_driver_birth_date', 'second_driver_dni', 'second_driver_license',
            'second_driver_license_date', 'second_driver_name',
        ])
        assert.ok(!('has_second_driver' in patch), 'que hubo 2º conductor es un dato de la operación: no identifica a nadie')
    })

    it('la segunda pasada no tiene nada que borrar: idempotente', () => {
        const row = booking({ customer_name: 'Ana Pérez', passengers: [{ fullName: 'Luis' }] })
        const patch = legalDataPurgePatch(row)
        assert.equal(Object.keys(patch).length, 2)
        Object.assign(row, patch)
        assert.deepEqual(legalDataPurgePatch(row), {}, 'ya está vacío')
        assert.deepEqual(legalDataPurgeColumns(row), [])
    })

    it('redacta las fichas de dentro de pricing_breakdown sin tocar ningún importe', () => {
        const breakdown = {
            total: 1200,
            secondDriver: true,
            secondDriverSupplement: 35,
            passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
        }
        const redacted = redactPricingBreakdown(breakdown)
        assert.deepEqual(redacted, { total: 1200, secondDriver: true, secondDriverSupplement: 35 })
        assert.equal(redactPricingBreakdown({ total: 1200 }), null, 'sin fichas no hay nada que redactar')
        assert.equal(redactPricingBreakdown(null), null)

        const patch = legalDataPurgePatch(booking({ pricing_breakdown: breakdown }))
        assert.deepEqual(patch.pricing_breakdown, { total: 1200, secondDriver: true, secondDriverSupplement: 35 })
        assert.equal((breakdown.passengers || []).length, 1, 'no muta el original')
    })

    it('la firma y el PDF del contrato NO se purgan: queda dicho y pendiente de Javier', () => {
        assert.ok(BOOKING_IDENTITY_NOT_PURGED.includes('contract_signature'))
        const patch = legalDataPurgePatch(booking({ contract_signature: 'data:image/png;base64,AAA', contract_pdf_url: 'x' }))
        assert.ok(!('contract_signature' in patch))
        assert.ok(!('contract_pdf_url' in patch))
    })
})

describe('Ruta /api/admin/retention/documents', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }

    /** Columnas de constancia de la migración 20261110, para simular la base ya migrada */
    const audit = { identity_images_purged_at: null, identity_images_purged_count: null, legal_data_purged_at: null }

    const vieja = (extra: Row = {}): Row => ({
        id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION,
        customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_phone: '600000000',
        customer_dni: '12345678Z', customer_address: 'Calle Mayor 1, 07001 Palma',
        passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
        total_price: 1200, ...audit, ...extra,
    })

    const FOTOS_RESERVA = [
        `${CLIENTE}/${B_VIEJA}/second_dni_front_11111111-1111-4111-8111-111111111111.jpg`,
        `${CLIENTE}/${B_VIEJA}/second_dni_front_22222222-2222-4222-8222-222222222222.jpg`,
        `${CLIENTE}/${B_VIEJA}/second_license_front_33333333-3333-4333-8333-333333333333.jpg`,
    ]
    const FOTOS_TITULAR = [
        `${CLIENTE}/dni_front_44444444-4444-4444-8444-444444444444.jpg`,
        `${CLIENTE}/dni_back_55555555-5555-4555-8555-555555555555.jpg`,
        // Subida antigua, suelta en la carpeta del cliente (anterior a la carpeta por reserva)
        `${CLIENTE}/second_dni_back_66666666-6666-4666-8666-666666666666.jpg`,
    ]
    const AJENA = [`${OTRO}/dni_front_77777777-7777-4777-8777-777777777777.jpg`]

    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }, { id: OTRO, role: 'customer' }],
            bookings: [vieja()],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA])
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as any }
    }
    const row = () => fake.tables.bookings.find(b => b.id === B_VIEJA)!

    it('sin sesión responde 401 y no borra nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.setSession(null)
        const res = await send()
        assert.equal(res.status, 401)
        assert.equal(fake.storagePaths('documents').length, 7)
    })

    it('con sesión de cliente responde 403', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.setSession({ id: CLIENTE, email: 'ana@example.com', app_metadata: {}, user_metadata: {} })
        const res = await send({ confirm: true })
        assert.equal(res.status, 403)
        assert.equal(fake.storagePaths('documents').length, 7)
    })

    it('sin clave de servicio válida responde 503 y no borra nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        process.env.SUPABASE_SERVICE_ROLE_KEY = ''
        const res = await send({ confirm: true })
        assert.equal(res.status, 503)
        assert.match(res.json.error, /acceso privilegiado/)
        assert.equal(fake.storagePaths('documents').length, 7)
    })

    it('por defecto SIMULA: dice qué borraría y no borra nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'simulacion')
        assert.equal(res.json.policy.imageRetentionDays, 100)
        assert.equal(res.json.policy.legalRetentionYears, 3)
        assert.equal(res.json.policy.today, '2026-09-18')

        // Las tres copias de la reserva y las tres del titular (incluida la suelta antigua)
        assert.equal(res.json.summary.files, 6, JSON.stringify(res.json.folders))
        assert.equal(res.json.summary.columns, 0, 'los 3 años no han pasado')

        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
        assert.equal(fake.requests.filter(r => r.method === 'DELETE').length, 0, 'ninguna petición de borrado')
        assert.deepEqual(fake.writesTo('bookings'), [], 'ni una escritura en la reserva')
        assert.match(res.json.hint, /confirm/)
    })

    it('con confirm borra las fotos, deja constancia en la reserva y registra la ejecución', async () => {
        freeze('2026-09-18T10:00:00Z')
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'purga')
        assert.equal(res.json.summary.files, 6)
        assert.equal(res.json.logged, true)

        assert.deepEqual(fake.storagePaths('documents'), AJENA, 'solo quedan las fotos del otro cliente')

        const saved = row()
        assert.equal(saved.identity_images_purged_at, '2026-09-18T10:00:00.000Z')
        assert.equal(saved.identity_images_purged_count, 3, 'las de la carpeta de ESA reserva')
        assert.equal(saved.legal_data_purged_at, null, 'los datos legales siguen dentro de plazo')
        assert.equal(saved.customer_dni, '12345678Z', 'y por tanto no se han borrado')

        const [log] = fake.tables.retention_purge_log
        assert.ok(log, 'queda una fila de constancia')
        assert.equal(log.ran_by, ADMIN_ID)
        assert.equal(log.policy_day, '2026-09-18')
        assert.equal(log.image_retention_days, 100)
        assert.equal(log.legal_retention_years, 3)
        assert.equal(log.files_deleted, 6)
        assert.ok(Array.isArray(log.detail) && log.detail.length === 2, 'la carpeta de la reserva y la del titular')
        assert.ok(JSON.stringify(log.detail).includes('second_dni_front_11111111'), 'consta QUÉ se purgó')
        assert.ok(!JSON.stringify(log.detail).includes('12345678Z'), 'y nunca el valor de un dato personal')
    })

    it('ejecutarla dos veces no falla ni vuelve a contar lo ya purgado', async () => {
        freeze('2026-09-18T10:00:00Z')
        const primera = await send({ confirm: true })
        assert.equal(primera.json.summary.files, 6)

        const segunda = await send({ confirm: true })
        assert.equal(segunda.status, 200)
        assert.equal(segunda.json.summary.files, 0, 'ya no hay archivos que borrar')
        assert.equal(segunda.json.summary.columns, 0)
        assert.equal(segunda.json.logged, false, 'no hay nada que registrar')
        assert.equal(segunda.json.logWarning, undefined, 'y eso no es un fallo que avisar')
        assert.equal(fake.tables.retention_purge_log.length, 1, 'una sola fila de constancia')
        assert.deepEqual(fake.storagePaths('documents'), AJENA)
    })

    it('no borra las fotos del titular si la cuenta tiene una reserva viva por delante', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.tables.bookings.push({
            id: B_FUTURA, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid',
            start_date: '2027-06-01', end_date: '2027-06-08', ...audit,
        })

        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.summary.files, 3, 'solo las de la carpeta de la reserva vencida')
        const [holder] = res.json.holders
        assert.equal(holder.due, false)
        assert.equal(holder.reason, 'retained')
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('a los 3 años borra los datos del registro de viajeros y conserva los de la operación', async () => {
        freeze('2029-06-10T10:00:00Z')
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.summary.columns, 6)
        assert.deepEqual(res.json.legal[0].columns, [
            'customer_address', 'customer_dni', 'customer_email', 'customer_name', 'customer_phone', 'passengers',
        ])

        const saved = row()
        assert.equal(saved.customer_name, null)
        assert.equal(saved.customer_dni, null)
        assert.equal(saved.customer_address, null)
        assert.deepEqual(saved.passengers, [])
        assert.equal(saved.total_price, 1200, 'el importe se queda')
        assert.equal(saved.start_date, '2026-06-03', 'y las fechas también')
        assert.equal(saved.legal_data_purged_at, '2029-06-10T10:00:00.000Z')
    })

    it('una reserva dentro de plazo no aparece: no es candidata', async () => {
        freeze('2026-06-20T10:00:00Z')
        const res = await send()
        assert.equal(res.json.reviewed, 0)
        assert.equal(res.json.summary.files, 0)
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('una reserva sin fechas se informa como pendiente de revisar a mano, no se purga', async () => {
        freeze('2030-01-01T10:00:00Z')
        fake.tables.bookings.push({
            id: B_SIN_FECHAS, user_id: OTRO, status: 'confirmed', start_date: null, end_date: null, ...audit,
        })
        const res = await send({ bookingId: B_SIN_FECHAS, confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.summary.files, 0)
        assert.deepEqual(res.json.skipped.map((s: any) => s.reason), ['no_dates'])
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('un fallo de Storage no se toma por «carpeta vacía»: no borra y lo dice', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.failures.table = 'storage'
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.summary.files, 0)
        assert.ok(res.json.folders.every((f: any) => f.unreadable), JSON.stringify(res.json.folders))
        assert.equal(fake.storagePaths('documents').length, 7, 'no se borró nada')
    })

    /**
     * Antes este test fijaba lo contrario («la purga se hace igual» y solo avisa). Era el fallo
     * grave que señaló `seguridad-auditor`: con la migración sin aplicar, el `storage.remove` se
     * ejecutaba, el sello se saltaba y el registro fallaba con un `console.error`, así que se
     * borraban fotos de DNI y carnet para siempre sin ningún rastro. Storage no tiene papelera.
     */
    it('sin las columnas de constancia responde 409 y NO borra nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.tables.bookings = [{
            id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
            start_date: '2026-06-03', end_date: DEVOLUCION, customer_name: 'Ana Pérez',
        }]
        const res = await send({ confirm: true })

        assert.equal(res.status, 409)
        assert.deepEqual(res.json.missing, [
            'bookings.identity_images_purged_at',
            'bookings.identity_images_purged_count',
            'bookings.legal_data_purged_at',
        ])
        assert.equal(res.json.migration, 'supabase/migrations/20261110_document_retention_policy.sql')
        assert.match(res.json.error, /No se ha borrado nada/)
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
        assert.equal(fake.requests.filter(r => r.method === 'DELETE').length, 0)
        assert.deepEqual(fake.writesTo('bookings'), [])
    })

    it('sin la tabla del registro también responde 409: purgar sin poder registrarlo no vale', async () => {
        freeze('2026-09-18T10:00:00Z')
        // La tabla que no existe se simula haciendo fallar su lectura: es lo que responde PostgREST
        fake.failures.table = 'retention_purge_log'
        fake.failures.method = 'GET'

        const res = await send({ confirm: true })
        assert.equal(res.status, 409)
        assert.deepEqual(res.json.missing, ['la tabla retention_purge_log'])
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('la simulación avisa de que un confirm se rechazaría, sin tocar nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.failures.table = 'retention_purge_log'
        fake.failures.method = 'GET'

        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'simulacion')
        assert.equal(res.json.schema.ready, false)
        assert.match(res.json.hint, /409/)
        assert.match(res.json.hint, /20261110_document_retention_policy\.sql/)
        assert.equal(res.json.summary.files, 6, 'y sigue diciendo qué borraría')
    })

    it('con la constancia aplicada, una base lista no avisa de nada', async () => {
        freeze('2026-09-18T10:00:00Z')
        const res = await send()
        assert.deepEqual(res.json.schema, { ready: true, verified: true, missing: [] })
    })

    /* -------------------------------------------------------------- */
    /* Borrado a medias: lo que sí se borró tiene que constar          */
    /* -------------------------------------------------------------- */

    it('si una tanda de borrado falla, lo borrado en las anteriores se cuenta y se registra', async () => {
        freeze('2026-09-18T10:00:00Z')
        // 150 copias en la carpeta de la reserva: dos tandas de 100 y 50
        const muchas = Array.from({ length: 150 }, (_, i) =>
            `${CLIENTE}/${B_VIEJA}/second_dni_front_${String(i).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`)
        fake.seedStorage('documents', muchas)

        const instalado = globalThis.fetch
        let tandas = 0
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const req = input instanceof Request ? input : new Request(input, init)
            if (req.method === 'DELETE' && new URL(req.url).pathname.startsWith('/storage/v1/object/')) {
                tandas++
                if (tandas === 2) {
                    return new Response(JSON.stringify({ statusCode: '500', error: 'fallo', message: 'la tanda 2 cae' }),
                        { status: 500, headers: { 'content-type': 'application/json' } })
                }
            }
            return instalado(req)
        }) as typeof fetch

        const res = await send({ confirm: true })
        globalThis.fetch = instalado

        assert.equal(res.status, 200)
        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.ok(carpeta.error, 'la respuesta dice que la carpeta falló')
        assert.equal(carpeta.deleted, 100, 'y cuenta exactamente la tanda que salió bien')

        const quedan = fake.storagePaths('documents')
        const idas = [...muchas, ...FOTOS_RESERVA, ...FOTOS_TITULAR].filter(p => !quedan.includes(p))
        // 100 de la primera tanda de la reserva (la segunda cae) y las 3 del titular, en su carpeta
        assert.equal(idas.length, 103, 'solo la primera tanda de la reserva, más la carpeta del titular')

        // Lo que de verdad se borró consta, archivo por archivo
        const [log] = fake.tables.retention_purge_log
        assert.ok(log, 'hay constancia de la ejecución a medias')
        const registradas = (log.detail as any[]).flatMap(entry => entry.items as string[])
        assert.deepEqual(registradas.sort(), [...idas].sort(),
            'todas las rutas borradas de verdad están en el registro, y solo esas')
        assert.equal(res.json.summary.files, 103, 'y el resumen cuenta lo que se borró, no menos')

        // La carpeta falló, así que la reserva NO se sella: queda pendiente para el siguiente barrido
        assert.equal(row().identity_images_purged_at, null)
    })

    /* -------------------------------------------------------------- */
    /* La purga termina el trabajo                                     */
    /* -------------------------------------------------------------- */

    it('cada plazo tiene su propia consulta, ordenada y sin lo ya purgado', async () => {
        freeze('2026-09-18T10:00:00Z')
        await send()
        const consultas = fake.requests.filter(r => r.path === '/rest/v1/bookings' && r.method === 'GET')
        const candidatas = consultas.filter(r => r.query.get('order'))
        assert.equal(candidatas.length, 4, 'imágenes y datos legales, cada uno con y sin end_date')
        for (const consulta of candidatas) {
            assert.equal(consulta.query.get('order'), 'end_date.asc,id.asc', 'orden estable: sin él, lo que se revisa no es lo que se borra')
            assert.equal(consulta.query.get('limit'), '50')
        }
        assert.equal(candidatas.filter(c => c.query.get('identity_images_purged_at') === 'is.null').length, 2)
        assert.equal(candidatas.filter(c => c.query.get('legal_data_purged_at') === 'is.null').length, 2)
    })

    it('con más candidatas de 100 días que el tope, los datos legales se purgan igual', async () => {
        freeze('2029-06-10T10:00:00Z')
        // 60 reservas pasadas de los 100 días y, aparte, la de 3 años
        fake.tables.bookings = Array.from({ length: 60 }, (_, i) => ({
            id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`,
            user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2029-01-10', end_date: '2029-01-17', ...audit,
        }))
        fake.tables.bookings.push(vieja())

        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.truncated, true, 'avisa de que se ha quedado corta en imágenes')
        assert.match(res.json.truncatedWarning, /truncated/)
        assert.equal(res.json.summary.columns, 6, 'y los datos legales se purgan aunque el tope de imágenes se agote')
        assert.equal(row().customer_dni, null)
    })

    it('lo ya purgado no vuelve a salir de candidato', async () => {
        freeze('2026-09-18T10:00:00Z')
        await send({ confirm: true })
        assert.ok(row().identity_images_purged_at, 'queda sellada')

        fake.requests.length = 0
        const segunda = await send()
        assert.equal(segunda.json.reviewed, 0, 'ya no es candidata de imágenes')
        assert.deepEqual(segunda.json.folders, [])
    })

    it('sella la reserva aunque no hubiera nada que borrar: «revisada y sin nada» no es «sin revisar»', async () => {
        freeze('2026-09-18T10:00:00Z')
        // Una reserva vencida de OTRO cliente, sin ninguna carpeta en Storage
        fake.tables.bookings.push({
            id: B_FUTURA, user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2026-06-03', end_date: DEVOLUCION, ...audit,
        })
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)

        const sinNada = fake.tables.bookings.find(b => b.id === B_FUTURA)!
        assert.ok(sinNada.identity_images_purged_at, 'se sella igual')
        assert.equal(sinNada.identity_images_purged_count, 0, 'con cero archivos')
        // La foto del otro cliente sigue ahí: su carpeta de cuenta no estaba vencida
        assert.equal(res.json.holders.find((h: any) => h.userId === OTRO)?.due, true)
    })

    it('no sella si la cuenta tiene una reserva viva sin fechas: queda pendiente de revisar', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.tables.bookings.push({
            id: B_FUTURA, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid',
            start_date: null, end_date: null, ...audit,
        })
        const res = await send({ confirm: true })
        assert.equal(res.json.holders[0].reason, 'undatable_booking')
        assert.equal(row().identity_images_purged_at, null, 'no se sella: la cuenta no está resuelta')
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)))
    })

    /* -------------------------------------------------------------- */
    /* Reservas sin cuenta y el alcance del modo dirigido              */
    /* -------------------------------------------------------------- */

    it('una reserva sin `user_id` se informa en `skipped` con motivo `no_user`', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.tables.bookings = [vieja({ user_id: null })]
        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.reviewed, 1)
        assert.deepEqual(res.json.folders, [], 'no se mira ninguna carpeta')
        assert.deepEqual(res.json.skipped.map((s: any) => s.reason), ['no_user'])
        assert.match(res.json.skipped[0].detail, /no tiene cliente/)
    })

    it('un `user_id` que no puede ser carpeta también se informa, no se descarta en silencio', async () => {
        freeze('2026-09-18T10:00:00Z')
        fake.tables.bookings = [vieja({ user_id: `${OTRO}/..` })]
        const res = await send({ confirm: true })
        assert.deepEqual(res.json.skipped.map((s: any) => s.reason), ['no_user'])
        assert.deepEqual(res.json.folders, [])
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('pedir una reserva por `bookingId` NO arrastra la carpeta de cuenta del titular', async () => {
        freeze('2026-09-18T10:00:00Z')
        const res = await send({ bookingId: B_VIEJA, confirm: true })

        assert.equal(res.status, 200)
        assert.equal(res.json.summary.files, 3, 'solo la subcarpeta de esa reserva')
        assert.deepEqual(res.json.holders, [], 'no se decide nada sobre la carpeta de cuenta')
        assert.match(res.json.policy.holderFoldersExcluded, /userId/)
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)), 'el DNI del titular sigue ahí')
        assert.equal(row().identity_images_purged_at, null, 'y la reserva no se sella: falta mirar la cuenta')
    })

    it('con `bookingId` y `userId` juntos sí se incluye la carpeta de cuenta', async () => {
        freeze('2026-09-18T10:00:00Z')
        const res = await send({ bookingId: B_VIEJA, userId: CLIENTE, confirm: true })
        assert.equal(res.json.summary.files, 6)
        assert.equal(res.json.holders.length, 1)
        assert.ok(!res.json.policy.holderFoldersExcluded)
        assert.deepEqual(fake.storagePaths('documents'), [...AJENA].sort())
    })

    /* -------------------------------------------------------------- */
    /* Lo que no se reconoce: ni se borra ni se repite su nombre       */
    /* -------------------------------------------------------------- */

    it('no repite el nombre completo de un archivo que no reconoce', async () => {
        freeze('2026-09-18T10:00:00Z')
        // Un archivo subido a mano puede llevar datos personales en el propio nombre
        fake.seedStorage('documents', [`${CLIENTE}/dni-de-ana-perez-garcia.jpg`])
        const res = await send()

        const titular = res.json.folders.find((f: any) => f.scope === 'holder_images')
        assert.equal(titular.unknown, 1, 'se dice cuántos hay')
        assert.deepEqual(titular.unknownSample, ['dni-de-ana…'], 'y el nombre solo recortado')
        const texto = JSON.stringify(res.json)
        assert.ok(!texto.includes('ana-perez-garcia'), 'el nombre completo no aparece en la respuesta')
    })

    /* -------------------------------------------------------------- */
    /* El registro guarda el alcance                                   */
    /* -------------------------------------------------------------- */

    it('el registro guarda con qué alcance se lanzó la purga', async () => {
        freeze('2026-09-18T10:00:00Z')
        await send({ confirm: true, limit: 7 })
        const [log] = fake.tables.retention_purge_log
        assert.equal(log.scope_booking_id, null)
        assert.equal(log.scope_user_id, null)
        assert.equal(log.scope_limit, 7)
        assert.equal(log.scope_truncated, false)
        assert.equal(log.candidates_reviewed, 1)
        assert.equal(log.holder_folders_included, true)
    })

    it('y el alcance dirigido queda registrado como tal', async () => {
        freeze('2026-09-18T10:00:00Z')
        await send({ bookingId: B_VIEJA, confirm: true })
        const [log] = fake.tables.retention_purge_log
        assert.equal(log.scope_booking_id, B_VIEJA)
        assert.equal(log.holder_folders_included, false)
    })
})

describe('Migración 20261110: lo que tiene que decir antes de aplicarse', () => {
    const sql = readFileSync('supabase/migrations/20261110_document_retention_policy.sql', 'utf8')

    it('avisa en la primera línea de que está PREPARADA, SIN APLICAR', () => {
        assert.match(sql.split('\n')[0], /PREPARADA, SIN APLICAR/)
    })

    it('recoge la decisión de Javier con sus dos plazos', () => {
        assert.match(sql, /100 días tras la devolución/)
        assert.match(sql, /3 años por\s*\n?--\s*RD 933\/2021|3 años/)
    })

    it('es idempotente y protege las columnas de constancia frente al cliente', () => {
        assert.match(sql, /ADD COLUMN IF NOT EXISTS identity_images_purged_at/)
        assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.retention_purge_log/)
        assert.match(sql, /DROP POLICY IF EXISTS/)
        assert.match(sql, /DROP TRIGGER IF EXISTS protect_bookings_retention_columns/)
        assert.match(sql, /CREATE TRIGGER protect_bookings_retention_columns/)
    })

    it('toda función SECURITY DEFINER fija su search_path', () => {
        const definers = sql.split('CREATE OR REPLACE FUNCTION').slice(1)
        assert.ok(definers.length > 0)
        for (const body of definers) {
            assert.match(body, /SECURITY DEFINER/)
            assert.match(body, /SET search_path = public/)
        }
    })

    it('trae matriz de permisos, comprobación y cómo revertir', () => {
        assert.match(sql, /MATRIZ DE PERMISOS/)
        assert.match(sql, /service role/)
        assert.match(sql, /COMPROBACIÓN \(solo lectura\)/)
        assert.match(sql, /REVERTIR/)
    })

    it('activa RLS en la tabla nueva y solo le da SELECT al administrador', () => {
        const codigo = sql.replace(/^\s*--.*$/gm, '')
        assert.match(sql, /ALTER TABLE public\.retention_purge_log ENABLE ROW LEVEL SECURITY/)
        assert.match(codigo, /CREATE POLICY retention_purge_log_admin_select[\s\S]*?FOR SELECT TO authenticated/)
        // Ni INSERT, ni UPDATE, ni DELETE: solo escribe la purga, con la clave de service role.
        // Con una política de INSERT, un admin podía inventar filas de cumplimiento desde el
        // navegador y atribuir una purga a otra persona (hallazgo de `seguridad-auditor`)
        assert.doesNotMatch(codigo, /FOR INSERT|FOR UPDATE|FOR DELETE/)
        assert.match(codigo, /DROP POLICY IF EXISTS retention_purge_log_admin_insert/, 'y retira la que hubiera')
    })

    it('el sello de purga solo lo puede poner el rol service_role, ni un admin con su sesión', () => {
        const codigo = sql.replace(/^\s*--.*$/gm, '')
        assert.match(codigo, /= 'service_role'/)
        assert.doesNotMatch(codigo, /is_privileged_writer/, 'eximir a todo escritor privilegiado incluiría a cualquier admin')
        assert.match(codigo, /NOT IN \('authenticated', 'anon'\)/, 'una sesión SQL directa sí puede corregir a mano')
    })

    it('el registro guarda el alcance con el que se lanzó la purga', () => {
        for (const column of ['scope_booking_id', 'scope_user_id', 'scope_limit', 'scope_truncated', 'candidates_reviewed', 'holder_folders_included']) {
            assert.match(sql, new RegExp(`\\b${column}\\b`), `falta ${column} en retention_purge_log`)
        }
    })

    it('la comprobación funcional empieza por probar que sin la migración el confirm da 409', () => {
        assert.match(sql, /409/)
        assert.match(sql, /holderFoldersExcluded/, 'y avisa de que el modo dirigido no toca la carpeta de cuenta')
    })
})
