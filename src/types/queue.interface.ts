export interface QueueJobData {
    eventId: string;
    eventType: string;
    payload: any;
    correlationId: string;
    eventTypeConfig: any;
    retryAttempt?: number;
    priority?: number;
  }
  
  export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }
  
  export interface JobProgress {
    percentage: number;
    message?: string;
    data?: any;
  }