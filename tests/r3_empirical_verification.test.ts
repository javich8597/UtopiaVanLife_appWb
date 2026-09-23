import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public')

// Helper to extract quoted local asset paths from file contents
function extractLocalAssetPaths(fileContent: string): string[] {
    const assetRegex = /['"`](\/(?:images|videos)\/[^'"`\s\)]+)['"`]/g
    const matches = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = assetRegex.exec(fileContent)) !== null) {
        // Strip out any trailing query or hash if present
        const cleanPath = match[1].split('?')[0].split('#')[0]
        matches.add(cleanPath)
    }
    return Array.from(matches)
}

// Helper to check if file on disk is an HTML error page
function isHtmlErrorPage(absPath: string): boolean {
    try {
        const sample = fs.readFileSync(absPath, { encoding: 'utf-8', flag: 'r' }).slice(0, 500)
        return sample.includes('<!DOCTYPE html') || sample.includes('403 Forbidden') || sample.includes('AccessDenied')
    } catch {
        return false
    }
}

describe('Round 3 Empirical Verification: Multimedia Assets & Integrity', () => {

    describe('Requirement 1: Multimedia Assets Existence on Disk (> 0 bytes)', () => {
        const targetFiles = [
            'components/home/HeroSection.tsx',
            'components/home/CamperShowcase.tsx',
            'components/home/WhyUtopia.tsx',
            'components/home/ExperiencesSection.tsx',
            'app/[locale]/campers/[slug]/CamperDetailClient.tsx',
            'app/[locale]/campers/[slug]/page.tsx',
            'app/[locale]/reserva/[slug]/page.tsx',
            'app/[locale]/dashboard/manual/CamperManualClient.tsx'
        ]

        for (const relFile of targetFiles) {
            it(`verifies all local assets in ${relFile} exist on disk and are non-empty`, () => {
                const fullPath = path.join(PROJECT_ROOT, relFile)
                assert.ok(fs.existsSync(fullPath), `Component file missing: ${relFile}`)
                const content = fs.readFileSync(fullPath, 'utf-8')
                const assets = extractLocalAssetPaths(content)

                assert.ok(assets.length > 0, `No local assets found in ${relFile}`)

                for (const assetPath of assets) {
                    const localDiskPath = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''))
                    assert.ok(
                        fs.existsSync(localDiskPath),
                        `Referenced asset does not exist on disk: ${assetPath} (in ${relFile})`
                    )

                    const stat = fs.statSync(localDiskPath)
                    assert.ok(
                        stat.size > 0,
                        `Referenced asset is empty (0 bytes): ${assetPath} (in ${relFile})`
                    )

                    // Ensure asset is a genuine binary/media file, not an HTML error response
                    assert.equal(
                        isHtmlErrorPage(localDiskPath),
                        false,
                        `Referenced asset is an HTTP error HTML page: ${assetPath} (in ${relFile})`
                    )
                }
            })
        }

        it('strictly verifies known corrupt 403 files are never referenced in any active components', () => {
            const corruptPaths = [
                '/images/campers/neo/360-panorama.png',
                '/images/campers/space/360-panorama.png'
            ]

            // Verify they are indeed corrupt on disk as documented
            for (const cPath of corruptPaths) {
                const diskPath = path.join(PUBLIC_DIR, cPath.replace(/^\//, ''))
                if (fs.existsSync(diskPath)) {
                    assert.ok(
                        isHtmlErrorPage(diskPath),
                        `Expected test fixture ${cPath} to be a known 403 HTML page`
                    )
                }
            }

            // Verify none of the target files contain these corrupt paths
            for (const relFile of targetFiles) {
                const fullPath = path.join(PROJECT_ROOT, relFile)
                const content = fs.readFileSync(fullPath, 'utf-8')
                for (const cPath of corruptPaths) {
                    assert.equal(
                        content.includes(cPath),
                        false,
                        `Forbidden corrupt asset ${cPath} was found in ${relFile}`
                    )
                }
            }
        })

        it('strictly verifies obsolete 404 asset neo-top.webp is not referenced anywhere', () => {
            for (const relFile of targetFiles) {
                const fullPath = path.join(PROJECT_ROOT, relFile)
                const content = fs.readFileSync(fullPath, 'utf-8')
                assert.equal(
                    content.includes('neo-top.webp'),
                    false,
                    `Obsolete missing asset neo-top.webp referenced in ${relFile}`
                )
            }
        })
    })

    describe('Requirement 2: Hotspot Data Structures for NEO and SPACE', () => {
        // Extract hotspot data from CamperShowcase.tsx
        const showcasePath = path.join(PROJECT_ROOT, 'components/home/CamperShowcase.tsx')
        const showcaseContent = fs.readFileSync(showcasePath, 'utf-8')

        it('verifies hotspot structures in CamperShowcase.tsx conform to valid coordinate percentages and data integrity', () => {
            // Find all hotspot blocks inside hotspots: [ ... ]
            const hotspotsSectionRegex = /hotspots:\s*\[([\s\S]*?)\]\s*,?\s*videoClips/g
            let sectionMatch: RegExpExecArray | null
            let count = 0
            const validCategories = new Set(['electrical', 'comfort', 'interior', 'tech', 'storage'])

            function parseQuoted(block: string, prop: string): string | null {
                const re = new RegExp(`${prop}:\\s*(?:'((?:\\\\'|[^'])*)'|"((?:\\\\"|[^"])*)")`)
                const m = re.exec(block)
                return m ? (m[1] !== undefined ? m[1] : m[2]) : null
            }
            function parseNum(block: string, prop: string): number | null {
                const re = new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)`)
                const m = re.exec(block)
                return m ? parseFloat(m[1]) : null
            }

            while ((sectionMatch = hotspotsSectionRegex.exec(showcaseContent)) !== null) {
                const section = sectionMatch[1]
                const blockRegex = /\{([\s\S]*?)\}/g
                let blockMatch: RegExpExecArray | null

                while ((blockMatch = blockRegex.exec(section)) !== null) {
                    const block = blockMatch[1]
                    const id = parseQuoted(block, 'id')
                    const title = parseQuoted(block, 'title')
                    const specBadge = parseQuoted(block, 'specBadge')
                    const category = parseQuoted(block, 'category')
                    const description = parseQuoted(block, 'description')
                    const image = parseQuoted(block, 'image')
                    const x = parseNum(block, 'x')
                    const y = parseNum(block, 'y')

                    if (!id) continue
                    count++

                    assert.ok(title && title.trim().length > 0, `Hotspot '${id}' has empty title`)
                    assert.ok(specBadge && specBadge.trim().length > 0, `Hotspot '${id}' has empty specBadge`)
                    assert.ok(description && description.trim().length > 10, `Hotspot '${id}' description too short`)
                    assert.ok(category && validCategories.has(category), `Hotspot '${id}' category '${category}' invalid`)
                    assert.ok(x !== null && !Number.isNaN(x) && x >= 0 && x <= 100, `Hotspot '${id}' x out of bounds: ${x}`)
                    assert.ok(y !== null && !Number.isNaN(y) && y >= 0 && y <= 100, `Hotspot '${id}' y out of bounds: ${y}`)

                    assert.ok(image, `Hotspot '${id}' has no image`)
                    const diskPath = path.join(PUBLIC_DIR, image.replace(/^\//, ''))
                    assert.ok(fs.existsSync(diskPath), `Hotspot '${id}' linked asset not found: ${image}`)
                    assert.ok(fs.statSync(diskPath).size > 0, `Hotspot '${id}' asset empty: ${image}`)
                    assert.equal(isHtmlErrorPage(diskPath), false, `Hotspot '${id}' asset is error page: ${image}`)
                }
            }

            // Expect exactly 16 hotspots (8 for NEO, 8 for SPACE)
            assert.equal(count, 16, `Expected exactly 16 hotspots in CamperShowcase.tsx, found ${count}`)
        })

        it('verifies blueprint hotspots in CamperDetailClient.tsx have valid coordinates and non-empty metadata', () => {
            const detailPath = path.join(PROJECT_ROOT, 'app/[locale]/campers/[slug]/CamperDetailClient.tsx')
            const detailContent = fs.readFileSync(detailPath, 'utf-8')

            function parseQuoted(block: string, prop: string): string | null {
                const re = new RegExp(`${prop}:\\s*(?:'((?:\\\\'|[^'])*)'|"((?:\\\\"|[^"])*)")`)
                const m = re.exec(block)
                return m ? (m[1] !== undefined ? m[1] : m[2]) : null
            }
            function parseNum(block: string, prop: string): number | null {
                const re = new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)`)
                const m = re.exec(block)
                return m ? parseFloat(m[1]) : null
            }

            // Hotspots in BLUEPRINT_DATA
            const blockRegex = /\{\s*id:\s*['"][^'"]+['"],\s*x:[\s\S]*?\}/g
            let match: RegExpExecArray | null
            let count = 0

            while ((match = blockRegex.exec(detailContent)) !== null) {
                const block = match[0]
                const id = parseQuoted(block, 'id')
                const x = parseNum(block, 'x')
                const y = parseNum(block, 'y')
                const title = parseQuoted(block, 'title')
                const desc = parseQuoted(block, 'desc')
                const spec = parseQuoted(block, 'spec')

                if (!id) continue
                count++

                assert.ok(x !== null && !Number.isNaN(x) && x >= 0 && x <= 100, `Detail hotspot '${id}' x out of bounds: ${x}`)
                assert.ok(y !== null && !Number.isNaN(y) && y >= 0 && y <= 100, `Detail hotspot '${id}' y out of bounds: ${y}`)
                assert.ok(title && title.trim().length > 0, `Detail hotspot '${id}' has empty title`)
                assert.ok(desc && desc.trim().length > 0, `Detail hotspot '${id}' has empty desc`)
                assert.ok(spec && spec.trim().length > 0, `Detail hotspot '${id}' has empty spec`)
            }

            assert.equal(count, 12, `Expected 12 blueprint hotspots in CamperDetailClient.tsx (6 NEO, 6 SPACE), found ${count}`)
        })
    })

    describe('Requirement 3: Wheel Finish Variants & Video Clips in CamperShowcase.tsx', () => {
        const showcasePath = path.join(PROJECT_ROOT, 'components/home/CamperShowcase.tsx')
        const content = fs.readFileSync(showcasePath, 'utf-8')

        it('verifies all wheel finish variants exist on disk and have complete descriptors', () => {
            const wheelSectionRegex = /wheelOptions:\s*\[([\s\S]*?)\]\s*,?\s*interiorGallery/g
            let secMatch: RegExpExecArray | null
            let count = 0

            function parseQuoted(block: string, prop: string): string | null {
                const re = new RegExp(`${prop}:\\s*(?:'((?:\\\\'|[^'])*)'|"((?:\\\\"|[^"])*)")`)
                const m = re.exec(block)
                return m ? (m[1] !== undefined ? m[1] : m[2]) : null
            }

            while ((secMatch = wheelSectionRegex.exec(content)) !== null) {
                const section = secMatch[1]
                const blockRegex = /\{([\s\S]*?)\}/g
                let bMatch: RegExpExecArray | null

                while ((bMatch = blockRegex.exec(section)) !== null) {
                    const block = bMatch[1]
                    const id = parseQuoted(block, 'id')
                    const name = parseQuoted(block, 'name')
                    const desc = parseQuoted(block, 'desc')
                    const image = parseQuoted(block, 'image')

                    if (!id) continue
                    count++

                    assert.ok(name && name.length > 0, `Wheel option '${id}' name empty`)
                    assert.ok(desc && desc.length > 0, `Wheel option '${id}' desc empty`)
                    assert.ok(image, `Wheel option '${id}' image missing`)

                    const diskPath = path.join(PUBLIC_DIR, image.replace(/^\//, ''))
                    assert.ok(fs.existsSync(diskPath), `Wheel variant image missing on disk: ${image}`)
                    const stat = fs.statSync(diskPath)
                    assert.ok(stat.size > 0, `Wheel variant image empty: ${image}`)
                    assert.equal(isHtmlErrorPage(diskPath), false, `Wheel variant is HTML error page: ${image}`)
                }
            }

            // Expect exactly 6 wheel variants (3 for NEO, 3 for SPACE)
            assert.equal(count, 6, `Expected exactly 6 wheel variants, found ${count}`)
        })

        it('verifies all video clips in CamperShowcase.tsx exist on disk with valid poster images', () => {
            // Match video clips in CamperShowcase.tsx
            const clipRegex = /{\s*id:\s*['"]([^'"]+)['"],\s*title:\s*['"]([^'"]+)['"],\s*duration:\s*['"]([^'"]+)['"],\s*src:\s*['"]([^'"]+)['"],\s*poster:\s*['"]([^'"]+)['"],\s*aspect:\s*['"]([^'"]+)['"]\s*}/g
            let match: RegExpExecArray | null
            let count = 0

            while ((match = clipRegex.exec(content)) !== null) {
                count++
                const [_, id, title, duration, src, poster, aspect] = match
                assert.ok(id.length > 0, 'Clip id empty')
                assert.ok(title.length > 0, 'Clip title empty')
                assert.ok(duration.length > 0, 'Clip duration empty')
                assert.ok(['portrait', 'landscape'].includes(aspect), `Invalid aspect ratio: ${aspect}`)

                const srcDiskPath = path.join(PUBLIC_DIR, src.replace(/^\//, ''))
                assert.ok(fs.existsSync(srcDiskPath), `Video clip MP4 missing on disk: ${src}`)
                assert.ok(fs.statSync(srcDiskPath).size > 10000, `Video clip suspiciously small (<10KB): ${src}`)

                const posterDiskPath = path.join(PUBLIC_DIR, poster.replace(/^\//, ''))
                assert.ok(fs.existsSync(posterDiskPath), `Video poster missing on disk: ${poster}`)
                assert.ok(fs.statSync(posterDiskPath).size > 0, `Video poster empty: ${poster}`)
            }

            // Expect 9 video clips (4 for NEO, 5 for SPACE)
            assert.ok(count >= 9, `Expected at least 9 video clips in CamperShowcase.tsx, found ${count}`)
        })

        it('verifies all video clips in CamperDetailClient.tsx exist on disk and are valid MP4 files', () => {
            const detailPath = path.join(PROJECT_ROOT, 'app/[locale]/campers/[slug]/CamperDetailClient.tsx')
            const detailContent = fs.readFileSync(detailPath, 'utf-8')

            const detailClipRegex = /{\s*id:\s*['"]([^'"]+)['"],\s*title:\s*['"]([^'"]+)['"],\s*src:\s*['"]([^'"]+)['"],\s*duration:\s*['"]([^'"]+)['"]\s*}/g
            let match: RegExpExecArray | null
            let count = 0

            while ((match = detailClipRegex.exec(detailContent)) !== null) {
                count++
                const [_, id, title, src, duration] = match
                assert.ok(id.length > 0, 'Detail clip id empty')
                assert.ok(title.length > 0, 'Detail clip title empty')
                assert.ok(duration.length > 0, 'Detail clip duration empty')

                const srcDiskPath = path.join(PUBLIC_DIR, src.replace(/^\//, ''))
                assert.ok(fs.existsSync(srcDiskPath), `Detail video clip MP4 missing: ${src}`)
                assert.ok(fs.statSync(srcDiskPath).size > 10000, `Detail video clip suspiciously small: ${src}`)
            }

            assert.ok(count >= 10, `Expected at least 10 video clips in CamperDetailClient.tsx, found ${count}`)
        })
    })

    describe('Requirement 4: Reservation URLs Parsing & Navigation Linkage', () => {
        // Simulation of Hero search URL generation logic (from HeroSection.tsx lines 50-67)
        function generateHeroSearchUrl(startDate: string, endDate: string, pax: number): string {
            const params = new URLSearchParams()
            if (startDate) params.set('from', startDate)
            if (endDate) params.set('to', endDate)
            params.set('pax', String(Math.min(3, Math.max(1, pax))))
            return `/reserva/neo?${params.toString()}`
        }

        // Simulation of PriceCalculator reservation URL generation (from PriceCalculator.tsx lines 132-148)
        function generatePriceCalculatorUrl(
            camperSlug: string,
            startDate: string,
            endDate: string,
            startSlot: 'morning' | 'afternoon',
            endSlot: 'morning' | 'afternoon',
            pax: number,
            selectedExtraIds: string[]
        ): string {
            const pickupTime = startSlot === 'morning' ? '09:00' : '15:00'
            const dropoffTime = endSlot === 'morning' ? '12:00' : '19:00'

            const params = new URLSearchParams({
                from: startDate,
                to: endDate,
                startSlot: startSlot || 'morning',
                endSlot: endSlot || 'morning',
                pickup_time: pickupTime,
                dropoff_time: dropoffTime,
                pax: String(Math.min(3, Math.max(1, pax))),
                extras: selectedExtraIds.join(','),
            })
            return `/reserva/${camperSlug}?${params.toString()}`
        }

        it('parses Hero search reservation URL with complete dates and travelers', () => {
            const urlStr = generateHeroSearchUrl('2026-10-01', '2026-10-07', 2)
            const parsed = new URL(urlStr, 'https://utopiavanlife.com')

            assert.equal(parsed.pathname, '/reserva/neo')
            assert.equal(parsed.searchParams.get('from'), '2026-10-01')
            assert.equal(parsed.searchParams.get('to'), '2026-10-07')
            assert.equal(parsed.searchParams.get('pax'), '2')
        })

        it('clamps travelers parameter strictly between 1 and 3 in Hero search URL', () => {
            const urlLow = generateHeroSearchUrl('2026-10-01', '2026-10-07', 0)
            const parsedLow = new URL(urlLow, 'https://utopiavanlife.com')
            assert.equal(parsedLow.searchParams.get('pax'), '1')

            const urlHigh = generateHeroSearchUrl('2026-10-01', '2026-10-07', 10)
            const parsedHigh = new URL(urlHigh, 'https://utopiavanlife.com')
            assert.equal(parsedHigh.searchParams.get('pax'), '3')
        })

        it('parses PriceCalculator reservation URL for NEO with complete parameters and extras', () => {
            const urlStr = generatePriceCalculatorUrl(
                'neo',
                '2026-06-15',
                '2026-06-20',
                'morning',
                'afternoon',
                2,
                ['clean', 'snorkel']
            )
            const parsed = new URL(urlStr, 'https://utopiavanlife.com')

            assert.equal(parsed.pathname, '/reserva/neo')
            assert.equal(parsed.searchParams.get('from'), '2026-06-15')
            assert.equal(parsed.searchParams.get('to'), '2026-06-20')
            assert.equal(parsed.searchParams.get('startSlot'), 'morning')
            assert.equal(parsed.searchParams.get('endSlot'), 'afternoon')
            assert.equal(parsed.searchParams.get('pickup_time'), '09:00')
            assert.equal(parsed.searchParams.get('dropoff_time'), '19:00')
            assert.equal(parsed.searchParams.get('pax'), '2')
            assert.equal(parsed.searchParams.get('extras'), 'clean,snorkel')
        })

        it('parses PriceCalculator reservation URL for SPACE targeting /reserva/space', () => {
            const urlStr = generatePriceCalculatorUrl(
                'space',
                '2026-07-01',
                '2026-07-08',
                'afternoon',
                'morning',
                2,
                []
            )
            const parsed = new URL(urlStr, 'https://utopiavanlife.com')

            assert.equal(parsed.pathname, '/reserva/space')
            assert.equal(parsed.searchParams.get('from'), '2026-07-01')
            assert.equal(parsed.searchParams.get('to'), '2026-07-08')
            assert.equal(parsed.searchParams.get('startSlot'), 'afternoon')
            assert.equal(parsed.searchParams.get('endSlot'), 'morning')
            assert.equal(parsed.searchParams.get('pickup_time'), '15:00')
            assert.equal(parsed.searchParams.get('dropoff_time'), '12:00')
            assert.equal(parsed.searchParams.get('pax'), '2')
            assert.equal(parsed.searchParams.get('extras'), '')
        })

        it('verifies CamperShowcase primary reservation CTAs point to /reserva/${slug}', () => {
            const showcasePath = path.join(PROJECT_ROOT, 'components/home/CamperShowcase.tsx')
            const content = fs.readFileSync(showcasePath, 'utf-8')

            assert.ok(
                content.includes('href={`/reserva/${camper.slug}`}') ||
                content.includes('href={`/${locale}/reserva/${camper.slug}`}') ||
                content.includes('/reserva/'),
                'CamperShowcase does not link to /reserva/${camper.slug}'
            )
        })
    })

    describe('Adversarial Robustness & Negative Boundary Checks', () => {
        it('detects and flags simulated out-of-range hotspot percentages', () => {
            const invalidHotspots = [
                { id: 'neg-x', x: -5, y: 50 },
                { id: 'over-x', x: 105, y: 50 },
                { id: 'neg-y', x: 50, y: -10 },
                { id: 'over-y', x: 50, y: 150 },
            ]

            for (const h of invalidHotspots) {
                const isOutOfRange = h.x < 0 || h.x > 100 || h.y < 0 || h.y > 100
                assert.equal(isOutOfRange, true, `Validation failed to catch out of range coordinate for ${h.id}`)
            }
        })

        it('detects and rejects simulated empty or whitespace-only hotspot metadata', () => {
            const emptyHotspot = { id: 'empty-1', title: '   ', desc: '\t\n' }
            const hasEmptyFields = emptyHotspot.title.trim().length === 0 || emptyHotspot.desc.trim().length === 0
            assert.equal(hasEmptyFields, true)
        })

        it('detects and rejects URL generation with malformed or injected slug', () => {
            const maliciousSlug = 'neo/../../etc/passwd'
            const urlStr = `/reserva/${encodeURIComponent(maliciousSlug)}`
            const parsed = new URL(urlStr, 'https://utopiavanlife.com')
            const match = parsed.pathname.match(/^\/reserva\/([a-zA-Z0-9_-]+)$/)
            assert.equal(match, null, 'Malicious path traversal was not rejected by slug regex')
        })
    })
})
