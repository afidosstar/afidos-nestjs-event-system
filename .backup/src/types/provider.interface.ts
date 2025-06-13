export interface ProviderConfig {
    driver: string;
    config: Record<string, any>;
    enabled?: boolean;
    timeout?: number;
    retries?: number;
  }
  
  export interface ProviderStats {
    name: string;
    channel: string;
    totalSent: number;
    totalFailed: number;
    successRate: number;
    averageResponseTime: number;
    lastHealthCheck: Date;
    isHealthy: boolean;
  }
  
  export interface ProviderMetrics {
    requestCount: number;
    errorCount: number;
    responseTime: number[];
    lastError?: string;
    lastSuccess?: Date;
  }