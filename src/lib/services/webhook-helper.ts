import { getServerEnv } from "$lib/env"
import { logger } from "$lib/logger"

export async function callBillingWebhook(payload: any) {
    const env = getServerEnv()
    const url = `${env.MAIN_APP_URL}/api/v1/admin/billing-state/update/webhook`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-token": env.INTERNAL_SECRET_TOKEN
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.text()
            logger.error(`Failed to call billing webhook [${response.status}] at ${url}: ${error}`)
            return false
        }

        return true
    } catch (error: any) {
        logger.error(`Error calling billing webhook: ${error.message}`)
        return false
    }
}
