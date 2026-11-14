import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generateContractData, getOfficialContractArticles } from '../../lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '../../lib/contracts/pdfGenerator'
import {
    CONTRACT_RETENTION_PARAGRAPHS,
    CONTRACT_RETENTION_SUMMARY,
    SIGNED_CONTRACT_RETENTION_YEARS,
} from '../../lib/contracts/retentionTerms'
import {
    IDENTITY_IMAGE_RETENTION_DAYS,
    LEGAL_DATA_RETENTION_YEARS,
} from '../../lib/booking/dataRetention'

/**
 * Los plazos de conservación del artículo 31 y del recuadro RGPD del PDF.
 *
 * Antes el artículo 31 decía solo «durante los plazos legales aplicables (fiscales, contables,
 * etc.)», que no es un plazo ni un criterio del art. 13.2.a del RGPD, y el PDF ni siquiera imprimía
 * la línea de conservación aunque el motor la construía. Javier cerró el plazo del contrato firmado
 * el 2026-11-14: 6 años desde la devolución, por el art. 30 del Código de Comercio.
 *
 * Lo que se vigila aquí es que el contrato, su original de `docs/Contract/` y el PDF digan lo mismo,
 * y que los dos plazos que ya ejecuta la purga sigan siendo los de `lib/booking/dataRetention.ts`.
 */

const ORIGINAL = readFileSync(
    new URL('../../docs/Contract/CONTRATO ALQUILER.md', import.meta.url),
    'utf8'
)

const bookingFixture = {
    id: 'book-conservacion-1',
    start_date: '2026-10-03',
    end_date: '2026-10-05',
    total_price: 450,
    camper: { slug: 'neo', name: 'Camper NEO', plate_number: '8291-LKN' },
}

const article31 = () => {
    const article = getOfficialContractArticles().find(a => a.number === 31)
    assert.ok(article, 'el contrato tiene 31 artículos y el 31 es protección de datos')
    return article!
}

describe('conservación en el artículo 31 del contrato', () => {
    it('los números decididos son los que ejecuta (o ejecutará) la purga', () => {
        assert.equal(IDENTITY_IMAGE_RETENTION_DAYS, 100, 'decisión de Javier 2026-11-10')
        assert.equal(LEGAL_DATA_RETENTION_YEARS, 3, 'art. 5.3 RD 933/2021')
        assert.equal(SIGNED_CONTRACT_RETENTION_YEARS, 6, 'decisión de Javier 2026-11-14, art. 30 CCom')
    })

    it('ya no se esconde detrás de «los plazos legales aplicables»', () => {
        const texto = article31().content.join(' ')
        assert.ok(
            !/plazos legales aplicables/i.test(texto),
            'esa fórmula no es un plazo ni un criterio (art. 13.2.a RGPD)'
        )
        assert.ok(!/mientras no se solicite su supresión/i.test(texto))
    })

    it('enumera los cinco plazos con su número y su norma', () => {
        const texto = article31().content.join(' ')
        assert.match(texto, new RegExp(`${IDENTITY_IMAGE_RETENTION_DAYS} días desde la devolución`))
        assert.match(texto, new RegExp(`${LEGAL_DATA_RETENTION_YEARS} años desde la devolución`))
        assert.match(texto, new RegExp(`${SIGNED_CONTRACT_RETENTION_YEARS} años desde la devolución`))
        assert.match(texto, /Real Decreto 933\/2021/)
        assert.match(texto, /art[íi]culo 5\.3/i, 'el plazo de 3 años sale de esa norma')
        assert.match(texto, /art[íi]culo 30 del Código de Comercio/i, 'la razón de los 6 años')
        assert.match(texto, /segundo conductor autorizado/, 'su nombre y documento siguen en el contrato')
        assert.match(texto, /mientras exista su cuenta/, 'la ficha de cliente no caduca sola')
    })

    it('mete los plazos en el articulado, no solo en el resumen RGPD', () => {
        const data = generateContractData(bookingFixture, { full_name: 'Carlos Ruiz', dni_nie: '12345678Z' })
        const art31 = data.articles.find((a: any) => a.number === 31)
        assert.ok(art31, 'el artículo 31 llega al contrato generado')
        for (const paragraph of CONTRACT_RETENTION_PARAGRAPHS) {
            assert.ok(
                art31!.content.includes(paragraph),
                `el artículo 31 generado tiene que incluir: ${paragraph.slice(0, 60)}…`
            )
        }
    })

    it('el original de docs/Contract dice los mismos números y las mismas normas', () => {
        assert.ok(
            !/Durante los plazos legales aplicables/i.test(ORIGINAL),
            'el original es la referencia: si él se queda atrás, el motor y el original discrepan'
        )
        assert.match(ORIGINAL, new RegExp(`${IDENTITY_IMAGE_RETENTION_DAYS} días desde la devolución`))
        assert.match(ORIGINAL, new RegExp(`${LEGAL_DATA_RETENTION_YEARS} años desde la devolución`))
        assert.match(ORIGINAL, new RegExp(`${SIGNED_CONTRACT_RETENTION_YEARS} años desde la devolución`))
        assert.match(ORIGINAL, /art[íi]culo 5\.3/i)
        assert.match(ORIGINAL, /art[íi]culo 30 del Código de Comercio/i)
    })
})

describe('conservación en el recuadro RGPD del PDF', () => {
    it('el resumen de una línea dice el mismo plazo y la misma norma', () => {
        const data = generateContractData(bookingFixture, { full_name: 'Carlos Ruiz', dni_nie: '12345678Z' })
        assert.equal(data.rgpdText.conservacion, CONTRACT_RETENTION_SUMMARY)
        assert.match(data.rgpdText.conservacion, new RegExp(`${SIGNED_CONTRACT_RETENTION_YEARS} años`))
        assert.match(data.rgpdText.conservacion, /Código de Comercio/)
        assert.match(data.rgpdText.conservacion, new RegExp(`${IDENTITY_IMAGE_RETENTION_DAYS} días`))
        assert.ok(
            !/plazos legales aplicables/i.test(data.rgpdText.conservacion),
            'el resumen tampoco puede esconderse detrás de esa fórmula'
        )
    })

    /**
     * El recuadro RGPD del PDF imprimía responsable, finalidad, legitimación, destinatarios y
     * derechos, y se saltaba la conservación: el documento que el cliente firma y descarga no decía
     * cuánto tiempo se guarda nada.
     *
     * Se comprueba con un centinela en lugar del texto real para que el test siga valiendo cuando la
     * redacción cambie: lo que se vigila es que el PDF imprima EL CAMPO.
     */
    it('imprime el campo conservacion en el PDF firmado', async () => {
        const data = generateContractData(bookingFixture, { full_name: 'Carlos Ruiz', dni_nie: '12345678Z' })
        data.rgpdText.conservacion = 'CENTINELACONSERVACION'

        const { buffer } = await generateOfficialContractPdfBlob(data)
        const raw = buffer.toString('latin1')

        assert.ok(
            raw.includes('CENTINELACONSERVACION'),
            'el recuadro RGPD del PDF tiene que imprimir rgpdText.conservacion'
        )
    })

    /**
     * El recuadro tenía altura fija (25 mm) y avanzaba 4.2 mm por entrada contara una línea o tres,
     * así que un texto largo se escribía encima de la entrada siguiente y se salía de la caja. La
     * conservación ocupa tres líneas, y la plantilla editable puede alargar cualquiera de las otras.
     */
    it('un texto de conservación largo no rompe la generación ni se come las entradas siguientes', async () => {
        const data = generateContractData(bookingFixture, { full_name: 'Carlos Ruiz', dni_nie: '12345678Z' })
        data.rgpdText.conservacion = `${'Plazo de conservación detallado por categorías de datos. '.repeat(12)}FINALDELPLAZO`

        const { buffer, doc } = await generateOfficialContractPdfBlob(data)
        const raw = buffer.toString('latin1')

        assert.ok(doc.getNumberOfPages() >= 4, `se esperaban al menos 4 páginas, hubo ${doc.getNumberOfPages()}`)
        assert.ok(raw.includes('FINALDELPLAZO'), 'el final del texto largo también se imprime')
        assert.ok(
            raw.includes('Destinatarios'),
            'la entrada siguiente a la conservación sigue imprimiéndose'
        )
        assert.ok(
            raw.includes('FIRMA Y CONFORMIDAD DE LAS PARTES'),
            'el bloque de firmas sigue en el documento después del recuadro'
        )
    })
})
