import * as Sentry from "@sentry/node";
import cron from "node-cron";
import { trackCronJob } from "@applyai/sentry";

/**
 * Interface for scheduled task configuration
 */
export interface ScheduledTaskConfig {
  name: string;
  schedule: string;
  task: () => Promise<void>;
}

/**
 * Wrapper to track cron jobs with Sentry
 */
export function scheduleWithSentry(config: ScheduledTaskConfig): cron.ScheduledTask {
  const { name, schedule, task } = config;

  console.log(`⏰ Scheduling cron job: ${name} (${schedule})`);

  return cron.schedule(schedule, async () => {
    const startTime = Date.now();
    const executionId = `${name}-${Date.now()}`;

    return Sentry.withScope(async (scope) => {
      try {
        // Set Sentry context for this cron execution
        scope.setTag("cron_name", name);
        scope.setTag("cron_schedule", schedule);
        scope.setTag("service", "scheduler");
        scope.setTag("execution_id", executionId);

        scope.setContext("cron_execution", {
          name,
          schedule,
          execution_id: executionId,
          started_at: new Date().toISOString(),
        });

        // Add breadcrumb for cron start
        Sentry.addBreadcrumb({
          category: "cron",
          message: `Cron job started: ${name}`,
          level: "info",
          data: {
            cron_name: name,
            cron_schedule: schedule,
            execution_id: executionId,
          },
          timestamp: Date.now() / 1000,
        });

        console.log(`🚀 [${name}] Cron job started`);

        // Create transaction for this cron execution
        const transaction = Sentry.startInactiveSpan({
          name: `cron.${name}`,
          op: "cron.schedule",
        });

        try {
          // Execute the cron task
          await task();

          const duration = Date.now() - startTime;
          transaction.end();

          // Track successful cron job
          trackCronJob({
            jobName: name,
            schedule,
            status: "completed",
            duration,
            metadata: {
              execution_id: executionId,
            },
          });

          // Add completion breadcrumb
          Sentry.addBreadcrumb({
            category: "cron",
            message: `Cron job completed: ${name}`,
            level: "info",
            data: {
              cron_name: name,
              duration_ms: duration,
              execution_id: executionId,
            },
            timestamp: Date.now() / 1000,
          });

          console.log(`✅ [${name}] Cron job completed successfully (${duration}ms)`);
        } catch (executionError) {
          const duration = Date.now() - startTime;
          transaction.setStatus({ code: 2 });
          transaction.end();

          // Capture error with context
          Sentry.captureException(executionError, {
            tags: {
              cron_name: name,
              cron_schedule: schedule,
              execution_id: executionId,
              status: "failed",
            },
          });

          // Track failed cron job
          trackCronJob({
            jobName: name,
            schedule,
            status: "failed",
            duration,
            error: executionError as Error,
            metadata: {
              execution_id: executionId,
            },
          });

          console.error(
            `❌ [${name}] Cron job failed after ${duration}ms:`,
            executionError
          );

          throw executionError;
        }
      } catch (error) {
        console.error(`[${name}] Cron job error:`, error);
        // Error already captured above, just log
      }
    });
  });
}

/**
 * Create multiple scheduled tasks at once
 */
export function scheduleMultipleWithSentry(
  configs: ScheduledTaskConfig[]
): cron.ScheduledTask[] {
  return configs.map((config) => scheduleWithSentry(config));
}

export default scheduleWithSentry;
