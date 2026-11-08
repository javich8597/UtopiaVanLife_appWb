import type { SupabaseClient } from '@supabase/supabase-js'
import {
    calculateAge,
    calculateLicenseSeniorityYears,
    MAX_OPEN_PENDING_PER_EMAIL,
    OPEN_PENDING_WINDOW_MINUTES,
} from './checkoutRules'

/**
 * Cuenta a la que se asocia una reserva.
 *
 * Escribir un email en el checkout no demuestra que sea tuyo. Solo una sesión de ese usuario, o
 * haber creado la cuenta en este mismo checkout, permite tocar el perfil y da acceso a los datos.
 * Sin eso, la reserva se enlaza a la cuenta para que el titular la vea, y nada más: quien reserva
 * entrará con el enlace que llega a ese email. Tampoco se responde nada que dependa del perfil.
 *
 * Quién es dueño de un email lo dice Auth. `public.users.email` es una copia que un cliente podría
 * llegar a cambiar: sirve de pista para no recorrer Auth, nunca como prueba.
 */

export interface CheckoutProfile {
    fullName: string
    phone: string
    dniNie: string
    address: string
    birthDate?: string | null
    licenseIssueDate?: string | null
}

export interface CheckoutCustomerInput {
    /** Normalizado y con el formato ya validado */
    email: string
    startDate: Date
    sessionUser: { id: string; email?: string | null; email_confirmed_at?: string | null } | null
    profile: CheckoutProfile
}

export type CheckoutCustomer =
    /** `accountCreated`: la cuenta es de esta petición, y se retira si la reserva no llega a crearse */
    | { userId: string; grantAccess: boolean; accountCreated?: boolean; rejection?: undefined }
    /** Solo con sesión del titular: su perfil no cumple los requisitos del conductor */
    | { rejection: string }

interface AuthAccount {
    id: string
    email_confirmed_at?: string | null
}

const AUTH_PAGE_SIZE = 1000
const MAX_AUTH_PAGES = 20
const MAX_EMAIL_CANDIDATES = 5

interface StoredProfile {
    id: string
    phone?: string | null
    dni_nie?: string | null
    address?: string | null
    full_name?: string | null
    birth_date?: string | null
    driver_license_issue_date?: string | null
}

/** Columnas del perfil. Nunca incluye `role` ni el estado de verificación */
function profileColumns(profile: CheckoutProfile): Record<string, string> {
    const columns: Record<string, string> = { full_name: profile.fullName || 'Cliente Utopia' }
    if (profile.phone) columns.phone = profile.phone
    if (profile.dniNie) columns.dni_nie = profile.dniNie
    if (profile.address) columns.address = profile.address
    if (profile.birthDate) columns.birth_date = profile.birthDate
    if (profile.licenseIssueDate) columns.driver_license_issue_date = profile.licenseIssueDate
    return columns
}

function driverRejection(stored: StoredProfile, startDate: Date): string | null {
    if (stored.birth_date) {
        const birth = new Date(stored.birth_date)
        if (!isNaN(birth.getTime()) && calculateAge(birth, startDate) < 25) {
            return 'El perfil de usuario registrado indica una edad inferior a 25 años cumplidos'
        }
    }
    if (stored.driver_license_issue_date) {
        const license = new Date(stored.driver_license_issue_date)
        if (!isNaN(license.getTime()) && calculateLicenseSeniorityYears(license, startDate) < 2) {
            return 'El perfil de usuario registrado indica una antigüedad de carnet B inferior a 2 años'
        }
    }
    return null
}

async function fillEmptyFields(db: SupabaseClient, stored: StoredProfile, profile: CheckoutProfile): Promise<void> {
    const updates: Record<string, string> = {}
    if (profile.phone && !stored.phone) updates.phone = profile.phone
    if (profile.dniNie && !stored.dni_nie) updates.dni_nie = profile.dniNie
    if (profile.address && !stored.address) updates.address = profile.address
    if (profile.fullName && !stored.full_name) updates.full_name = profile.fullName
    if (profile.birthDate && !stored.birth_date) updates.birth_date = profile.birthDate
    if (profile.licenseIssueDate && !stored.driver_license_issue_date) updates.driver_license_issue_date = profile.licenseIssueDate
    if (Object.keys(updates).length === 0) return

    const { error } = await db.from('users').update(updates).eq('id', stored.id)
    if (error) console.warn('Checkout: no se pudo completar el perfil:', error.message)
}

/**
 * Crea la fila de public.users si falta. Si ya existe, no la toca. Si falla, se para el checkout:
 * sin perfil, la documentación del cliente no tendría dónde guardarse y nadie lo vería hasta después
 * de cobrar. Antes de crear la reserva todavía no se ha bloqueado ni cobrado nada.
 */
async function insertProfileRow(db: SupabaseClient, id: string, email: string, columns: Record<string, string>): Promise<void> {
    const { error } = await db
        .from('users')
        .upsert({ full_name: 'Cliente Utopia', ...columns, id, email }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`No se pudo crear el perfil: ${error.message}`)
}

/** Perfil de una cuenta recién creada. Si no se guarda, retira la cuenta para que el reintento empiece de cero */
async function saveNewAccountProfile(db: SupabaseClient, id: string, email: string, columns: Record<string, string>): Promise<void> {
    try {
        await insertProfileRow(db, id, email, columns)
        // El alta en Auth puede haber creado ya la fila por trigger: la cuenta es de este checkout
        const { error } = await db.from('users').update(columns).eq('id', id)
        if (error) throw new Error(`No se pudo guardar el perfil: ${error.message}`)
    } catch (err) {
        await retireAccount(db, id)
        throw err
    }
}

/** Deshace una cuenta creada en esta misma petición, con su perfil. Nunca se usa con una cuenta ya existente */
export async function retireAccount(db: SupabaseClient, id: string): Promise<void> {
    try {
        const { error: rowErr } = await db.from('users').delete().eq('id', id)
        if (rowErr) console.error('Checkout: perfil que no se pudo retirar:', id, rowErr.message)

        const { error } = await db.auth.admin.deleteUser(id)
        if (error) console.error('Checkout: cuenta sin perfil que no se pudo retirar:', id, error.message)
    } catch (err) {
        console.error('Checkout: cuenta sin perfil que no se pudo retirar:', id, err)
    }
}

async function createAccount(db: SupabaseClient, email: string, profile: CheckoutProfile, password: string): Promise<string | null> {
    try {
        const { data, error } = await db.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: profile.fullName, phone: profile.phone },
        })
        if (data?.user) return data.user.id
        if (error) console.warn('Checkout: createUser no creó la cuenta:', error.code || error.message)
    } catch (err) {
        console.warn('Checkout: excepción en createUser:', err)
    }
    return null
}

/**
 * Comprueba en Auth las filas de public.users con ese email, que pueden estar falsificadas. Una fila
 * antigua con mayúsculas no coincide: no pasa nada, porque la búsqueda en Auth encuentra la cuenta.
 */
async function knownAuthUser(db: SupabaseClient, email: string): Promise<AuthAccount | null> {
    const { data: candidates, error } = await db.from('users').select('id').eq('email', email).limit(MAX_EMAIL_CANDIDATES)
    if (error) throw new Error(`No se pudo consultar el perfil: ${error.message}`)

    for (const { id } of candidates ?? []) {
        try {
            const { data } = await db.auth.admin.getUserById(id)
            if (data?.user?.email?.toLowerCase() === email) return data.user
        } catch (err) {
            // Sin confirmar no vale como cuenta: la decisión pasa a la búsqueda completa en Auth
            console.warn('Checkout: no se pudo comprobar una cuenta en Auth:', err)
        }
    }
    return null
}

async function findAuthUser(db: SupabaseClient, email: string): Promise<AuthAccount | null> {
    for (let page = 1; page <= MAX_AUTH_PAGES; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE })
        if (error) throw new Error(`No se pudo consultar Auth: ${error.message}`)

        const users = data?.users ?? []
        const match = users.find(u => u.email?.toLowerCase() === email)
        if (match) return match
        if (users.length < AUTH_PAGE_SIZE) return null
    }
    return null
}

/** La sesión viene de Auth: su email demuestra quién es, siempre que esté confirmado */
export function isSessionOf(sessionUser: CheckoutCustomerInput['sessionUser'], email: string): boolean {
    return Boolean(sessionUser?.email_confirmed_at) && sessionUser?.email?.toLowerCase() === email
}

/**
 * Una cuenta sin confirmar pudo registrarla cualquiera con un email ajeno y una contraseña que
 * conoce. El enlace de acceso confirmará ese email, así que antes de asociarle una reserva se le
 * cambia la contraseña por una aleatoria: solo entrará quien reciba el enlace. Las confirmadas no se tocan.
 */
async function secureUnconfirmedAccount(db: SupabaseClient, account: AuthAccount, password: string): Promise<void> {
    if (account.email_confirmed_at) return

    const { error } = await db.auth.admin.updateUserById(account.id, { password })
    if (error) throw new Error(`No se pudo asegurar la cuenta sin confirmar: ${error.message}`)
}

export async function resolveCheckoutCustomer(
    db: SupabaseClient,
    { email, startDate, sessionUser, profile }: CheckoutCustomerInput,
    password: string
): Promise<CheckoutCustomer> {
    if (isSessionOf(sessionUser, email)) {
        const { data: stored, error } = await db
            .from('users')
            .select('id, phone, dni_nie, address, full_name, birth_date, driver_license_issue_date')
            .eq('id', sessionUser!.id)
            .maybeSingle()
        if (error) throw new Error(`No se pudo consultar el perfil: ${error.message}`)

        if (!stored) {
            await insertProfileRow(db, sessionUser!.id, email, profileColumns(profile))
            return { userId: sessionUser!.id, grantAccess: true }
        }

        const rejection = driverRejection(stored, startDate)
        if (rejection) return { rejection }

        await fillEmptyFields(db, stored, profile)
        return { userId: stored.id, grantAccess: true }
    }

    const known = await knownAuthUser(db, email)
    if (known) {
        await secureUnconfirmedAccount(db, known, password)
        return { userId: known.id, grantAccess: false }
    }

    const createdId = await createAccount(db, email, profile, password)
    if (createdId) {
        await saveNewAccountProfile(db, createdId, email, profileColumns(profile))
        return { userId: createdId, grantAccess: true, accountCreated: true }
    }

    // La cuenta ya existe en Auth aunque no tenga perfil: se enlaza sin usar datos del formulario
    const account = await findAuthUser(db, email)
    if (!account) throw new Error('No se pudo resolver la cuenta del cliente')
    await secureUnconfirmedAccount(db, account, password)

    const { data: existingRow, error: rowErr } = await db.from('users').select('id').eq('id', account.id).maybeSingle()
    if (rowErr) throw new Error(`No se pudo consultar el perfil: ${rowErr.message}`)
    if (!existingRow) await insertProfileRow(db, account.id, email, {})
    return { userId: account.id, grantAccess: false }
}

/** ¿Ha llegado este email al límite de reservas sin pagar abiertas? */
export async function hasTooManyOpenBookings(db: SupabaseClient, email: string, now: Date = new Date()): Promise<boolean> {
    const since = new Date(now.getTime() - OPEN_PENDING_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { data, error } = await db
        .from('bookings')
        .select('id')
        .eq('customer_email', email)
        .eq('status', 'pending')
        .eq('payment_status', 'pending')
        .gte('created_at', since)
        .limit(MAX_OPEN_PENDING_PER_EMAIL)
    if (error) throw new Error(`No se pudieron contar las reservas abiertas: ${error.message}`)

    return (data?.length ?? 0) >= MAX_OPEN_PENDING_PER_EMAIL
}
