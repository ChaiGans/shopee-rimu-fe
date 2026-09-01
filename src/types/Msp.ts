export type PipelineRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | string;

export type PipelineStage =
  | "SALES_FORECASTING"
  | "ORDER_REPLENISHMENT"
  | "SSOA"
  | string;

export interface PipelineRunAccepted {
  pipeline_run_id: string;
  status: PipelineRunStatus;
  current_stage: PipelineStage;
  poll_url: string;
}

export interface PipelineRunListItem {
  pipeline_run_id: string;
  shop_id: number;
  status: PipelineRunStatus;
  current_stage: PipelineStage;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
  execution_owner?: string;
  controller_run_id?: string;
  last_event_sequence?: number;
}

export interface PipelineRunListPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface PipelineRunListData {
  items: PipelineRunListItem[];
  pagination: PipelineRunListPagination;
}

export interface PipelineRunArtifact {
  name: string;
  path: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineRunStageState {
  stage: PipelineStage;
  status: string;
  module_job_id?: string;
  output_manifest?: PipelineRunArtifact[];
  summary?: unknown;
  error?: unknown;
  attempt?: number;
  updated_at?: string;
  finished_at?: string;
}

export interface PipelineRunView {
  pipeline_run_id: string;
  shop_id: number;
  status: PipelineRunStatus;
  current_stage: PipelineStage;
  request_payload?: Record<string, unknown>;
  stage_states?: Record<string, PipelineRunStageState>;
  final_result?: Record<string, unknown>;
  error?: Record<string, unknown>;
  error_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
  execution_owner?: string;
  controller_run_id?: string;
  last_event_sequence?: number;
}

export interface PipelineRunStageMetric {
  label: string;
  value: unknown;
  unit?: string;
}

export interface PipelineRunStageChart {
  id: string;
  type: string;
  title: string;
  x_key: string;
  y_key: string;
  data: Array<Record<string, unknown>>;
}

export interface PipelineRunStageExplanation {
  title: string;
  body: string;
}

export interface PipelineRunStageInput {
  name: string;
  description: string;
  artifact_name?: string;
  format?: string;
}

export interface PipelineRunStageArtifact {
  name: string;
  artifact_name: string;
  format: string;
  role: string;
  description: string;
}

export interface PipelineRunStageDecisionTable {
  id: string;
  title: string;
  description?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export interface PipelineRunStageResult {
  stage: PipelineStage;
  label: string;
  status: PipelineRunStatus;
  summary: string;
  metrics: PipelineRunStageMetric[];
  charts: PipelineRunStageChart[];
  explanations: PipelineRunStageExplanation[];
  inputs: PipelineRunStageInput[];
  outputs_to_next_stage: PipelineRunStageArtifact[];
  artifacts: PipelineRunStageArtifact[];
  runtime_config?: Record<string, unknown>;
  warnings?: string[];
  decision_summary?: Record<string, unknown>;
  decision_tables?: PipelineRunStageDecisionTable[];
  error?: Record<string, unknown>;
}

export interface PipelineRunStageResults {
  pipeline_run_id: string;
  status: PipelineRunStatus;
  current_stage: PipelineStage;
  stages: PipelineRunStageResult[];
}

export interface PipelineRunArtifactsData {
  pipeline_run_id: string;
  artifacts: PipelineRunArtifact[];
}

export interface PipelineRunArtifactContent {
  pipeline_run_id: string;
  artifact: PipelineRunArtifact;
  content_type: string;
  columns?: string[];
  rows?: Array<Record<string, string>>;
  raw?: string;
  metadata?: Record<string, unknown>;
}

export interface ShopeePipelineUploadFiles {
  orderMapping: File;
  supplierInfo: File;
  skuMaster: File;
  businessConstraints: File;
}

export type MspNumericPolicyKey =
  | "rmb_to_idr_rate"
  | "volume_cost_rate"
  | "netsell_multiplier"
  | "netsell_fixed_cost"
  | "fallback_hpp_multiplier"
  | "top_k"
  | "business_capital"
  | "warehouse_capacity"
  | "warehouse_cost_per_volume"
  | "demand_tolerance_alpha"
  | "demand_tolerance_beta"
  | "overbuy_risk_multiplier";

export type MspPolicyValues = Record<MspNumericPolicyKey, string> & {
  milp_selection_method: string;
  enforce_supplier_order_price_constraints: "default" | "true" | "false";
};

export type MspUploadFileKey = keyof ShopeePipelineUploadFiles;
