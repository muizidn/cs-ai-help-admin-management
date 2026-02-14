
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { libraryExportImportService } from "$lib/services/library-export-import";
import { createChildLogger } from "$lib/logger";

export const POST: RequestHandler = async ({ request, locals }) => {
    const requestLogger = createChildLogger({
        requestId: locals.requestId,
        endpoint: "POST /api/library-templates/import",
    });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return json(
                {
                    status: "error",
                    message: "No file provided",
                },
                { status: 400 }
            );
        }

        if (!file.name.endsWith(".zip")) {
            return json(
                {
                    status: "error",
                    message: "File must be a zip archive",
                },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        requestLogger.info({ filename: file.name, size: file.size }, "Starting library import");

        const stats = await libraryExportImportService.importLibrary(buffer);

        requestLogger.info({ stats }, "Library import completed");

        return json({
            status: "success",
            data: stats,
        });
    } catch (error) {
        requestLogger.error({ error }, "Library import failed");
        return json(
            {
                status: "error",
                message: "Failed to import library",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
};
