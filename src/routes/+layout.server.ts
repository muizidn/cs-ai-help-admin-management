import type { LayoutServerLoad } from "./$types"
import { getServerEnv } from "../lib/env"

export const load: LayoutServerLoad = async () => {
    const env = getServerEnv()
    return {
        appVersion: env.APP_VERSION || process.env.NODE_ENV,
    }
};
