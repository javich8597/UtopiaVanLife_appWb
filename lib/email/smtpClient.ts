import net from 'node:net'
import tls from 'node:tls'

export interface SmtpConfig {
    host: string
    port: number
    user: string
    pass: string
    from: string
    replyTo?: string
}

export interface SmtpMessage {
    to: string
    subject: string
    html: string
    text?: string
    replyTo?: string
}

const DEFAULT_SMTP_TIMEOUT_MS = 12000

/** Lee la configuración SMTP desde variables de entorno; devuelve null si faltan credenciales */
export function getSmtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
    const user = env.SMTP_USER?.trim()
    const pass = env.SMTP_PASS?.trim()
    if (!user || !pass) return null

    const host = env.SMTP_HOST?.trim() || 'smtp.dondominio.com'
    const parsedPort = Number(env.SMTP_PORT?.trim() || '465')
    const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 465
    const from = env.SMTP_FROM?.trim() || `Utopia Van Life <${user}>`
    const replyTo = env.SMTP_REPLY_TO?.trim() || user

    return { host, port, user, pass, from, replyTo }
}

export function isSmtpConfigured(env: Record<string, string | undefined> = process.env): boolean {
    return getSmtpConfig(env) !== null
}

function encodeHeaderUtf8(value: string): string {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function extractEmailAddress(headerOrEmail: string): string {
    const match = headerOrEmail.match(/<([^>]+)>/)
    return (match ? match[1] : headerOrEmail).trim()
}

function formatFromHeader(from: string): string {
    const match = from.match(/^(.+?)\s*<([^>]+)>$/)
    if (!match) return `<${extractEmailAddress(from)}>`
    const displayName = match[1].trim().replace(/^"|"$/g, '')
    const address = match[2].trim()
    return `${encodeHeaderUtf8(displayName)} <${address}>`
}

/** Normaliza saltos de línea a CRLF y aplica dot-stuffing SMTP (RFC 5321) */
function encodeSmtpBody(raw: string): string {
    return raw
        .replace(/\r?\n/g, '\r\n')
        .replace(/^\./gm, '..')
}

function buildMimePayload(config: SmtpConfig, message: SmtpMessage): string {
    const boundary = `uvl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const replyTo = message.replyTo || config.replyTo
    const plainText = message.text || message.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const headers = [
        `From: ${formatFromHeader(config.from)}`,
        `To: <${extractEmailAddress(message.to)}>`,
        ...(replyTo ? [`Reply-To: <${extractEmailAddress(replyTo)}>`] : []),
        `Subject: ${encodeHeaderUtf8(message.subject)}`,
        `Date: ${new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ]

    const parts = [
        `--${boundary}`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(plainText, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(message.html, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
        `--${boundary}--`,
        ``,
    ]

    return encodeSmtpBody([...headers, ``, ...parts].join('\r\n'))
}

class SmtpLineReader {
    private buffer = ''
    private queue: Array<{ code: number; lines: string[] }> = []
    private pendingLines: string[] = []
    private waiter: {
        resolve: (res: { code: number; lines: string[] }) => void
        reject: (err: Error) => void
    } | null = null
    private closedError: Error | null = null

    constructor(private socket: net.Socket | tls.TLSSocket) {
        this.attach(socket)
    }

    attach(socket: net.Socket | tls.TLSSocket) {
        this.socket = socket
        socket.setEncoding('utf8')
        socket.on('data', (chunk: string) => this.onData(chunk))
        socket.on('error', (err) => this.fail(err))
        socket.on('close', () => this.fail(new Error('Conexión SMTP cerrada inesperadamente')))
    }

    private fail(err: Error) {
        this.closedError = err
        if (this.waiter) {
            const { reject } = this.waiter
            this.waiter = null
            reject(err)
        }
    }

    private onData(chunk: string) {
        this.buffer += chunk
        let idx: number
        while ((idx = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, idx).replace(/\r$/, '')
            this.buffer = this.buffer.slice(idx + 1)
            this.pendingLines.push(line)

            const match = line.match(/^(\d{3})([ -])/)
            if (match && match[2] === ' ') {
                const res = { code: Number(match[1]), lines: this.pendingLines }
                this.pendingLines = []
                if (this.waiter) {
                    const { resolve } = this.waiter
                    this.waiter = null
                    resolve(res)
                } else {
                    this.queue.push(res)
                }
            }
        }
    }

    nextResponse(): Promise<{ code: number; lines: string[] }> {
        if (this.queue.length > 0) {
            return Promise.resolve(this.queue.shift()!)
        }
        if (this.closedError) {
            return Promise.reject(this.closedError)
        }
        return new Promise((resolve, reject) => {
            this.waiter = { resolve, reject }
        })
    }

    async sendCommand(cmd: string, expectedCodes: number[]): Promise<{ code: number; lines: string[] }> {
        this.socket.write(`${cmd}\r\n`, 'utf8')
        const res = await this.nextResponse()
        if (!expectedCodes.includes(res.code)) {
            throw new Error(`SMTP error (${res.code}) en comando "${cmd.split(' ')[0]}": ${res.lines.join(' | ')}`)
        }
        return res
    }
}

/** Envía un correo HTML mediante SMTP sobre TLS (puerto 465) o STARTTLS (puerto 587) */
export async function sendSmtpMail(
    config: SmtpConfig,
    message: SmtpMessage,
    timeoutMs: number = DEFAULT_SMTP_TIMEOUT_MS
): Promise<void> {
    const useImplicitTls = config.port === 465
    let socket: net.Socket | tls.TLSSocket = useImplicitTls
        ? tls.connect({ host: config.host, port: config.port, servername: config.host })
        : net.connect({ host: config.host, port: config.port })

    socket.setTimeout(timeoutMs, () => {
        socket.destroy(new Error(`Timeout SMTP tras ${timeoutMs}ms conectando a ${config.host}:${config.port}`))
    })

    const reader = new SmtpLineReader(socket)

    try {
        const greeting = await reader.nextResponse()
        if (greeting.code !== 220) {
            throw new Error(`Saludo SMTP inesperado (${greeting.code}): ${greeting.lines.join(' | ')}`)
        }

        const domain = extractEmailAddress(config.from).split('@')[1] || 'utopiavanlife.com'
        let ehlo = await reader.sendCommand(`EHLO ${domain}`, [250])

        if (!useImplicitTls) {
            const supportsStartTls = ehlo.lines.some((line) => /STARTTLS/i.test(line))
            if (!supportsStartTls) {
                throw new Error(`El servidor SMTP ${config.host}:${config.port} no soporta STARTTLS`)
            }
            await reader.sendCommand('STARTTLS', [220])
            socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
                const upgraded = tls.connect(
                    { socket, servername: config.host },
                    () => resolve(upgraded)
                )
                upgraded.once('error', reject)
            })
            socket.setTimeout(timeoutMs, () => {
                socket.destroy(new Error(`Timeout SMTP tras ${timeoutMs}ms`))
            })
            reader.attach(socket)
            ehlo = await reader.sendCommand(`EHLO ${domain}`, [250])
        }

        await reader.sendCommand('AUTH LOGIN', [334])
        await reader.sendCommand(Buffer.from(config.user, 'utf8').toString('base64'), [334])
        await reader.sendCommand(Buffer.from(config.pass, 'utf8').toString('base64'), [235])

        const envelopeFrom = extractEmailAddress(config.from)
        const envelopeTo = extractEmailAddress(message.to)

        await reader.sendCommand(`MAIL FROM:<${envelopeFrom}>`, [250])
        await reader.sendCommand(`RCPT TO:<${envelopeTo}>`, [250, 251])
        await reader.sendCommand('DATA', [354])

        const payload = buildMimePayload(config, message)
        socket.write(`${payload}\r\n.\r\n`, 'utf8')
        const dataRes = await reader.nextResponse()
        if (dataRes.code !== 250) {
            throw new Error(`SMTP rechazó el cuerpo del correo (${dataRes.code}): ${dataRes.lines.join(' | ')}`)
        }

        await reader.sendCommand('QUIT', [221]).catch(() => undefined)
    } finally {
        socket.removeAllListeners()
        if (!socket.destroyed) socket.destroy()
    }
}
