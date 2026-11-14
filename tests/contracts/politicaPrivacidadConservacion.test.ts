import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
    IDENTITY_IMAGE_RETENTION_DAYS,
    LEGAL_DATA_RETENTION_YEARS,
} from '../../lib/booking/dataRetention'
import {
    CONTRACT_RETENTION_PARAGRAPHS,
    SIGNED_CONTRACT_RETENTION_YEARS,
} from '../../lib/contracts/retentionTerms'

/**
 * Art. 13.2.a RGPD: la política de privacidad tiene que decir el plazo de conservación de cada dato,
 * o el criterio para determinarlo. La página no decía ni un plazo.
 *
 * Lo que este test vigila es la COHERENCIA: los números que lee el cliente en la política, los que
 * lee el titular en /dashboard/datos antes de subir el documento de un tercero y los que ejecuta la
 * purga (`lib/booking/dataRetention.ts`) tienen que ser los mismos. Si alguien cambia una constante
 * y no el texto, aquí falla: un plazo publicado que la purga no cumple es una declaración falsa.
 *
 * Y vigila lo que NO se puede afirmar: el plazo del contrato firmado está pendiente de decisión, así
 * que la página no puede imprimir ningún número para él.
 */

const privacidad = readFileSync(
    new URL('../../app/[locale]/legal/privacidad/page.tsx', import.meta.url),
    'utf8'
)

const avisoSegundoConductor = readFileSync(
    new URL('../../app/[locale]/dashboard/datos/DriverDataClient.tsx', import.meta.url),
    'utf8'
)

describe('política de privacidad: conservación y supresión', () => {
    it('publica los dos plazos que ejecuta la purga, con los números de dataRetention', () => {
        assert.equal(IDENTITY_IMAGE_RETENTION_DAYS, 100, 'decisión de Javier 2026-11-10')
        assert.equal(LEGAL_DATA_RETENTION_YEARS, 3, 'art. 5.3 RD 933/2021')

        assert.match(
            privacidad,
            new RegExp(`${IDENTITY_IMAGE_RETENTION_DAYS}</strong> días|${IDENTITY_IMAGE_RETENTION_DAYS} días`),
            'la política debe decir el plazo de las imágenes de identidad'
        )
        assert.match(
            privacidad,
            new RegExp(`${LEGAL_DATA_RETENTION_YEARS} años`),
            'la política debe decir el plazo del registro de viajeros'
        )
    })

    it('cita la norma que impone los 3 años y su artículo', () => {
        assert.match(privacidad, /Real Decreto 933\/2021/)
        assert.match(privacidad, /art[íi]culo 5\.3/i, 'el plazo de 3 años sale del art. 5.3 del RD 933/2021')
    })

    it('dice que las imágenes se borran de forma irreversible y qué pasa con varias reservas', () => {
        assert.match(privacidad, /irreversible/i)
        assert.match(
            privacidad,
            /varias reservas/i,
            'la carpeta de cliente es compartida: el plazo corre con la última reserva (holderImagePurgeDecision)'
        )
    })

    /**
     * Javier cerró el plazo del contrato firmado el 2026-11-14: 6 años desde la devolución, por el
     * art. 30 del Código de Comercio. Hasta entonces la página solo podía publicar el criterio.
     * Ahora tiene que publicar el número Y la razón: un plazo sin norma detrás no se defiende.
     */
    it('publica los 6 años del contrato firmado con la norma que los sostiene', () => {
        assert.equal(SIGNED_CONTRACT_RETENTION_YEARS, 6, 'decisión de Javier 2026-11-14')
        assert.match(
            privacidad,
            new RegExp(`${SIGNED_CONTRACT_RETENTION_YEARS} años(</strong>)? desde la devolución`),
            'el plazo del contrato firmado va con número, no con criterio'
        )
        assert.match(privacidad, /art[íi]culo 30 del Código de Comercio/i, 'la razón del plazo, en una línea')
        assert.ok(
            !/criterio que aplicamos/i.test(privacidad),
            'ya no se publica un criterio para el contrato: hay plazo cerrado'
        )
        for (const prohibido of ['4 años', '5 años', '10 años', '15 años']) {
            assert.ok(
                !privacidad.includes(prohibido),
                `la política no puede afirmar "${prohibido}": el plazo decidido es de ${SIGNED_CONTRACT_RETENTION_YEARS} años`
            )
        }
    })

    /**
     * El contrato (art. 31), su PDF y esta página los lee el mismo cliente. La redacción difiere
     * porque la política le habla en segunda persona, pero los NÚMEROS y las NORMAS no pueden
     * diferir: eso sería información contradictoria del art. 13.2.a del RGPD.
     */
    it('dice los mismos plazos y las mismas normas que el artículo 31 del contrato', () => {
        const contrato = CONTRACT_RETENTION_PARAGRAPHS.join(' ')
        for (const comun of [
            `${IDENTITY_IMAGE_RETENTION_DAYS} días`,
            `${LEGAL_DATA_RETENTION_YEARS} años`,
            `${SIGNED_CONTRACT_RETENTION_YEARS} años`,
            'Real Decreto 933/2021',
            'Código de Comercio',
            'segundo conductor autorizado',
        ]) {
            assert.ok(contrato.includes(comun), `el artículo 31 del contrato debe decir "${comun}"`)
            assert.ok(privacidad.includes(comun), `la política debe decir lo mismo que el contrato: "${comun}"`)
        }
    })

    /**
     * Los 6 años son, además, el plazo real de los datos de un TERCERO que nunca contrató nada: su
     * nombre y su documento viven en el contrato archivado. El apartado del 2º conductor tiene que
     * decir ese número, no remitir a un criterio.
     */
    it('da al segundo conductor el número de años que su nombre sigue en el contrato', () => {
        const apartado = privacidad.split('Si te Han Autorizado como Segundo Conductor')[1] || ''
        assert.ok(apartado.length > 0, 'el apartado del 2º conductor tiene que seguir ahí')
        assert.match(
            apartado,
            new RegExp(`${SIGNED_CONTRACT_RETENTION_YEARS} años desde la devolución`),
            'el tercero tiene que leer su plazo, no un criterio'
        )
        assert.match(apartado, /art[íi]culo 30 del Código de Comercio/i)
    })

    /**
     * El responsable del tratamiento lo fija el contrato, que es el documento con valor jurídico:
     * UTOPIA VAN LIFE S.L., CIF B24902637, San Sebastián de los Reyes (Madrid), info@. La política
     * decía «domicilio en Palma de Mallorca» y daba un correo que no usa nadie más (`hola@`), así que
     * la misma empresa se identificaba de dos formas distintas (confirmado por Javier, 2026-11-14).
     */
    it('identifica al responsable con los datos del contrato, no con otros', () => {
        assert.match(privacidad, /B24902637/, 'el CIF no figuraba en la política')
        assert.match(privacidad, /San Sebastián de los Reyes/)
        assert.ok(
            !/Palma de Mallorca|Islas Baleares/.test(privacidad),
            'el domicilio del responsable es la sede fiscal, no la zona de operación'
        )
        assert.ok(
            !privacidad.includes('hola@utopiavanlife.com'),
            'el contrato, el PDF, la plantilla y el panel usan info@: la política no puede usar otro'
        )
        assert.match(privacidad, /info@utopiavanlife\.com/)
    })

    it('explica cómo se pide el borrado y en qué plazo se atiende (art. 12.3)', () => {
        assert.match(privacidad, /info@utopiavanlife\.com/)
        assert.match(privacidad, /plazo máximo de un mes/i)
        assert.match(privacidad, /dos meses/i, 'la prórroga del art. 12.3 hay que anunciarla')
        assert.match(privacidad, /art[íi]culo 12\.3/i)
    })

    it('informa ANTES de qué no se borra al borrar la cuenta, y por qué (art. 17.3.b)', () => {
        assert.match(privacidad, /art[íi]culo 17\.3/i)
        assert.match(privacidad, /registro de viajeros de tus reservas/i)
        assert.match(privacidad, /facturación/i)
    })

    it('da al segundo conductor la información del art. 14, incluida la fuente de los datos', () => {
        assert.match(privacidad, /art[íi]culo 14/i)
        assert.match(privacidad, /no nos los has dado tú/i, 'art. 14: los datos no vienen del interesado')
        assert.match(privacidad, /nos los facilita el titular/i, 'art. 14.2.f: la fuente de los datos')
        assert.match(
            privacidad,
            /contrato de alquiler firmado/i,
            'su nombre y documento siguen en el contrato más allá de los 3 años: hay que decirlo'
        )
    })

    it('mantiene la fecha de actualización al día', () => {
        assert.ok(
            !privacidad.includes('Agosto 2026'),
            'la fecha de actualización tenía que cambiar al publicar los plazos'
        )
        assert.match(privacidad, /Última actualización: \w+ 20\d\d/)
    })

    /**
     * `/dashboard/datos` es territorio de `panel-cliente`. Aquí no se exige que su aviso exista: lo
     * que se exige es que, SI anuncia plazos, sean los mismos que publica la política y ejecuta la
     * purga. Dos textos con números distintos sobre el mismo dato es lo que no puede pasar.
     */
    it('dice los mismos plazos que el aviso de /dashboard/datos, si ese aviso los anuncia', () => {
        if (!/Real Decreto 933\/2021/.test(avisoSegundoConductor)) return

        assert.match(
            avisoSegundoConductor,
            new RegExp(`${IDENTITY_IMAGE_RETENTION_DAYS} días`),
            'el aviso del titular anuncia un plazo de imágenes distinto al publicado'
        )
        assert.match(
            avisoSegundoConductor,
            new RegExp(`${LEGAL_DATA_RETENTION_YEARS} años`),
            'el aviso del titular anuncia un plazo del registro de viajeros distinto al publicado'
        )
        assert.match(
            avisoSegundoConductor,
            /legal\/privacidad/,
            'si el aviso remite al tercero a la política, el enlace debe seguir ahí'
        )
    })
})
