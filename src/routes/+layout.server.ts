import { env } from "$env/dynamic/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async () => {
    return {
        appVersion: env.APP_VERSION || "1.0.0-dev",
    }
};
