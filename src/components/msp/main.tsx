import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  Circle,
  Download,
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
import { Badge } from "@/components/ui/badge";
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
import type {
  MspNumericPolicyKey,
  MspPolicyValues,
  MspUploadFileKey,
  PipelineRunArtifact,
  PipelineRunArtifactContent,
  PipelineRunListItem,
  PipelineRunStageArtifact,
  PipelineRunStageResult,
  PipelineRunStageResults,
  PipelineRunStatus,
  PipelineRunView,
  PipelineStage,
} from "@/types/Msp";
import { Shop } from "@/types/Shop";
import {
  CSV_FILE_ACCEPT,
  DEFAULT_LOOKBACK_DAYS,
  EMPTY_DISPLAY_VALUE,
  EMPTY_TEXT,
  HISTORY_PAGE_SIZE,
  INITIAL_POLICY,
  MAX_LOOKBACK_DAYS,
  MAX_ARTIFACT_PREVIEW_ROWS,
  MILP_SELECTION_METHOD_OPTIONS,
  MIN_LOOKBACK_DAYS,
  MIN_NONNEGATIVE_VALUE,
  MSP_ELEMENT_IDS,
  MSP_ELEMENT_ID_PREFIXES,
  MSP_TEXT,
  NUMERIC_POLICY_FIELDS,
  NUMBER_INPUT_STEP,
  PIPELINE_STAGES,
  POLL_DELAY_MS,
  RUN_QUERY_PARAM,
  SELECTED_SHOP_STORAGE_KEY,
  SHOPEE_MARKETPLACE,
  SUPPLIER_CONSTRAINT_OPTIONS,
  UPLOAD_FIELDS,
} from "./constants";
import {
  buildPipelineConfig,
  formatBytes,
  formatDate,
  downloadCsvTemplate,
  formatShopName,
  formatShopOption,
  formatValue,
  isActiveStatus,
  isCsvFile,
  jsonText,
  normalizeStageStatus,
  statusBadgeVariant,
  statusLabel,
  type NormalizedStageStatus,
} from "./helpers";

type UploadFileState = Record<MspUploadFileKey, File | null>;

function StatusBadge({ status }: { status: NormalizedStageStatus | PipelineRunStatus }) {
  const normalized = normalizeStageStatus(status);
  return (
    <Badge
      variant={statusBadgeVariant(normalized)}
      data-status={normalized}
    >
      {normalized === "running" || normalized === "queued" ? (
        <Loader2 data-icon="inline-start" />
      ) : normalized === "succeeded" ? (
        <CheckCircle2 data-icon="inline-start" />
      ) : normalized === "failed" ? (
        <XCircle data-icon="inline-start" />
      ) : normalized === "cancelled" ? (
        <Ban data-icon="inline-start" />
      ) : (
        <Circle data-icon="inline-start" />
      )}
      {statusLabel(normalized)}
    </Badge>
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
  const id = `${MSP_ELEMENT_ID_PREFIXES.upload}-${field.fieldName}`;
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-4">
      <Label htmlFor={id}>{field.label}</Label>
      <p className="text-xs text-slate-500">{field.description}</p>
      <Button type="button" variant="link" size="sm" onClick={() => downloadCsvTemplate(field.template)} data-testid={`msp-template-${field.key}`}>
        <Download data-icon="inline-start" />
        {MSP_TEXT.form.downloadTemplate}
      </Button>
      <Input
        id={id}
        type="file"
        accept={CSV_FILE_ACCEPT}
        onChange={onChange}
        disabled={disabled}
      />
      <p className="flex items-center gap-1 text-xs text-slate-600" aria-live="polite">
        <FileText className="h-3.5 w-3.5" />
        {file ? `${file.name} · ${formatBytes(file.size)}` : MSP_TEXT.form.noSelectedFile}
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
          <CardDescription>{result.summary || MSP_TEXT.detail.noStageSummary}</CardDescription>
        </div>
        <StatusBadge status={result.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {result.metrics?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.metrics.map((metric) => (
              <div key={`${metric.label}-${formatValue(metric.value)}`} className="rounded-md border p-3">
                <div className="text-xs text-slate-500">{metric.label}</div>
                <div className="mt-1 font-semibold">
                  {formatValue(metric.value)} {metric.unit ?? EMPTY_TEXT}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {result.warnings && result.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">{MSP_TEXT.detail.warnings}</div>
            <ul className="mt-1 list-disc pl-5">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.error && Object.keys(result.error).length > 0 ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold">{MSP_TEXT.detail.stageError}</div>
            <JsonPanel value={result.error} />
          </div>
        ) : null}

        {result.explanations?.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">{MSP_TEXT.detail.howItWorks}</div>
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
            <div className="text-sm font-semibold">{MSP_TEXT.detail.decisionSummary}</div>
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
            <div className="text-sm font-semibold">{MSP_TEXT.detail.artifacts}</div>
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
          <CardTitle className="text-lg">{MSP_TEXT.history.title}</CardTitle>
          <CardDescription>{MSP_TEXT.history.description}</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {MSP_TEXT.detail.refresh}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading />
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500">{MSP_TEXT.history.noRuns}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{MSP_TEXT.history.run}</TableHead>
                    <TableHead>{MSP_TEXT.history.status}</TableHead>
                    <TableHead>{MSP_TEXT.history.stage}</TableHead>
                    <TableHead>{MSP_TEXT.history.updated}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.pipeline_run_id}>
                      <TableCell className="max-w-36 truncate font-mono text-xs">{run.pipeline_run_id}</TableCell>
                          <TableCell><StatusBadge status={run.status} /></TableCell>
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
                          {MSP_TEXT.history.open}
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
                  {MSP_TEXT.history.previous}
                </Button>
                <span>{MSP_TEXT.history.page} {page} {MSP_TEXT.history.pageOf} {totalPages}</span>
                <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                  {MSP_TEXT.history.next}
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
          <CardTitle className="text-lg">{MSP_TEXT.detail.title}</CardTitle>
          <CardDescription>{MSP_TEXT.detail.description}</CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {MSP_TEXT.detail.refresh}
          </Button>
          {run && isActiveStatus(run.status) ? (
            <Button type="button" size="sm" variant="destructive" onClick={onCancel}>
              <StopCircle className="h-4 w-4" />
              {MSP_TEXT.detail.cancel}
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
              <StatusBadge status={run.status} />
              <span className="font-mono text-xs text-slate-500" data-testid="msp-run-id">{run.pipeline_run_id}</span>
              <span className="text-sm text-slate-600">{MSP_TEXT.detail.currentStage}: {run.current_stage || EMPTY_DISPLAY_VALUE}</span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">{MSP_TEXT.detail.shop}</div><div className="font-medium">{run.shop_id}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">{MSP_TEXT.detail.created}</div><div className="font-medium">{formatDate(run.created_at)}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-slate-500">{MSP_TEXT.detail.updated}</div><div className="font-medium">{formatDate(run.updated_at)}</div></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3" role="list" aria-label={MSP_TEXT.detail.stages}>
              {PIPELINE_STAGES.map((stage) => {
                const currentStatus = stageStatus(stage.key);
                return (
                  <div key={stage.key} role="listitem" data-testid={`msp-stage-${stage.key}`} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{stage.label}</div>
                      <StatusBadge status={currentStatus} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{stage.description}</p>
                  </div>
                );
              })}
            </div>

            {run.status === "succeeded" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" />{MSP_TEXT.detail.completed}</div>
                {run.final_result && Object.keys(run.final_result).length > 0 ? <div className="mt-3"><JsonPanel value={run.final_result} /></div> : null}
              </div>
            ) : null}
            {run.status === "failed" ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
                <div className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" />{MSP_TEXT.detail.failed}</div>
                {run.error && Object.keys(run.error).length > 0 ? <div className="mt-3"><JsonPanel value={run.error} /></div> : null}
              </div>
            ) : null}
            {run.status === "cancelled" ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-700">
                <div className="flex items-center gap-2 font-semibold"><Ban className="h-5 w-5" />{MSP_TEXT.detail.cancelled}</div>
              </div>
            ) : null}

            {stageResults?.stages?.length ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" />{MSP_TEXT.detail.stageResults}</div>
                {stageResults.stages.map((result) => <StageResultCard key={result.stage} result={result} onPreview={onPreviewArtifact} />)}
              </div>
            ) : null}

            {artifacts.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">{MSP_TEXT.detail.runArtifacts}</div>
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
          <p className="text-sm text-slate-500">{MSP_TEXT.detail.selectRun}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MspPipelineMain() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRunId = searchParams.get(RUN_QUERY_PARAM);

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
  const [lookbackDays, setLookbackDays] = useState(DEFAULT_LOOKBACK_DAYS.toString());
  const [useDateRange, setUseDateRange] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [policy, setPolicy] = useState<MspPolicyValues>(INITIAL_POLICY);
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
          (shop) => (shop.marketplace ?? EMPTY_TEXT).toLowerCase() === SHOPEE_MARKETPLACE,
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
          toast({ title: MSP_TEXT.notifications.loadShopsTitle, description: getApiErrorMessage(error, MSP_TEXT.notifications.loadShopsDescription), variant: "destructive" });
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
      toast({ title: MSP_TEXT.notifications.loadRunsTitle, description: getApiErrorMessage(error, MSP_TEXT.notifications.loadRunsDescription), variant: "destructive" });
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
        errors.push(getApiErrorMessage(stageResult.reason, MSP_TEXT.notifications.stageResultsUnavailable));
      }
      if (artifactResult.status === "fulfilled") {
        setArtifacts(artifactResult.value.artifacts ?? []);
      } else {
        errors.push(getApiErrorMessage(artifactResult.reason, MSP_TEXT.notifications.artifactsUnavailable));
      }
      setPollError(errors.length > 0 ? errors.join(" ") : null);
    } catch (error) {
      const message = getApiErrorMessage(error, MSP_TEXT.notifications.loadRunDescription);
      setPollError(message);
      if (showLoading) {
        toast({ title: MSP_TEXT.notifications.loadRunTitle, description: message, variant: "destructive" });
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

  const handleFileChange = (key: MspUploadFileKey, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !isCsvFile(file)) {
      setFormError(MSP_TEXT.form.csvOnly);
      event.target.value = "";
      setFiles((current) => ({ ...current, [key]: null }));
      return;
    }
    setFormError(null);
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const handlePolicyChange = (key: MspNumericPolicyKey, value: string) => {
    setPolicy((current) => ({ ...current, [key]: value }));
  };

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedShopId === null) {
      setFormError(MSP_TEXT.form.selectShop);
      return;
    }
    if (Object.values(files).some((file) => file === null)) {
      setFormError(MSP_TEXT.form.selectFiles);
      return;
    }
    const configResult = buildPipelineConfig({ lookbackDays, useDateRange, rangeStart, rangeEnd, forceRefresh, policy });
    if (configResult.error || !configResult.config) {
      setFormError(configResult.error ?? MSP_TEXT.form.invalidConfiguration);
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
      setSearchParams({ [RUN_QUERY_PARAM]: accepted.pipeline_run_id });
      setHistoryPage(1);
      toast({ title: MSP_TEXT.notifications.pipelineStartedTitle, description: MSP_TEXT.notifications.pipelineAccepted(accepted.pipeline_run_id), variant: "success" });
    } catch (error) {
      setFormError(getApiErrorMessage(error, MSP_TEXT.notifications.startPipelineError));
    } finally {
      setStarting(false);
    }
  };

  const handleOpenRun = (runID: string) => setSearchParams({ [RUN_QUERY_PARAM]: runID });

  const handleCancelRun = async () => {
    if (!selectedRunId) {
      return;
    }
    setCancelling(true);
    try {
      await cancelPipelineRun(selectedRunId);
      setCancelDialogOpen(false);
      await refreshRunDetails(selectedRunId, true);
      toast({ title: MSP_TEXT.notifications.cancellationRequestedTitle, description: MSP_TEXT.notifications.cancellationAccepted, variant: "success" });
    } catch (error) {
      toast({ title: MSP_TEXT.notifications.cancellationFailedTitle, description: getApiErrorMessage(error, MSP_TEXT.notifications.cancellationError), variant: "destructive" });
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
      toast({ title: MSP_TEXT.notifications.loadArtifactTitle, description: getApiErrorMessage(error, MSP_TEXT.notifications.loadArtifactError), variant: "destructive" });
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
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600"><Activity className="h-4 w-4" />{MSP_TEXT.page.eyebrow}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{MSP_TEXT.page.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {MSP_TEXT.page.description}
          </p>
        </div>
        {selectedShop ? <div className="rounded-md border bg-white px-3 py-2 text-sm"><div className="text-xs text-slate-500">{MSP_TEXT.page.selectedShop}</div><div className="font-semibold">{formatShopName(selectedShop)}</div></div> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{MSP_TEXT.form.title}</CardTitle>
              <CardDescription>{MSP_TEXT.form.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {shopsLoading ? <Loading /> : shops.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{MSP_TEXT.form.noShop}</div>
              ) : (
                <form className="space-y-6" onSubmit={handleStart}>
                  <div className="space-y-2">
                    <Label htmlFor={MSP_ELEMENT_IDS.shop}>{MSP_TEXT.form.shop}</Label>
                    <select id={MSP_ELEMENT_IDS.shop} value={selectedShopId ?? EMPTY_TEXT} onChange={handleShopChange} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950">
                      {shops.map((shop) => <option key={shop.id} value={shop.id}>{formatShopOption(shop)}</option>)}
                    </select>
                    {selectedShop?.token_connected === false ? <p className="text-xs text-amber-700">{MSP_TEXT.form.reconnectNotice}</p> : null}
                  </div>

                  <div className="space-y-3">
                    <div><div className="font-semibold">{MSP_TEXT.form.requiredInputs}</div><p className="text-sm text-slate-500">{MSP_TEXT.form.requiredInputsDescription}</p></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {UPLOAD_FIELDS.map((field) => <UploadField key={field.key} field={field} file={files[field.key]} disabled={starting} onChange={(event) => handleFileChange(field.key, event)} />)}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div><div className="font-semibold">{MSP_TEXT.form.salesWindow}</div><p className="text-sm text-slate-500">{MSP_TEXT.form.salesWindowDescription}</p></div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label htmlFor={MSP_ELEMENT_IDS.lookback}>{MSP_TEXT.form.lookbackDays}</Label><Input id={MSP_ELEMENT_IDS.lookback} type="number" min={MIN_LOOKBACK_DAYS} max={MAX_LOOKBACK_DAYS} value={lookbackDays} onChange={(event) => setLookbackDays(event.target.value)} disabled={starting || useDateRange} /></div>
                      <div className="space-y-2"><Label htmlFor={MSP_ELEMENT_IDS.rangeStart}>{MSP_TEXT.form.rangeStart}</Label><Input id={MSP_ELEMENT_IDS.rangeStart} type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} disabled={starting || !useDateRange} /></div>
                      <div className="space-y-2"><Label htmlFor={MSP_ELEMENT_IDS.rangeEnd}>{MSP_TEXT.form.rangeEnd}</Label><Input id={MSP_ELEMENT_IDS.rangeEnd} type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} disabled={starting || !useDateRange} /></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <label className="flex items-center gap-2"><Switch checked={useDateRange} onCheckedChange={setUseDateRange} disabled={starting} /><span>{MSP_TEXT.form.explicitRange}</span></label>
                      <label className="flex items-center gap-2"><Switch checked={forceRefresh} onCheckedChange={setForceRefresh} disabled={starting} /><span>{MSP_TEXT.form.forceRefresh}</span></label>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div><div className="font-semibold">{MSP_TEXT.form.policy}</div><p className="text-sm text-slate-500">{MSP_TEXT.form.policyDescription}</p></div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {NUMERIC_POLICY_FIELDS.map((field) => <div key={field.key} className="space-y-2"><Label htmlFor={`${MSP_ELEMENT_ID_PREFIXES.policy}-${field.key}`}>{field.label}</Label><Input id={`${MSP_ELEMENT_ID_PREFIXES.policy}-${field.key}`} type="number" step={NUMBER_INPUT_STEP} min={field.rule === "positive" || field.rule === "integer" ? MIN_LOOKBACK_DAYS : MIN_NONNEGATIVE_VALUE} placeholder={field.placeholder} value={policy[field.key]} onChange={(event) => handlePolicyChange(field.key, event.target.value)} disabled={starting} /></div>)}
                      <div className="space-y-2"><Label htmlFor={MSP_ELEMENT_IDS.policyMethod}>{MSP_TEXT.form.method}</Label><select id={MSP_ELEMENT_IDS.policyMethod} value={policy.milp_selection_method} onChange={(event) => setPolicy((current) => ({ ...current, milp_selection_method: event.target.value }))} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">{MILP_SELECTION_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="text-xs text-slate-500">{MSP_TEXT.form.methodDescription}</p></div>
                      <div className="space-y-2"><Label htmlFor={MSP_ELEMENT_IDS.policyConstraints}>{MSP_TEXT.form.supplierConstraints}</Label><select id={MSP_ELEMENT_IDS.policyConstraints} value={policy.enforce_supplier_order_price_constraints} onChange={(event) => setPolicy((current) => ({ ...current, enforce_supplier_order_price_constraints: event.target.value as MspPolicyValues["enforce_supplier_order_price_constraints"] }))} disabled={starting} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">{SUPPLIER_CONSTRAINT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    </div>
                  </div>

                  {formError ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div> : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">{MSP_TEXT.form.privacyNotice}</p>
                    <Button type="submit" disabled={starting || selectedShopId === null || shops.length === 0}>
                      {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {starting ? MSP_TEXT.form.starting : MSP_TEXT.form.start}
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
          <DialogHeader><DialogTitle>{MSP_TEXT.dialogs.cancelTitle}</DialogTitle><DialogDescription>{MSP_TEXT.dialogs.cancelDescription}</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)}>{MSP_TEXT.dialogs.keepRunning}</Button><Button type="button" variant="destructive" disabled={cancelling} onClick={() => { void handleCancelRun(); }}>{cancelling ? MSP_TEXT.dialogs.cancelling : MSP_TEXT.dialogs.cancelPipeline}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={artifactDialogOpen} onOpenChange={setArtifactDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{MSP_TEXT.dialogs.artifactPrefix}: {artifactName || EMPTY_DISPLAY_VALUE}</DialogTitle><DialogDescription>{MSP_TEXT.dialogs.artifactDescription}</DialogDescription></DialogHeader>
          {artifactLoading ? <Loading /> : artifactContent?.content_type === "csv" ? (
            <div className="space-y-2"><div className="text-xs text-slate-500">{MSP_TEXT.dialogs.previewRows} {MAX_ARTIFACT_PREVIEW_ROWS} {MSP_TEXT.dialogs.previewRowsSuffix}</div><div className="max-h-[60vh] overflow-auto rounded-md border"><Table><TableHeader><TableRow>{artifactColumns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{(artifactContent.rows ?? []).slice(0, MAX_ARTIFACT_PREVIEW_ROWS).map((row, rowIndex) => <TableRow key={rowIndex}>{artifactColumns.map((column) => <TableCell key={column}>{row[column] ?? EMPTY_TEXT}</TableCell>)}</TableRow>)}</TableBody></Table></div></div>
          ) : artifactContent ? <JsonPanel value={artifactContent.raw ?? artifactContent} /> : <p className="text-sm text-slate-500">{MSP_TEXT.detail.noArtifactContent}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setArtifactDialogOpen(false)}><SquareArrowOutUpRight className="h-4 w-4" />{MSP_TEXT.dialogs.close}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MspPipelineMain;
