import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly eventsEmitted: Counter<string>;
  private readonly notificationsSent: Counter<string>;
  private readonly processingDuration: Histogram<string>;
  private readonly queueDepth: Gauge<string>;
  private readonly activeWorkers: Gauge<string>;

  constructor() {
    // Clear any existing metrics to avoid conflicts
    register.clear();

    this.eventsEmitted = new Counter({
      name: 'events_emitted_total',
      help: 'Total number of events emitted',
      labelNames: ['event_type', 'mode', 'status'],
    });

    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['channel', 'status', 'provider'],
    });

    this.processingDuration = new Histogram({
      name: 'event_processing_duration_seconds',
      help: 'Event processing duration in seconds',
      labelNames: ['event_type', 'mode'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.queueDepth = new Gauge({
      name: 'queue_jobs_waiting',
      help: 'Number of jobs waiting in queue',
      labelNames: ['queue_name'],
    });

    this.activeWorkers = new Gauge({
      name: 'active_workers_count',
      help: 'Number of active workers',
      labelNames: ['worker_type'],
    });
  }

  incrementEventsEmitted(eventType: string, mode: string, status: string) {
    this.eventsEmitted.inc({ event_type: eventType, mode, status });
  }

  incrementNotificationsSent(channel: string, status: string, provider: string) {
    this.notificationsSent.inc({ channel, status, provider });
  }

  recordProcessingDuration(eventType: string, mode: string, duration: number) {
    this.processingDuration.observe({ event_type: eventType, mode }, duration);
  }

  setQueueDepth(queueName: string, depth: number) {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }

  setActiveWorkers(workerType: string, count: number) {
    this.activeWorkers.set({ worker_type: workerType }, count);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}