import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { logger } from '$lib/logger'
import { env } from '$env/dynamic/private'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * ENV
 * ADMIN_USERNAME=admin
 * ADMIN_PASSWORD_HASH=$2a$10$....
 */
const ADMIN_USERNAME = env.ADMIN_USERNAME
const ADMIN_PASSWORD_HASH = env.ADMIN_PASSWORD_HASH

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD_HASH not set')
}

/* ──────────────────────────────
   Simple in-memory rate limiter
   (OK for admin panel)
────────────────────────────── */
const attempts = new Map<string, { count: number; last: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function isRateLimited(ip: string) {
    const now = Date.now()
    const entry = attempts.get(ip)

    if (!entry) {
        attempts.set(ip, { count: 1, last: now })
        return false
    }

    if (now - entry.last > WINDOW_MS) {
        attempts.set(ip, { count: 1, last: now })
        return false
    }

    entry.count++
    entry.last = now

    return entry.count > MAX_ATTEMPTS
}

/* ──────────────────────────────
   IP resolver (Cloudflare-safe)
────────────────────────────── */
function getClientIp(request: Request): string {
    return (
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    )
}

/* ──────────────────────────────
   Page load
────────────────────────────── */
export const load: PageServerLoad = async ({ cookies }) => {
    const session = cookies.get('admin_session')
    if (session) {
        throw redirect(303, '/')
    }
}

/* ──────────────────────────────
   Actions
────────────────────────────── */
export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        const data = await request.formData()
        const username = data.get('username')?.toString()
        const password = data.get('password')?.toString()

        const requestId = locals.requestId ?? crypto.randomUUID()
        const ip = getClientIp(request)
        const ua = request.headers.get('user-agent') ?? 'unknown'

        if (!username || !password) {
            return fail(400, { missing: true })
        }

        logger.info(
            { requestId, username, ip, ua },
            'Admin login attempt'
        )

        /* Rate limit */
        if (isRateLimited(ip)) {
            logger.warn(
                { requestId, ip },
                'Admin login rate limited'
            )
            return fail(429, { rateLimited: true })
        }

        /* Credential check */
        const validUser = username === ADMIN_USERNAME
        const validPass =
            validUser && (await bcrypt.compare(password, ADMIN_PASSWORD_HASH))

        if (!validPass) {
            logger.warn(
                { requestId, username, ip },
                'Admin login failed'
            )
            return fail(400, { incorrect: true })
        }

        /* Success */
        const sessionToken = crypto.randomBytes(32).toString('hex')

        cookies.set('admin_session', sessionToken, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: true,
            maxAge: 60 * 60 * 8 // 8 hours
        })

        logger.info(
            { requestId, username, ip },
            'Admin login successful'
        )

        throw redirect(303, '/')
    }
}
