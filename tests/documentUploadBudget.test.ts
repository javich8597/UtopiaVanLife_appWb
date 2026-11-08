import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    buildEncodeLadder,
    classifyDocument,
    COMFORT_LONG_SIDE,
    FILES_BUDGET_BYTES,
    fitToBudget,
    interpretUploadResponse,
    MAX_REQUEST_BYTES,
    planUploadBudget,
    prepareDocuments,
    scaleToLongSide,
} from '../lib/documentUploadBudget'

const MB = 1_000_000

const file = (name: string, size: number, type = '') => new File([new Uint8Array(size)], name, { type })

describe('Límites de subida frente a Vercel', () => {
    it('el presupuesto de archivos deja margen bajo el límite de la petición, y este bajo los 4,5 MB de Vercel', () => {
        assert.ok(FILES_BUDGET_BYTES <= 3_800_000)
        assert.ok(MAX_REQUEST_BYTES <= 4_500_000)
        assert.ok(MAX_REQUEST_BYTES - FILES_BUDGET_BYTES >= 500_000, 'el multipart y los campos de texto necesitan margen')
    })
})

describe('Tipo de documento', () => {
    it('lo deduce del tipo y, si viene vacío, de la extensión', () => {
        assert.equal(classifyDocument({ name: 'a.jpg', type: 'image/jpeg' }), 'jpeg')
        assert.equal(classifyDocument({ name: 'IMG_1.JPEG', type: '' }), 'jpeg')
        assert.equal(classifyDocument({ name: 'dni.png', type: '' }), 'png')
        assert.equal(classifyDocument({ name: 'IMG_0001.HEIC', type: '' }), 'heic')
        assert.equal(classifyDocument({ name: 'foto.heif', type: 'application/octet-stream' }), 'heic')
        assert.equal(classifyDocument({ name: 'contrato.pdf', type: 'application/pdf' }), 'pdf')
        assert.equal(classifyDocument({ name: 'sin_extension', type: '' }), 'other')
    })
})

describe('Reparto del presupuesto', () => {
    it('cuatro fotos pesadas se reparten el presupuesto a partes iguales', () => {
        const plan = planUploadBudget(Array(4).fill({ size: 8 * MB, kind: 'jpeg' }))

        for (const step of plan) {
            assert.deepEqual(step, { action: 'reduce', budget: Math.floor(FILES_BUDGET_BYTES / 4) })
        }
    })

    it('ocho fotos pesadas caben en 3,8 MB en total', () => {
        const plan = planUploadBudget(Array(8).fill({ size: 6 * MB, kind: 'jpeg' }))
        const total = plan.reduce((sum, step) => sum + (step.action === 'reduce' ? step.budget : 0), 0)

        assert.ok(total <= FILES_BUDGET_BYTES)
    })

    it('si todo cabe ya, no se reduce nada', () => {
        const plan = planUploadBudget([{ size: 900_000, kind: 'jpeg' }, { size: 1_000_000, kind: 'png' }, { size: 500_000, kind: 'pdf' }])

        assert.deepEqual(plan, [{ action: 'keep' }, { action: 'keep' }, { action: 'keep' }])
    })

    it('las fotos pequeñas se quedan como están y dejan margen a las pesadas', () => {
        const plan = planUploadBudget([
            { size: 8 * MB, kind: 'jpeg' },
            { size: 300_000, kind: 'jpeg' },
            { size: 300_000, kind: 'jpeg' },
            { size: 8 * MB, kind: 'jpeg' },
        ])

        assert.deepEqual(plan[1], { action: 'keep' })
        assert.deepEqual(plan[2], { action: 'keep' })
        // 3,8 MB - 0,6 MB = 3,2 MB entre las dos pesadas
        assert.deepEqual(plan[0], { action: 'reduce', budget: 1_600_000 })
        assert.deepEqual(plan[3], { action: 'reduce', budget: 1_600_000 })
    })

    it('el PDF viaja tal cual y su peso se descuenta del resto', () => {
        const plan = planUploadBudget([
            { size: 1_000_000, kind: 'pdf' },
            { size: 8 * MB, kind: 'jpeg' },
            { size: 8 * MB, kind: 'png' },
        ])

        assert.deepEqual(plan[0], { action: 'keep' })
        assert.deepEqual(plan[1], { action: 'reduce', budget: 1_400_000 })
        assert.deepEqual(plan[2], { action: 'reduce', budget: 1_400_000 })
    })

    it('un PDF que ya consume el presupuesto deja a las fotos sin margen', () => {
        const [, photo] = planUploadBudget([{ size: 4 * MB, kind: 'pdf' }, { size: 3 * MB, kind: 'jpeg' }])

        assert.deepEqual(photo, { action: 'reduce', budget: 0 })
    })
})

describe('Pasos de reducción', () => {
    it('baja primero la calidad y no pasa de 1600 px de lado largo hasta agotar los pasos cómodos', () => {
        const ladder = buildEncodeLadder(4032)
        const firstBelowComfort = ladder.findIndex(step => step.maxSide < COMFORT_LONG_SIDE)

        assert.deepEqual(ladder[0], { maxSide: 2400, quality: 0.85 })
        assert.ok(firstBelowComfort > 0)
        assert.ok(ladder.slice(0, firstBelowComfort).every(step => step.maxSide >= COMFORT_LONG_SIDE))
        assert.ok(ladder.slice(firstBelowComfort).every(step => step.maxSide < COMFORT_LONG_SIDE))
        assert.equal(ladder[firstBelowComfort - 1].maxSide, COMFORT_LONG_SIDE)
    })

    it('nunca amplía una foto pequeña ni repite pasos iguales', () => {
        const ladder = buildEncodeLadder(1800)

        assert.ok(ladder.every(step => step.maxSide <= 1800))
        const keys = ladder.map(step => `${step.maxSide}@${step.quality}`)
        assert.equal(new Set(keys).size, keys.length)
    })

    it('limita el lado largo sin deformar ni ampliar', () => {
        assert.deepEqual(scaleToLongSide(4032, 3024, 2000), { width: 2000, height: 1500 })
        assert.deepEqual(scaleToLongSide(3024, 4032, 2000), { width: 1500, height: 2000 })
        assert.deepEqual(scaleToLongSide(1200, 800, 2000), { width: 1200, height: 800 })
    })

    it('se queda con el primer paso que cabe', async () => {
        const sizes: Record<string, number> = { '2400@0.85': 2_000_000, '2400@0.75': 1_200_000, '2400@0.65': 900_000 }
        const tried: string[] = []

        const best = await fitToBudget(1_000_000, buildEncodeLadder(4032), async step => {
            const key = `${step.maxSide}@${step.quality}`
            tried.push(key)
            return { size: sizes[key] ?? 100 }
        })

        assert.deepEqual(tried, ['2400@0.85', '2400@0.75', '2400@0.65'])
        assert.equal(best?.size, 900_000)
    })

    it('si ninguno cabe devuelve el más pequeño, y null si no se pudo codificar', async () => {
        const ladder = buildEncodeLadder(4032)
        let calls = 0

        const smallest = await fitToBudget(10, ladder, async () => ({ size: 1000 - calls++ }))

        assert.equal(calls, ladder.length)
        assert.equal(smallest?.size, 1000 - (ladder.length - 1))
        assert.equal(await fitToBudget(10, ladder, async () => null), null)
    })
})

describe('Preparación del envío', () => {
    // Simula el canvas: cada foto reducida pesa exactamente su presupuesto
    const reducer = (log: Array<{ name: string; budget: number }> = []) => async (original: File, budget: number) => {
        log.push({ name: original.name, budget })
        return new File([new Uint8Array(budget)], original.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }

    it('cuatro fotos de móvil de 6 MB quedan por debajo del presupuesto y del límite de Vercel', async () => {
        const photos = ['dni_a.jpg', 'dni_b.jpg', 'carnet_a.jpg', 'carnet_b.jpg'].map(name => file(name, 6 * MB, 'image/jpeg'))
        const log: Array<{ name: string; budget: number }> = []

        const result = await prepareDocuments(photos, reducer(log))

        assert.ok(result.ok)
        assert.equal(result.files.length, 4)
        assert.ok(result.totalBytes <= FILES_BUDGET_BYTES)
        assert.ok(result.totalBytes < MAX_REQUEST_BYTES)
        assert.equal(log.length, 4)
    })

    it('mantiene el orden y no toca lo que ya cabe', async () => {
        const small = file('pequena.jpg', 200_000, 'image/jpeg')
        const big = file('grande.png', 7 * MB, 'image/png')
        const log: Array<{ name: string; budget: number }> = []

        const result = await prepareDocuments([big, small], reducer(log))

        assert.ok(result.ok)
        assert.equal(result.files[0].name, 'grande.jpg')
        assert.equal(result.files[1], small)
        assert.deepEqual(log, [{ name: 'grande.png', budget: FILES_BUDGET_BYTES - 200_000 }])
    })

    it('si el navegador no puede decodificar un HEIC, viaja tal cual y se cuenta su peso real', async () => {
        const heic = file('IMG_0001.HEIC', 2_000_000)
        const photo = file('dni.jpg', 8 * MB, 'image/jpeg')
        const log: Array<{ name: string; budget: number }> = []

        const result = await prepareDocuments([heic, photo], async (original, budget) => {
            log.push({ name: original.name, budget })
            return original.name.endsWith('.HEIC') ? null : reducer()(original, budget)
        })

        assert.ok(result.ok)
        assert.equal(result.files[0], heic)
        assert.ok(result.totalBytes <= FILES_BUDGET_BYTES)
        assert.equal(log.length, 2)
    })

    it('un HEIC decodificable se comprime igual que un JPEG', async () => {
        const log: Array<{ name: string; budget: number }> = []

        const result = await prepareDocuments([file('IMG_1.heic', 5 * MB, 'image/heic')], reducer(log))

        assert.ok(result.ok)
        assert.equal(result.files[0].type, 'image/jpeg')
        assert.equal(log.length, 1)
    })

    it('los PDF no se reducen: no se llama al reductor', async () => {
        const log: Array<{ name: string; budget: number }> = []

        const result = await prepareDocuments([file('carnet.pdf', 1 * MB, 'application/pdf')], reducer(log))

        assert.ok(result.ok)
        assert.deepEqual(log, [])
    })

    it('rechaza el envío si, tras reducir, el total sigue por encima del presupuesto', async () => {
        const pdfs = [file('a.pdf', 2 * MB, 'application/pdf'), file('b.pdf', 2 * MB, 'application/pdf')]

        const result = await prepareDocuments([...pdfs, file('dni.jpg', 5 * MB, 'image/jpeg')], reducer())

        assert.equal(result.ok, false)
        assert.ok(result.totalBytes > FILES_BUDGET_BYTES)
    })

    it('rechaza si la foto no cabe ni con el último paso', async () => {
        const stubborn = async (original: File) => file('x.jpg', original.size - 1, 'image/jpeg')

        const result = await prepareDocuments([file('a.jpg', 6 * MB, 'image/jpeg')], stubborn)

        assert.equal(result.ok, false)
    })

    it('si la reducción saliera más pesada que el original, se envía el original', async () => {
        const heavier = async (original: File) => file('x.jpg', original.size + 1, 'image/jpeg')
        const original = file('a.png', 4 * MB, 'image/png')

        const result = await prepareDocuments([original], heavier)

        assert.equal(result.ok, false)
        assert.equal(result.totalBytes, 4 * MB)
    })
})

describe('Respuesta de la subida', () => {
    it('un 413 con cuerpo que no es JSON se trata como demasiado grande, sin fallar al parsear', () => {
        assert.deepEqual(interpretUploadResponse(413, 'Request Entity Too Large'), { kind: 'tooLarge' })
        assert.deepEqual(interpretUploadResponse(413, '{"error":"x"}'), { kind: 'tooLarge' })
    })

    it('una página de error o un cuerpo vacío no rompe: error sin mensaje', () => {
        assert.deepEqual(interpretUploadResponse(502, '<html>Bad gateway</html>'), { kind: 'error', message: null })
        assert.deepEqual(interpretUploadResponse(200, ''), { kind: 'error', message: null })
    })

    it('devuelve el mensaje de la ruta cuando falla', () => {
        assert.deepEqual(
            interpretUploadResponse(401, JSON.stringify({ error: 'Entra con el enlace de acceso.' })),
            { kind: 'error', message: 'Entra con el enlace de acceso.' }
        )
        assert.deepEqual(interpretUploadResponse(200, JSON.stringify({ error: 'algo' })), { kind: 'error', message: 'algo' })
    })

    it('un envío correcto devuelve los datos', () => {
        const outcome = interpretUploadResponse<{ verificationStatus: string }>(200, JSON.stringify({ success: true, verificationStatus: 'pending_validation' }))

        assert.equal(outcome.kind, 'ok')
        assert.equal(outcome.kind === 'ok' && outcome.data.verificationStatus, 'pending_validation')
    })
})
