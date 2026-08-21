import { prisma } from "@applyai/db";
import type { JobHandler } from "@applyai/queue";
import type { GreenhouseAutofillPayload } from "@applyai/jobs";
import { autofillGreenhouseApplication } from "../../services/greenhouse/GreenhouseAutofillService";

export class GreenhouseAutofillHandler implements JobHandler<GreenhouseAutofillPayload> {
  async execute(payload: GreenhouseAutofillPayload): Promise<void> {
    try {
      const application = await autofillGreenhouseApplication(
        payload.userId,
        payload.applicationId,
        { submit: payload.submit },
      );
      console.log(
        `[greenhouse] autofill completed: ${JSON.stringify({
          applicationId: application.id,
          status: application.status,
        })}`,
      );
    } catch (error) {
      const current = await prisma.user_job_applications.findFirst({
        where: {
          id: payload.applicationId,
          userId: payload.userId,
          platform: "greenhouse",
        },
      });
      if (current) {
        const metadata = (current.metadata || {}) as Record<string, unknown>;
        await prisma.user_job_applications.update({
          where: { id: current.id },
          data: {
            status: "action_required",
            statusUpdatedAt: new Date(),
            notes: `Greenhouse autofill failed and requires user action: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {
              ...metadata,
              greenhouseTag: "greenhouse",
              tags: ["greenhouse", "action_required"],
              autofill: {
                failedAt: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
                actionRequired: true,
              },
            } as any,
          },
        });
      }
      throw error;
    }
  }
}
