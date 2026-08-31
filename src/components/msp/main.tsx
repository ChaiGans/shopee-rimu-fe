import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  RefreshCw,
  SquareArrowOutUpRight,
  StopCircle,
  Upload,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  cancelPipelineRun,
  getPipelineArtifactContent,
  getPipelineArtifacts,
  getPipelineRun,
  getPipelineRuns,
  getPipelineStageResults,
  uploadAndStartPipeline,
} from "@/services/mspService";
import { getShops } from "@/services/shopService";
import {
  PipelineRunArtifact,
  PipelineRunArtifactContent,
  PipelineRunListItem,
  PipelineRunStageArtifact,
  PipelineRunStageResult,
  PipelineRunStageResults,
  PipelineRunStatus,
  PipelineRunView,
  PipelineStage,
  ShopeePipelineUploadFiles,
} from "@/types/Msp";
import { Shop } from "@/types/Shop";

const SELECTED_SHOP_STORAGE_KEY = "msp_selected_shop_id";
const HISTORY_PAGE_SIZE = 20;
const POLL_DELAY_MS = 3000;
const MAX_ARTIFACT_PREVIEW_ROWS = 200;

const PIPELINE_STAGES: Array<{
  key: PipelineStage;
  label: string;
  description: string;
}> = [
  {
    key: "SALES_FORECASTING",
    label: "Sales Forecasting",
    description: "Forecast demand from the Shopee sales history.",
  },
  {
    key: "ORDER_REPLENISHMENT",
    label: "Order Replenishment",
    description: "Turn forecast demand and current stock into purchase quantities.",
  },
  {
    key: "SSOA",
    label: "Supplier Selection",
    description: "Rank suppliers and allocate the recommended procurement order.",
  },
];

const NUMERIC_POLICY_FIELDS = [
  { key: "rmb_to_idr_rate", label: "RMB → IDR rate", rule: "positive", placeholder: "2300" },
  { key: "volume_cost_rate", label: "Volume cost rate", rule: "nonnegative", placeholder: "0" },
  { key: "netsell_multiplier", label: "Net-selling multiplier", rule: "positive", placeholder: "0.95" },
  { key: "netsell_fixed_cost", label: "Net-selling fixed cost", rule: "nonnegative", placeholder: "0" },
  { key: "fallback_hpp_multiplier", label: "Fallback HPP multiplier", rule: "positive", placeholder: "1.2" },
  { key: "top_k", label: "Top-K suppliers", rule: "integer", placeholder: "10" },
  { key: "business_capital", label: "Business capital", rule: "positive", placeholder: "1000000" },
  { key: "warehouse_capacity", label: "Warehouse capacity", rule: "positive", placeholder: "1000" },
  { key: "warehouse_cost_per_volume", label: "Warehouse cost per volume", rule: "nonnegative", placeholder: "0" },
  { key: "demand_tolerance_alpha", label: "Demand tolerance α", rule: "nonnegative", placeholder: "0.9" },
  { key: "demand_tolerance_beta", label: "Demand tolerance β", rule: "nonnegative", placeholder: "1.1" },
  { key: "overbuy_risk_multiplier", label: "Overbuy risk multiplier", rule: "nonnegative", placeholder: "1.0" },
] as const;

type NumericPolicyKey = (typeof NUMERIC_POLICY_FIELDS)[number]["key"];
type PolicyValues = Record<NumericPolicyKey, string> & {
  milp_selection_method: string;
  enforce_supplier_order_price_constraints: "default" | "true" | "false";
};
type UploadFileKey = keyof ShopeePipelineUploadFiles;
type UploadFileState = Record<UploadFileKey, File | null>;
type NormalizedStageStatus = "pending" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

const INITIAL_POLICY: PolicyValues = {
  milp_selection_method: "MOST_FREQUENT",
  rmb_to_idr_rate: "",
  volume_cost_rate: "",
  netsell_multiplier: "",
  netsell_fixed_cost: "",
  fallback_hpp_multiplier: "",
  top_k: "",
  business_capital: "",
  warehouse_capacity: "",
  warehouse_cost_per_volume: "",
  demand_tolerance_alpha: "",
  demand_tolerance_beta: "",
  overbuy_risk_multiplier: "",
  enforce_supplier_order_price_constraints: "default",
};

const UPLOAD_FIELDS: Array<{
  key: UploadFileKey;
  fieldName: string;
  label: string;
  description: string;
}> = [
  {
    key: "orderMapping",
    fieldName: "order_mapping",
    label: "Reviewed order mapping CSV",
    description: "The approved 1688-to-Shopee mapper export.",
  },
  {
    key: "supplierInfo",
    fieldName: "supplier_info",
    label: "Supplier profile CSV",
    description: "Supplier experience, pricing, and platform profile data.",
  },
  {
    key: "skuMaster",
    fieldName: "sku_master",
    label: "SKU master CSV",
    description: "Shopee SKU pricing and package dimensions.",
  },
  {
    key: "businessConstraints",
    fieldName: "business_constraints",
    label: "Business constraints CSV",
    description: "Supplier/SKU minimum and maximum order quantities.",
  },
];

const isActiveStatus = (status: unknown): boolean => {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "queued" || normalized === "running";
};

const normalizeStageStatus = (status: unknown): NormalizedStageStatus => {
  switch (String(status ?? "").toLowerCase()) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
    case "finished":
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
};

const statusLabel = (status: NormalizedStageStatus | PipelineRunStatus): string => {
  switch (normalizeStageStatus(status)) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
};

const statusClassName = (status: NormalizedStageStatus | PipelineRunStatus): string => {
  switch (normalizeStageStatus(status)) {
    case "queued":
      return "bg-amber-100 text-amber-800";
    case "running":
      return "bg-blue-100 text-blue-800";
    case "succeeded":
      return "bg-emerald-100 text-emerald-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const jsonText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? "-";
  } catch {
    return String(value);
  }
};

const buildPipelineConfig = ({
  lookbackDays,
  useDateRange,
  rangeStart,
  rangeEnd,
  forceRefresh,
  policy,
}: {
  lookbackDays: string;
  useDateRange: boolean;
  rangeStart: string;
  rangeEnd: string;
  forceRefresh: boolean;
  policy: PolicyValues;
}): { config: Record<string, unknown> | null; error: string | null } => {
  const config: Record<string, unknown> = {};
  if (useDateRange) {
    if (!rangeStart || !rangeEnd) {
      return { config: null, error: "Both sales history dates are required." };
    }
    if (rangeEnd < rangeStart) {
      return { config: null, error: "Sales history end date must be on or after the start date." };
    }
    config.range_start = rangeStart;
    config.range_end = rangeEnd;
  } else {
    const parsedLookback = Number(lookbackDays);
    if (!Number.isInteger(parsedLookback) || parsedLookback < 1 || parsedLookback > 730) {
      return { config: null, error: "Lookback must be a whole number between 1 and 730 days." };
    }
    config.lookback_days = parsedLookback;
  }
  if (forceRefresh) {
    config.force_refresh = true;
  }

  const selectionMethod = policy.milp_selection_method.trim();
  if (!selectionMethod) {
    return { config: null, error: "MILP selection method is required." };
  }
  const additionalSettings: Record<string, unknown> = {
    milp_selection_method: selectionMethod,
  };
  for (const field of NUMERIC_POLICY_FIELDS) {
    const rawValue = policy[field.key].trim();
    if (rawValue === "") {
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return { config: null, error: `${field.label} must be a finite number.` };
    }
    if (field.rule === "positive" && value <= 0) {
      return { config: null, error: `${field.label} must be greater than zero.` };
    }
    if (field.rule === "nonnegative" && value < 0) {
      return { config: null, error: `${field.label} must be zero or greater.` };
    }
    if (field.rule === "integer" && (!Number.isInteger(value) || value < 1)) {
      return { config: null, error: `${field.label} must be a positive whole number.` };
    }
    additionalSettings[field.key] = value;
  }
  if (policy.enforce_supplier_order_price_constraints !== "default") {
    additionalSettings.enforce_supplier_order_price_constraints =
      policy.enforce_supplier_order_price_constraints === "true";
  }
  config.additional_settings = additionalSettings;

  return { config, error: null };
};

function StatusPill({ status }: { status: NormalizedStageStatus | PipelineRunStatus }) {
  const normalized = normalizeStageStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(normalized)}`}
      data-status={normalized}
    >
      {normalized === "running" || normalized === "queued" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : normalized === "succeeded" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : normalized === "failed" ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : normalized === "cancelled" ? (
        <Ban className="h-3.5 w-3.5" />
      ) : (
        <Circle className="h-3.5 w-3.5" />
      )}
      {statusLabel(normalized)}
    </span>
  );
}

function JsonPanel({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-3 text-xs text-slate-100">
      {jsonText(value)}
    </pre>
  );
}

function UploadField({
  field,
  file,
  disabled,
  onChange,
}: {
  field: (typeof UPLOAD_FIELDS)[number];
  file: File | null;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const id = `msp-upload-${field.fieldName}`;
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-4">
      <Label htmlFor={id}>{field.label}</Label>
      <p className="text-xs text-slate-500">{field.description}</p>
      <Input
        id={id}
        type="file"
        accept=".csv,text/csv"
        onChange={onChange}
        disabled={disabled}
      />
      <p className="flex items-center gap-1 text-xs text-slate-600" aria-live="polite">
        <FileText className="h-3.5 w-3.5" />
        {file ? `${file.name} · ${formatBytes(file.size)}` : "No file selected"}
      </p>
    </div>
  );
}

function StageArtifactButton({
  artifact,
  onPreview,
}: {
  artifact: PipelineRunStageArtifact;
  onPreview: (name: string) => void;
}) {
  const name = artifact.artifact_name || artifact.name;
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => onPreview(name)}
      className="justify-start"
    >
      <FileText className="h-4 w-4" />
      <span className="truncate">{name}</span>
    </Button>
  );
}

function StageResultCard({
  result,
  onPreview,
}: {
  result: PipelineRunStageResult;
  onPreview: (name: string) => void;
}) {
  const artifacts = [...(result.artifacts ?? []), ...(result.outputs_to_next_stage ?? [])].filter(
    (artifact, index, list) =>
      list.findIndex((candidate) => candidate.artifact_name === artifact.artifact_name) === index,
  );
  return (
    <Card data-testid={`msp-result-${result.stage}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{result.label || result.stage}</CardTitle>
          <CardDescription>{result.summary || "No stage summary returned."}</CardDescription>
        </div>
        <StatusPill status={result.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {result.metrics?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.metrics.map((metric) => (
              <div key={`${metric.label}-${formatValue(metric.value)}`} className="rounded-md border p-3">
                <div className="text-xs text-slate-500">{metric.label}</div>
                <div className="mt-1 font-semibold">
                  {formatValue(metric.value)} {metric.unit ?? ""}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {result.warnings && result.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Warnings</div>
            <ul className="mt-1 list-disc pl-5">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.error && Object.keys(result.error).length > 0 ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold">Stage error</div>
            <JsonPanel value={result.error} />
          </div>
        ) : null}

        {result.explanations?.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">How this stage works</div>
            {result.explanations.map((explanation) => (
              <div key={`${explanation.title}-${explanation.body}`} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium">{explanation.title}</div>
                <div className="mt-1 text-slate-600">{explanation.body}</div>
              </div>
            ))}
          </div>
        ) : null}

        {result.decision_summary && Object.keys(result.decision_summary).length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Decision summary</div>
            <JsonPanel value={result.decision_summary} />
          </div>
        ) : null}

        {result.decision_tables?.map((table) => (
          <div key={table.id || table.title} className="space-y-2">
            <div>
              <div className="text-sm font-semibold">{table.title}</div>
              {table.description ? <div className="text-xs text-slate-500">{table.description}</div> : null}
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.columns.map((column) => <TableHead key={column}>{column}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, rowIndex) => (
                    <TableRow key={`${table.id}-${rowIndex}`}>
                      {table.columns.map((column) => <TableCell key={column}>{formatValue(row[column])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {result.charts?.map((chart) => (
          <div key={chart.id || chart.title} className="space-y-2">
            <div className="text-sm font-semibold">{chart.title}</div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Array.from(new Set([chart.x_key, chart.y_key])).map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chart.data.map((row, rowIndex) => (
                    <TableRow key={`${chart.id}-${rowIndex}`}>
                      <TableCell>{formatValue(row[chart.x_key])}</TableCell>
                      <TableCell>{formatValue(row[chart.y_key])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {artifacts.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Artifacts</div>
            <div className="flex flex-wrap gap-2">
              {artifacts.map((artifact) => (
                <StageArtifactButton key={`${artifact.role}-${artifact.artifact_name}`} artifact={artifact} onPreview={onPreview} />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PipelineRunHistory({
  runs,
  loading,
  page,
  totalPages,
  onOpen,
  onRefresh,
  onPageChange,
}: {
  runs: PipelineRunListItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  onOpen: (runID: string) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Recent runs</CardTitle>
          <CardDescription>Open a run to resume status polling.</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading />
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500">No MSP runs for this shop yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.pipeline_run_id}>
                      <TableCell className="max-w-36 truncate font-mono text-xs">{run.pipeline_run_id}</TableCell>
                      <TableCell><StatusPill status={run.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{run.current_stage}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(run.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpen(run.pipeline_run_id)}
                          aria-label={`Open run ${run.pipeline_run_id}`}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                  Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineRunDetail({
  run,
  stageResults,
  artifacts,
  loading,
  pollError,
  onRefresh,
  onCancel,
  onPreviewArtifact,
}: {
  run: PipelineRunView | null;
  stageResults: PipelineRunStageResults | null;
  artifacts: PipelineRunArtifact[];
  loading: boolean;
  pollError: string | null;
  onRefresh: () => void;
  onCancel: () => void;
  onPreviewArtifact: (name: string) => void;
}) {
  const stageResultMap = useMemo(() => {
    const map = new Map<string, PipelineRunStageResult>();
    for (const result of stageResults?.stages ?? []) {
      map.set(result.stage, result);
    }
    return map;
  }, [stageResults]);

  const stageStatus = (stage: PipelineStage): NormalizedStageStatus => {
    const result = stageResultMap.get(stage);
    if (result) {
      return normalizeStageStatus(result.status);
    }
    const state = run?.stage_states?.[stage];
    if (state) {
      return normalizeStageStatus(state.status);
    }
    if (run?.current_stage === stage && run.status) {
      return normalizeStageStatus(run.status);
    }
    return "pending";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Run details</CardTitle>
          <CardDescription>Controller-backed execution and stage evidence.</CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
          {run && isActiveStatus(run.status) ? (
            <Button type="button" size="sm" variant="destructive" onClick={onCancel}>
              <StopCircle className="h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !run ? <Loading /> : null}
        {pollError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {pollError}
          </div>
        ) : null}
        {run ? (
          <>
            <div className="flex flex-wrap items-center gap-3" data-testid="msp-run-status">
              <StatusPill status={run.status} />
              <span className="font-mono text-xs text-slate-500" data-testid="msp-run-id">{run.pipeline_run_id}</span>
              <span className="text-sm text-slate-600">Current stage: {run.current_stage || "-"}</span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">Shop</div><div className="font-medium">{run.shop_id}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">Created</div><div className="font-medium">{formatDate(run.created_at)}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">Updated</div><div className="font-medium">{formatDate(run.updated_at)}</div></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3" role="list" aria-label="MSP pipeline stages">
              {PIPELINE_STAGES.map((stage) => {
                const currentStatus = stageStatus(stage.key);
                return (
                  <div key={stage.key} role="listitem" data-testid={`msp-stage-${stage.key}`} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{stage.label}</div>
                      <StatusPill status={currentStatus} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{stage.description}</p>
                  </div>
                );
              })}
            </div>

            {run.status === "succeeded" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" />Pipeline completed</div>
                {run.final_result && Object.keys(run.final_result).length > 0 ? <div className="mt-3"><JsonPanel value={run.final_result} /></div> : null}
              </div>
            ) : null}
            {run.status === "failed" ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
                <div className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" />Pipeline failed</div>
                {run.error && Object.keys(run.error).length > 0 ? <div className="mt-3"><JsonPanel value={run.error} /></div> : null}
              </div>
            ) : null}
            {run.status === "cancelled" ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-700">
                <div className="flex items-center gap-2 font-semibold"><Ban className="h-5 w-5" />Pipeline cancelled</div>
              </div>
            ) : null}

            {stageResults?.stages?.length ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" />Stage results</div>
                {stageResults.stages.map((result) => <StageResultCard key={result.stage} result={result} onPreview={onPreviewArtifact} />)}
              </div>
            ) : null}

            {artifacts.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Run artifacts</div>
                <div className="flex flex-wrap gap-2">
                  {artifacts.map((artifact) => (
                    <Button key={`${artifact.name}-${artifact.path}`} type="button" size="sm" variant="outline" onClick={() => onPreviewArtifact(artifact.name)}>
                      <FileText className="h-4 w-4" />
                      {artifact.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">Select a run from history or start a new pipeline.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MspPipelineMain() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRunId = searchParams.get("run_id");

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId);

  const [files, setFiles] = useState<UploadFileState>({
    orderMapping: null,
    supplierInfo: null,
    skuMaster: null,
    businessConstraints: null,
  });
  const [lookbackDays, setLookbackDays] = useState("730");
  const [useDateRange, setUseDateRange] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [policy, setPolicy] = useState<PolicyValues>(INITIAL_POLICY);
  const [formError, setFormError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [runs, setRuns] = useState<PipelineRunListItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [run, setRun] = useState<PipelineRunView | null>(null);
  const [stageResults, setStageResults] = useState<PipelineRunStageResults | null>(null);
  const [artifacts, setArtifacts] = useState<PipelineRunArtifact[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [artifactDialogOpen, setArtifactDialogOpen] = useState(false);
  const [artifactName, setArtifactName] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<PipelineRunArtifactContent | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadShops = async () => {
      setShopsLoading(true);
      try {
        const allShops = await getShops();
        const shopeeShops = (Array.isArray(allShops) ? allShops : []).filter(
          (shop) => (shop.marketplace ?? "").toLowerCase() === "shopee",
        );
        if (!mounted) {
          return;
        }
        setShops(shopeeShops);
        const savedShopID = Number(localStorage.getItem(SELECTED_SHOP_STORAGE_KEY));
        const savedShopExists = Number.isInteger(savedShopID) && shopeeShops.some((shop) => shop.id === savedShopID);
        const initialShopID = savedShopExists ? savedShopID : shopeeShops[0]?.id ?? null;
        setSelectedShopId(initialShopID);
        if (initialShopID !== null) {
          localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, initialShopID.toString());
        }
      } catch (error) {
        if (mounted) {
          toast({ title: "Failed to load Shopee shops", description: getApiErrorMessage(error, "Unable to load connected shops."), variant: "destructive" });
        }
      } finally {
        if (mounted) {
          setShopsLoading(false);
        }
      }
    };
    void loadShops();
    return () => { mounted = false; };
  }, [toast]);

  const loadHistory = useCallback(async () => {
    if (selectedShopId === null) {
      setRuns([]);
      setHistoryTotalPages(1);
      return;
    }
    setHistoryLoading(true);
    try {
      const result = await getPipelineRuns({ shopId: selectedShopId, page: historyPage, limit: HISTORY_PAGE_SIZE });
      setRuns(result.items ?? []);
      setHistoryTotalPages(Math.max(result.pagination?.total_pages ?? 1, 1));
    } catch (error) {
      toast({ title: "Failed to load MSP runs", description: getApiErrorMessage(error, "Unable to load pipeline history."), variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, selectedShopId, toast]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const refreshRunDetails = useCallback(async (runID: string, showLoading: boolean) => {
    if (showLoading) {
      setDetailLoading(true);
    }
    try {
      const nextRun = await getPipelineRun(runID);
      setRun(nextRun);
      if (nextRun.shop_id !== selectedShopId && shops.some((shop) => shop.id === nextRun.shop_id)) {
        setSelectedShopId(nextRun.shop_id);
        localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, nextRun.shop_id.toString());
      }

      const [stageResult, artifactResult] = await Promise.allSettled([
        getPipelineStageResults(runID),
        getPipelineArtifacts(runID),
      ]);
      const errors: string[] = [];
      if (stageResult.status === "fulfilled") {
        setStageResults(stageResult.value);
      } else {
        errors.push(getApiErrorMessage(stageResult.reason, "Stage results are not available yet."));
      }
      if (artifactResult.status === "fulfilled") {
        setArtifacts(artifactResult.value.artifacts ?? []);
      } else {
        errors.push(getApiErrorMessage(artifactResult.reason, "Artifacts are not available yet."));
      }
      setPollError(errors.length > 0 ? errors.join(" ") : null);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to retrieve this pipeline run.");
      setPollError(message);
      if (showLoading) {
        toast({ title: "Failed to load pipeline run", description: message, variant: "destructive" });
      }
    } finally {
      if (showLoading) {
        setDetailLoading(false);
      }
    }
  }, [selectedShopId, shops, toast]);

  useEffect(() => {
    setRun(null);
    setStageResults(null);
    setArtifacts([]);
    setPollError(null);
    if (selectedRunId) {
      void refreshRunDetails(selectedRunId, true);
    }
  }, [refreshRunDetails, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId || !run || !isActiveStatus(run.status)) {
      return undefined;
    }
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      await refreshRunDetails(selectedRunId, false);
      if (!stopped) {
        timer = window.setTimeout(() => { void poll(); }, POLL_DELAY_MS);
      }
    };
    timer = window.setTimeout(() => { void poll(); }, POLL_DELAY_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [refreshRunDetails, run, selectedRunId]);

  const handleShopChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextShopID = Number(event.target.value);
    setSelectedShopId(nextShopID);
    localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, nextShopID.toString());
    setHistoryPage(1);
  };

  const handleFileChange = (key: UploadFileKey, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !file.name.toLowerCase().endsWith(".csv")) {
      setFormError("All MSP input files must use the .csv format.");
      event.target.value = "";
      setFiles((current) => ({ ...current, [key]: null }));
      return;
    }
    setFormError(null);
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const handlePolicyChange = (key: NumericPolicyKey, value: string) => {
    setPolicy((current) => ({ ...current, [key]: value }));
  };

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedShopId === null) {
      setFormError("Select a connected Shopee shop first.");
      return;
    }
    if (Object.values(files).some((file) => file === null)) {
      setFormError("Select all four CSV files before starting the pipeline.");
      return;
    }
    const configResult = buildPipelineConfig({ lookbackDays, useDateRange, rangeStart, rangeEnd, forceRefresh, policy });
    if (configResult.error || !configResult.config) {
      setFormError(configResult.error ?? "Invalid pipeline configuration.");
      return;
    }

    setStarting(true);
    setFormError(null);
    try {
      const accepted = await uploadAndStartPipeline(
        selectedShopId,
        configResult.config,
        {
          orderMapping: files.orderMapping as File,
          supplierInfo: files.supplierInfo as File,
          skuMaster: files.skuMaster as File,
          businessConstraints: files.businessConstraints as File,
        },
        `msp-ui-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      );
      setSearchParams({ run_id: accepted.pipeline_run_id });
      setHistoryPage(1);
      toast({ title: "MSP pipeline started", description: `Run ${accepted.pipeline_run_id} was accepted.`, variant: "success" });
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to start the MSP pipeline."));
    } finally {
      setStarting(false);
    }
  };

  const handleOpenRun = (runID: string) => setSearchParams({ run_id: runID });

  const handleCancelRun = async () => {
    if (!selectedRunId) {
      return;
    }
    setCancelling(true);
    try {
      await cancelPipelineRun(selectedRunId);
      setCancelDialogOpen(false);
      await refreshRunDetails(selectedRunId, true);
      toast({ title: "Pipeline cancellation requested", description: "The controller accepted the cancellation.", variant: "success" });
    } catch (error) {
      toast({ title: "Cancellation failed", description: getApiErrorMessage(error, "Unable to cancel this pipeline run."), variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handlePreviewArtifact = async (name: string) => {
    if (!selectedRunId) {
      return;
    }
    setArtifactName(name);
    setArtifactDialogOpen(true);
    setArtifactLoading(true);
    setArtifactContent(null);
    try {
      setArtifactContent(await getPipelineArtifactContent(selectedRunId, name));
    } catch (error) {
      toast({ title: "Failed to load artifact", description: getApiErrorMessage(error, "Unable to retrieve artifact content."), variant: "destructive" });
    } finally {
      setArtifactLoading(false);
    }
  };

  const artifactColumns = artifactContent?.columns?.length
    ? artifactContent.columns
    : Object.keys(artifactContent?.rows?.[0] ?? {});

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600"><Activity className="h-4 w-4" />MSP Procurement</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">MSP E2E workbench</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Upload the approved procurement inputs, let the backend fetch live Shopee stock and sales, and follow the controller through all three stages.
          </p>
        </div>
        {selectedShop ? <div className="rounded-md border bg-white px-3 py-2 text-sm"><div className="text-xs text-slate-500">Selected shop</div><div className="font-semibold">{selectedShop.name || `Shop ${selectedShop.identifier}`}</div></div> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Start a procurement run</CardTitle>
              <CardDescription>The backend stores the files on the shared pipeline volume and never trusts browser-supplied paths.</CardDescription>
            </CardHeader>
            <CardContent>
              {shopsLoading ? <Loading /> : shops.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No connected Shopee shop is available. Connect a shop from Home first.</div>
              ) : (
                <form className="space-y-6" onSubmit={handleStart}>
                  <div className="space-y-2">
                    <Label htmlFor="msp-shop">Shop</Label>
                    <select id="msp-shop" value={selectedShopId ?? ""} onChange={handleShopChange} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950">
                      {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name || `Shop ${shop.identifier}`} · {shop.identifier}</option>)}
                    </select>
                    {selectedShop?.token_connected === false ? <p className="text-xs text-amber-700">This shop has no active Shopee token. Reconnect it from Home before starting.</p> : null}
                  </div>

                  <div className="space-y-3">
                    <div><div className="font-semibold">Required SSOA inputs</div><p className="text-sm text-slate-500">All four files are uploaded in one request; the reviewed mapper is normalized into SSOA order history.</p></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {UPLOAD_FIELDS.map((field) => <UploadField key={field.key} field={field} file={files[field.key]} disabled={starting} onChange={(event) => handleFileChange(field.key, event)} />)}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div><div className="font-semibold">Sales history window</div><p className="text-sm text-slate-500">The backend fetches current stock and generates sales history from Shopee.</p></div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label htmlFor="msp-lookback">Lookback days</Label><Input id="msp-lookback" type="number" min="1" max="730" value={lookbackDays} onChange={(event) => setLookbackDays(event.target.value)} disabled={starting || useDateRange} /></div>
                      <div className="space-y-2"><Label htmlFor="msp-range-start">Range start</Label><Input id="msp-range-start" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} disabled={starting || !useDateRange} /></div>
                      <div className="space-y-2"><Label htmlFor="msp-range-end">Range end</Label><Input id="msp-range-end" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} disabled={starting || !useDateRange} /></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <label className="flex items-center gap-2"><Switch checked={useDateRange} onCheckedChange={setUseDateRange} disabled={starting} /><span>Use an explicit date range</span></label>
                      <label className="flex items-center gap-2"><Switch checked={forceRefresh} onCheckedChange={setForceRefresh} disabled={starting} /><span>Force-refresh sales history</span></label>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div><div className="font-semibold">Advanced controller policy</div><p className="text-sm text-slate-500">Blank numeric values use MSP defaults. Values are validated before upload.</p></div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {NUMERIC_POLICY_FIELDS.map((field) => <div key={field.key} className="space-y-2"><Label htmlFor={`msp-policy-${field.key}`}>{field.label}</Label><Input id={`msp-policy-${field.key}`} type="number" step="any" min={field.rule === "positive" || field.rule === "integer" ? "1" : "0"} placeholder={field.placeholder} value={policy[field.key]} onChange={(event) => handlePolicyChange(field.key, event.target.value)} disabled={starting} /></div>)}
                      <div className="space-y-2"><Label htmlFor="msp-policy-method">MILP selection method</Label><select id="msp-policy-method" value={policy.milp_selection_method} onChange={(event) => setPolicy((current) => ({ ...current, milp_selection_method: event.target.value }))} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="MOST_FREQUENT">Most-Frequent</option><option value="shannon_entropy_classic">Entropy-TOPSIS</option><option value="linear_bwm_linprog_solver">BWM-TOPSIS</option></select><p className="text-xs text-slate-500">Choose the weighting method used by SSOA.</p></div>
                      <div className="space-y-2"><Label htmlFor="msp-policy-constraints">Supplier price constraints</Label><select id="msp-policy-constraints" value={policy.enforce_supplier_order_price_constraints} onChange={(event) => setPolicy((current) => ({ ...current, enforce_supplier_order_price_constraints: event.target.value as PolicyValues["enforce_supplier_order_price_constraints"] }))} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="default">Controller default</option><option value="true">Enabled</option><option value="false">Disabled</option></select></div>
                    </div>
                  </div>

                  {formError ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div> : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">No files or controller credentials are sent anywhere except the authenticated RIMU backend.</p>
                    <Button type="submit" disabled={starting || selectedShopId === null || shops.length === 0}>
                      {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {starting ? "Starting pipeline..." : "Start MSP run"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <PipelineRunDetail
            run={run}
            stageResults={stageResults}
            artifacts={artifacts}
            loading={detailLoading}
            pollError={pollError}
            onRefresh={() => { if (selectedRunId) void refreshRunDetails(selectedRunId, true); }}
            onCancel={() => setCancelDialogOpen(true)}
            onPreviewArtifact={(name) => { void handlePreviewArtifact(name); }}
          />
        </div>

        <PipelineRunHistory
          runs={runs}
          loading={historyLoading}
          page={historyPage}
          totalPages={historyTotalPages}
          onOpen={handleOpenRun}
          onRefresh={() => { void loadHistory(); }}
          onPageChange={setHistoryPage}
        />
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel this pipeline?</DialogTitle><DialogDescription>The controller will stop the current run. Completed stages remain available for inspection.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep running</Button><Button type="button" variant="destructive" disabled={cancelling} onClick={() => { void handleCancelRun(); }}>{cancelling ? "Cancelling..." : "Cancel pipeline"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={artifactDialogOpen} onOpenChange={setArtifactDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Artifact: {artifactName || "-"}</DialogTitle><DialogDescription>Artifact content returned through the authenticated backend.</DialogDescription></DialogHeader>
          {artifactLoading ? <Loading /> : artifactContent?.content_type === "csv" ? (
            <div className="space-y-2"><div className="text-xs text-slate-500">Showing up to {MAX_ARTIFACT_PREVIEW_ROWS} rows.</div><div className="max-h-[60vh] overflow-auto rounded-md border"><Table><TableHeader><TableRow>{artifactColumns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{(artifactContent.rows ?? []).slice(0, MAX_ARTIFACT_PREVIEW_ROWS).map((row, rowIndex) => <TableRow key={rowIndex}>{artifactColumns.map((column) => <TableCell key={column}>{row[column] ?? ""}</TableCell>)}</TableRow>)}</TableBody></Table></div></div>
          ) : artifactContent ? <JsonPanel value={artifactContent.raw ?? artifactContent} /> : <p className="text-sm text-slate-500">No artifact content available.</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setArtifactDialogOpen(false)}><SquareArrowOutUpRight className="h-4 w-4" />Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MspPipelineMain;
