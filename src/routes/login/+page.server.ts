import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { logger } from '$lib/logger'
import { env } from '$env/dynamic/private'

const ADMIN_USERNAME = env.ADMIN_USERNAME || process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'secret'

export const load: PageServerLoad = async ({ locals, cookies }) => {
    // If already logged in, redirect to home
    const authCookie = cookies.get('admin_auth')
    if (authCookie === 'true') {
        throw redirect(303, '/')
    }
}

export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        const data = await request.formData()
        const username = data.get('username')
        const password = data.get('password')
        const requestId = locals.requestId || 'login-action'

        if (!username || !password) {
            return fail(400, { missing: true })
        }

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            logger.info({ requestId, username }, 'Admin login successful')

            cookies.set('admin_auth', 'true', {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            })

            throw redirect(303, '/')
        }

        logger.warn({ requestId, username }, 'Admin login failed - invalid credentials')
        return fail(400, { incorrect: true })
    }
}
