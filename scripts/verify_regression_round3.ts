/**
 * Empirical Verification & Regression Test Harness — Round 3
 * Tests:
 * 1. Absence of forbidden string references in app/, components/, lib/
 *    - /images/campers/neo/neo-top.webp (non-existent asset)
 *    - 360-panorama.png (corrupt 403 HTML files)
 * 2. Integrity of app/[locale]/reserva/[slug]/types.ts exports
 * 3. Retention of generateStaticParams() in app/[locale]/campers/[slug]/page.tsx returning 'neo' and 'space'
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const ROOT_DIR = path.resolve(__dirname, '..')

interface CheckResult {
    passed: boolean
    description: string
    details?: any
}

const results: CheckResult[] = []

function logCheck(passed: boolean, description: string, details?: any) {
    results.push({ passed, description, details })
    const icon = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${icon}: ${description}`)
    if (details) {
        console.log('   Details:', JSON.stringify(details, null, 2))
    }
}

// -------------------------------------------------------------
// 1. Scan codebase (app/, components/, lib/) for forbidden strings
// -------------------------------------------------------------
function getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            getAllFiles(fullPath, fileList)
        } else if (stat.isFile() && /\.(ts|tsx|js|jsx|json|css|html)$/.test(file)) {
            fileList.push(fullPath)
        }
    }
    return fileList
}

const scanDirs = ['app', 'components', 'lib'].map(d => path.join(ROOT_DIR, d))
const allSourceFiles: string[] = []
for (const d of scanDirs) {
    getAllFiles(d, allSourceFiles)
}

const forbiddenViolations: Record<string, { file: string; line: number; text: string }[]> = {
    'neo-top.webp': [],
    '360-panorama.png': []
}

for (const filePath of allSourceFiles) {
    const relativePath = path.relative(ROOT_DIR, filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
        if (line.includes('neo-top.webp')) {
            forbiddenViolations['neo-top.webp'].push({
                file: relativePath,
                line: index + 1,
                text: line.trim()
            })
        }
        if (line.includes('360-panorama.png')) {
            forbiddenViolations['360-panorama.png'].push({
                file: relativePath,
                line: index + 1,
                text: line.trim()
            })
        }
    })
}

// Check 1.1: neo-top.webp references === 0
const neoTopZero = forbiddenViolations['neo-top.webp'].length === 0
logCheck(
    neoTopZero,
    `0 references to non-existent /images/campers/neo/neo-top.webp across app/, components/, lib/ (Found: ${forbiddenViolations['neo-top.webp'].length})`,
    forbiddenViolations['neo-top.webp']
)

// Check 1.2: 360-panorama.png references === 0
const panoramaZero = forbiddenViolations['360-panorama.png'].length === 0
logCheck(
    panoramaZero,
    `0 references to corrupt 403 HTML file 360-panorama.png across app/, components/, lib/ (Found: ${forbiddenViolations['360-panorama.png'].length})`,
    forbiddenViolations['360-panorama.png']
)

// -------------------------------------------------------------
// 2. Validate app/[locale]/reserva/[slug]/types.ts exports
// -------------------------------------------------------------
async function verifyReservaTypesExports() {
    try {
        const typesPath = path.join(ROOT_DIR, 'app/[locale]/reserva/[slug]/types.ts')
        const fileContent = fs.readFileSync(typesPath, 'utf-8')

        // Verify type declarations in source
        const expectedTypeNames = [
            'WizardStep',
            'WizardCamper',
            'WizardExtraItem',
            'SelectedWizardExtra',
            'Step1Data',
            'Step2Data',
            'Step3Data',
            'Step4Data',
            'Step5Customer',
            'BookingWizardState'
        ]
        const missingTypes = expectedTypeNames.filter(t => !fileContent.includes(`export interface ${t}`) && !fileContent.includes(`export type ${t}`))
        
        // Import module directly to test runtime exports via file URL
        const typesUrl = pathToFileURL(typesPath).href
        const typesModule = await import(typesUrl)
        const expectedFunctions = [
            'validateDniNieOrPassport',
            'validateEmail',
            'validatePhone',
            'validateStep1',
            'validateStep2',
            'validateStep3',
            'validateStep4',
            'validateStep5'
        ]

        const missingFunctions = expectedFunctions.filter(fn => typeof (typesModule as any)[fn] !== 'function')

        // Test function behavior
        const dniValid = typesModule.validateDniNieOrPassport('12345678Z').isValid === true
        const emailValid = typesModule.validateEmail('info@utopiavanlife.com').isValid === true
        const phoneValid = typesModule.validatePhone('+34 600 123 456').isValid === true
        const step2Valid = typesModule.validateStep2({ kmPackage: 'unlimited' }).isValid === true
        const step3Valid = typesModule.validateStep3({ cancellationPolicy: 'flexible' }).isValid === true
        const step4Valid = typesModule.validateStep4({ selectedExtras: [] }).isValid === true

        const allValid = missingTypes.length === 0 && missingFunctions.length === 0 && dniValid && emailValid && phoneValid && step2Valid && step3Valid && step4Valid

        logCheck(
            allValid,
            `app/[locale]/reserva/[slug]/types.ts exports are intact and functional`,
            { missingTypes, missingFunctions, testResults: { dniValid, emailValid, phoneValid, step2Valid, step3Valid, step4Valid } }
        )
    } catch (err: any) {
        logCheck(false, `app/[locale]/reserva/[slug]/types.ts export validation failed: ${err.message}`)
    }
}

// -------------------------------------------------------------
// 3. Validate app/[locale]/campers/[slug]/page.tsx generateStaticParams()
// -------------------------------------------------------------
async function verifyCamperStaticParams() {
    try {
        const pagePath = path.join(ROOT_DIR, 'app/[locale]/campers/[slug]/page.tsx')
        const fileContent = fs.readFileSync(pagePath, 'utf-8')

        const hasExport = fileContent.includes('export async function generateStaticParams()')
        
        const pageUrl = pathToFileURL(pagePath).href
        const pageModule = await import(pageUrl)
        assert.equal(typeof pageModule.generateStaticParams, 'function', 'generateStaticParams must be an exported function')

        const params = await pageModule.generateStaticParams()
        const slugs = Array.isArray(params) ? params.map((p: any) => p.slug) : []
        const hasNeo = slugs.includes('neo')
        const hasSpace = slugs.includes('space')

        logCheck(
            hasExport && hasNeo && hasSpace,
            `app/[locale]/campers/[slug]/page.tsx retains generateStaticParams() returning 'neo' and 'space'`,
            { returnedSlugs: slugs, hasNeo, hasSpace }
        )
    } catch (err: any) {
        logCheck(false, `generateStaticParams validation failed: ${err.message}`)
    }
}

// -------------------------------------------------------------
// Main execution
// -------------------------------------------------------------
async function main() {
    console.log('====================================================')
    console.log('RUNNING EMPIRICAL REGRESSION VERIFICATION (ROUND 3)')
    console.log('====================================================')

    await verifyReservaTypesExports()
    await verifyCamperStaticParams()

    console.log('====================================================')
    const allPassed = results.every(r => r.passed)
    if (allPassed) {
        console.log('ALL EMPIRICAL REGRESSION CHECKS PASSED ✅')
        process.exit(0)
    } else {
        const failCount = results.filter(r => !r.passed).length
        console.log(`EMPIRICAL CHECKS FAILED: ${failCount} violations detected ❌`)
        process.exit(1)
    }
}

main()
