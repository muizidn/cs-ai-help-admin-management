
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { libraryExportImportService } from "$lib/services/library-export-import";
import { createChildLogger } from "$lib/logger";

export const GET: RequestHandler = async ({ locals }) => {
    const requestLogger = createChildLogger({
        requestId: locals.requestId,
        endpoint: "GET /api/library-templates/export",
    });

    try {
        requestLogger.info("Starting library export");
        const zipBuffer = await libraryExportImportService.exportLibrary();

        return new Response(zipBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="library_export_${new Date().toISOString().split("T")[0]}.zip"`,
            },
        });
    } catch (error) {
        requestLogger.error({ error }, "Library export failed");
        return json(
            {
                status: "error",
                message: "Failed to export library",
            },
            { status: 500 }
        );
    }
};
