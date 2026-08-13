import { Worker, Job } from "bullmq";
import * as Sentry from "@sentry/node";
import { trackJob } from "@applyai/sentry";
import { connection } from "./connection";
import { QueueName } from "./queueNames";

export interface JobHandler<T = any> {
  execute(payload: T): Promise<void>;
}

export type JobRegistry = Map<string, JobHandler<any>>;

interface SentryWorkerFactoryOptions {
  queue: QueueName;
  registry: JobRegistry;
  concurrency?: number;
  lockDuration?: number;
}

/**
 * Create a worker with comprehensive Sentry error tracking and monitoring
 */
export function createSentryWorker({
  queue,
  registry,
  concurrency = 5,
  lockDuration = 30000,
}: SentryWorkerFactoryOptions) {

  if (!connection) {
    throw new Error('Redis is disabled; queue operations are unavailable in this environment.');
  }  const worker = new Worker(
    queue,
    async (job: Job) => {
      const jobId = job.id;
      const jobName = job.name;
      const startTime = Date.now();

      return Sentry.withScope(async (scope) => {
        try {
          // Set Sentry context for this job
          scope.setTag("queue_name", queue);
          scope.setTag("job_name", jobName);
          scope.setTag("job_id", jobId);
          scope.setTag("service", "worker");
          scope.setTag("attempt", job.attemptsMade + 1);
          scope.setTag("max_attempts", job.opts.attempts || 1);

          // Add job metadata to context
          scope.setContext("job_context", {
            id: jobId,
            name: jobName,
            queue: queue,
            attempts: job.attemptsMade + 1,
            max_attempts: job.opts.attempts || 1,
            timestamp: new Date(job.timestamp || Date.now()).toISOString(),
            payload_size: JSON.stringify(job.data).length,
          });

          // Add job data (limited size to avoid noise)
          const jobDataStr = JSON.stringify(job.data);
          if (jobDataStr.length < 2000) {
            scope.setContext("job_data", JSON.parse(jobDataStr));
          }

          // Add breadcrumb for job start
          Sentry.addBreadcrumb({
            category: "job",
            message: `Job started: ${jobName}`,
            level: "info",
            data: {
              job_id: jobId,
              job_name: jobName,
              queue: queue,
              attempt: job.attemptsMade + 1,
            },
            timestamp: Date.now() / 1000,
          });

          // Get and execute handler
          const handler = registry.get(jobName);
          if (!handler) {
            throw new Error(`No handler registered for job "${jobName}"`);
          }

          // Execute with transaction tracking
          const transaction = Sentry.startInactiveSpan({
            name: `job.${jobName}`,
            op: "queue.job",
          });

          try {
            await handler.execute(job.data);

            const duration = Date.now() - startTime;
            transaction.end();

            // Track successful job
            trackJob({
              jobId,
              jobName,
              status: "completed",
              duration,
              metadata: {
                queue: queue,
                attempt: job.attemptsMade + 1,
              },
            });

            // Add completion breadcrumb
            Sentry.addBreadcrumb({
              category: "job",
              message: `Job completed: ${jobName}`,
              level: "info",
              data: {
                job_id: jobId,
                job_name: jobName,
                duration_ms: duration,
                queue: queue,
              },
              timestamp: Date.now() / 1000,
            });

            console.log(
              `âœ… [${queue}] Job completed: ${jobName} (${jobId}) - ${duration}ms`
            );
          } catch (executionError) {
            const duration = Date.now() - startTime;
            transaction.setStatus({ code: 2 });
            transaction.end();

            // Capture with context
            Sentry.captureException(executionError, {
              tags: {
                job_id: jobId,
                job_name: jobName,
                queue: queue,
                status: "failed",
                attempt: job.attemptsMade + 1,
              },
            });

            // Track failed job
            trackJob({
              jobId,
              jobName,
              status: "failed",
              duration,
              error: executionError as Error,
              metadata: {
                queue: queue,
                attempt: job.attemptsMade + 1,
                will_retry: job.opts.attempts 
                  ? job.attemptsMade < job.opts.attempts 
                  : false,
              },
            });

            throw executionError;
          }
        } catch (error) {
          const duration = Date.now() - startTime;

          // Check if this is a retry
          const willRetry = job.opts.attempts
            ? job.attemptsMade < job.opts.attempts
            : false;

          if (willRetry) {
            // Track retry
            trackJob({
              jobId,
              jobName,
              status: "retried",
              duration,
              error: error as Error,
              metadata: {
                queue: queue,
                attempt: job.attemptsMade + 1,
                next_attempt: job.attemptsMade + 2,
              },
            });

            console.warn(
              `âš ï¸  [${queue}] Job will retry: ${jobName} (${jobId}) - Attempt ${
                job.attemptsMade + 1
              }`
            );
          } else {
            console.error(
              `âŒ [${queue}] Job failed: ${jobName} (${jobId}) - ${duration}ms`
            );
          }

          throw error;
        }
      });
    },
    {
      connection,
      concurrency,
      lockDuration,
    }
  );

  // Job event listeners with Sentry
  worker.on("completed", (job: Job) => {
    Sentry.addBreadcrumb({
      category: "job_event",
      message: `Job completed: ${job.name}`,
      level: "info",
      data: {
        job_id: job.id,
        job_name: job.name,
      },
      timestamp: Date.now() / 1000,
    });
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    if (!job) return;

    Sentry.addBreadcrumb({
      category: "job_event",
      message: `Job failed: ${job.name}`,
      level: "error",
      data: {
        job_id: job.id,
        job_name: job.name,
        error_message: err.message,
        attempts: job.attemptsMade + 1,
      },
      timestamp: Date.now() / 1000,
    });

    console.error(`[${queue}] failed -> ${job.name}`, err);
  });

  worker.on("error", (err: Error) => {
    Sentry.captureException(err, {
      tags: {
        error_source: "worker_event",
        queue: queue,
      },
    });

    Sentry.addBreadcrumb({
      category: "worker_error",
      message: `Worker error on queue ${queue}`,
      level: "error",
      data: {
        queue: queue,
        error_message: err.message,
      },
      timestamp: Date.now() / 1000,
    });

    console.error(`[${queue}] Worker error:`, err);
  });

  worker.on("stalled", (jobId: string) => {
    console.warn(`[${queue}] Job stalled: ${jobId}`);
    Sentry.addBreadcrumb({
      category: "job_event",
      message: `Job stalled: ${jobId}`,
      level: "warning",
      data: {
        job_id: jobId,
        queue: queue,
      },
      timestamp: Date.now() / 1000,
    });
  });

  worker.on("active", (job: Job) => {
    Sentry.addBreadcrumb({
      category: "job_event",
      message: `Job started processing: ${job.name}`,
      level: "info",
      data: {
        job_id: job.id,
        job_name: job.name,
      },
      timestamp: Date.now() / 1000,
    });
  });

  console.log(
    `ðŸš€ Created Sentry-enabled worker for queue: ${queue} (concurrency: ${concurrency})`
  );

  return worker;
}

export default createSentryWorker;

