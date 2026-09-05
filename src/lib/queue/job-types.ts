export const QUEUE_NAMES = [
  "discover_businesses",
  "crawl_website",
  "analyze_business",
  "generate_report",
  "send_email",
  "process_reply",
  "analyze_reviews",
  "sync_connector",
  "run_ai_agent",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export interface DiscoverBusinessesJob {
  organizationId: string;
  requestedBy: string;
  country: string;
  city?: string;
  province?: string;
  postalCode?: string;
  zone?: string;
  category: string;
  sector?: string;
  language?: string;
  sizeHint?: string;
  maxResults: number;
  opportunityCriteria?: "any" | "high_opportunity_only";
}

export interface CrawlWebsiteJob {
  businessId: string;
}

export interface AnalyzeBusinessJob {
  businessId: string;
}

export interface GenerateReportJob {
  businessId: string;
  auditId?: string;
  requestedBy: string;
}

export interface SendEmailJob {
  emailId: string;
}

export interface ProcessReplyJob {
  organizationId: string;
  businessId?: string;
  emailId?: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
}

export interface AnalyzeReviewsJob {
  businessId: string;
}

export interface SyncConnectorJob {
  connectorId: string;
}

export interface RunAiAgentJob {
  agentId: string;
  reason: string;
}

export interface JobPayloadMap {
  discover_businesses: DiscoverBusinessesJob;
  crawl_website: CrawlWebsiteJob;
  analyze_business: AnalyzeBusinessJob;
  generate_report: GenerateReportJob;
  send_email: SendEmailJob;
  process_reply: ProcessReplyJob;
  analyze_reviews: AnalyzeReviewsJob;
  sync_connector: SyncConnectorJob;
  run_ai_agent: RunAiAgentJob;
}
