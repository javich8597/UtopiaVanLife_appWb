import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  latestDocument,
  latestLicensePhotoNames,
  resolveCustomerDocumentUrls,
  DOCUMENT_PREFIXES,
  DOCUMENT_LIST_OPTIONS,
} from '../lib/admin/documents'

const files = (...names: string[]) => names.map(name => ({ name }))
const stored = (name: string, created_at: string) => ({ name, created_at })

// Nombres como los escribe /api/upload-driver-docs: `<prefijo>_<crypto.randomUUID()>.<ext>`
const UUID_A = '3f2b8c1e-5d4a-4e7b-9c10-0a1b2c3d4e5f'
const UUID_B = '9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d'
const UUID_C = '00000000-0000-4000-8000-000000000001'

describe('Admin: documentos del cliente (nombres antiguos con timestamp)', () => {
  it('no confunde el carnet del titular con el del segundo conductor', () => {
    const list = files('dni_front_100.jpg', 'front_100.jpg', 'second_license_front_100.jpg', 'second_dni_front_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), 'front_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.dniFrontUrl), 'dni_front_100.jpg')
  })

  it('no muestra el DNI como carnet si el carnet no se ha subido', () => {
    const list = files('dni_front_100.jpg', 'dni_back_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), null)
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseBackUrl), null)
  })

  it('elige la subida más reciente por timestamp del nombre', () => {
    const list = files('front_900.jpg', 'front_1000.png', 'back_5.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), 'front_1000.png')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseBackUrl), 'back_5.jpg')
  })
})

describe('Admin: documentos del cliente (nombres reales con UUID)', () => {
  it('encuentra los archivos que guarda la subida actual', () => {
    const list = files(
      `dni_front_${UUID_A}.jpg`,
      `dni_back_${UUID_A}.png`,
      `front_${UUID_A}.jpg`,
      `back_${UUID_A}.heic`,
      `second_license_front_${UUID_A}.jpg`,
    )
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), `front_${UUID_A}.jpg`)
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseBackUrl), `back_${UUID_A}.heic`)
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.dniFrontUrl), `dni_front_${UUID_A}.jpg`)
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.dniBackUrl), `dni_back_${UUID_A}.png`)
  })

  it('elige la más reciente por created_at de Storage, no por el orden del nombre', () => {
    // UUID_B ordena después que UUID_A por nombre, pero se subió antes
    const list = [
      stored(`front_${UUID_B}.jpg`, '2026-10-01T10:00:00.000Z'),
      stored(`front_${UUID_A}.jpg`, '2026-10-05T09:30:00.000Z'),
      stored(`front_${UUID_C}.jpg`, '2026-09-20T08:00:00.000Z'),
    ]
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), `front_${UUID_A}.jpg`)
    assert.equal(latestDocument([...list].reverse(), DOCUMENT_PREFIXES.licenseFrontUrl), `front_${UUID_A}.jpg`)
  })

  it('una subida nueva con UUID gana a una antigua con timestamp en el nombre', () => {
    const list = [
      stored('front_1700000000000.jpg', '2023-11-14T22:13:20.000Z'),
      stored(`front_${UUID_A}.jpg`, '2026-10-05T09:30:00.000Z'),
    ]
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), `front_${UUID_A}.jpg`)
  })

  it('una subida antigua más reciente gana a una nueva más vieja', () => {
    const list = [
      stored('license_front_1700000000000.jpg', '2026-10-06T00:00:00.000Z'),
      stored(`front_${UUID_A}.jpg`, '2026-10-05T09:30:00.000Z'),
    ]
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), 'license_front_1700000000000.jpg')
  })

  it('con fechas iguales o ausentes el resultado no depende del orden de la lista', () => {
    const a = files(`front_${UUID_A}.jpg`, `front_${UUID_B}.jpg`)
    assert.equal(latestDocument(a, DOCUMENT_PREFIXES.licenseFrontUrl), latestDocument([...a].reverse(), DOCUMENT_PREFIXES.licenseFrontUrl))
  })

  it('ignora nombres que solo se parecen', () => {
    const list = files(
      `dni_front_${UUID_A}.jpg`,
      `second_license_front_${UUID_A}.jpg`,
      `front_${UUID_A}`,
      `front_${UUID_A}.jpg.exe`,
      'front_notauuid.jpg',
      `xfront_${UUID_A}.jpg`,
    )
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), null)
  })

  it('la hoja de entrega recibe anverso y reverso del carnet más recientes', () => {
    const list = [
      stored(`front_${UUID_B}.jpg`, '2026-10-01T10:00:00.000Z'),
      stored(`front_${UUID_A}.jpg`, '2026-10-05T09:30:00.000Z'),
      stored(`back_${UUID_A}.jpg`, '2026-10-05T09:31:00.000Z'),
      stored(`dni_front_${UUID_C}.jpg`, '2026-10-06T09:31:00.000Z'),
    ]
    assert.deepEqual(latestLicensePhotoNames(list), [`front_${UUID_A}.jpg`, `back_${UUID_A}.jpg`])
    assert.deepEqual(latestLicensePhotoNames(files(`dni_front_${UUID_A}.jpg`)), [])
  })

  it('resolveCustomerDocumentUrls firma los archivos reales y pide la lista sin el límite por defecto', async () => {
    const calls: { list?: unknown; signed: string[] } = { signed: [] }
    const client = {
      storage: {
        from: () => ({
          list: async (_folder: string, options: unknown) => {
            calls.list = options
            return {
              data: [
                stored(`front_${UUID_B}.jpg`, '2026-10-01T10:00:00.000Z'),
                stored(`front_${UUID_A}.jpg`, '2026-10-05T09:30:00.000Z'),
                stored(`dni_back_${UUID_A}.png`, '2026-10-05T09:30:00.000Z'),
              ],
            }
          },
          createSignedUrl: async (path: string) => {
            calls.signed.push(path)
            return { data: { signedUrl: `https://signed.test/${path}` } }
          },
        }),
      },
    }
    const urls = await resolveCustomerDocumentUrls(client, 'u1')
    assert.equal(urls.licenseFrontUrl, `https://signed.test/u1/front_${UUID_A}.jpg`)
    assert.equal(urls.dniBackUrl, `https://signed.test/u1/dni_back_${UUID_A}.png`)
    assert.equal(urls.licenseBackUrl, null)
    assert.deepEqual(calls.list, DOCUMENT_LIST_OPTIONS)
  })
})
