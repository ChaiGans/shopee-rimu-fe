import type {
  MspNumericPolicyKey,
  MspPolicyValues,
  MspUploadFileKey,
  PipelineStage,
} from "@/types/Msp";

export const SELECTED_SHOP_STORAGE_KEY = "msp_selected_shop_id";
export const RUN_QUERY_PARAM = "run_id";
export const SHOPEE_MARKETPLACE = "shopee";
export const HISTORY_PAGE_SIZE = 20;
export const POLL_DELAY_MS = 3000;
export const MAX_ARTIFACT_PREVIEW_ROWS = 200;
export const MIN_LOOKBACK_DAYS = 1;
export const MAX_LOOKBACK_DAYS = 730;
export const DEFAULT_LOOKBACK_DAYS = MAX_LOOKBACK_DAYS;
export const MIN_NONNEGATIVE_VALUE = 0;
export const CSV_FILE_EXTENSION = ".csv";
export const CSV_FILE_ACCEPT = ".csv,text/csv";
export const EMPTY_DISPLAY_VALUE = "-";
export const EMPTY_TEXT = "";
export const SHOP_FALLBACK_PREFIX = "Shop";
export const SHOP_OPTION_SEPARATOR = " · ";
export const NUMBER_INPUT_STEP = "any";
export const MSP_ELEMENT_IDS = {
  shop: "msp-shop",
  lookback: "msp-lookback",
  rangeStart: "msp-range-start",
  rangeEnd: "msp-range-end",
  policyMethod: "msp-policy-method",
  policyConstraints: "msp-policy-constraints",
} as const;
export const MSP_ELEMENT_ID_PREFIXES = {
  upload: "msp-upload",
  policy: "msp-policy",
} as const;

export const MILP_SELECTION_METHOD_OPTIONS = [
  { value: "MOST_FREQUENT", label: "Most-Frequent" },
  { value: "shannon_entropy_classic", label: "Entropy-TOPSIS" },
  { value: "linear_bwm_linprog_solver", label: "BWM-TOPSIS" },
] as const;

export const SUPPLIER_CONSTRAINT_OPTIONS = [
  { value: "default", label: "Controller default" },
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
] as const;

export const PIPELINE_STAGES: Array<{
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

type NumericPolicyRule = "positive" | "nonnegative" | "integer";

export const NUMERIC_POLICY_FIELDS: Array<{
  key: MspNumericPolicyKey;
  label: string;
  rule: NumericPolicyRule;
  placeholder: string;
}> = [
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
];

export const INITIAL_POLICY: MspPolicyValues = {
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

export const UPLOAD_FIELDS: Array<{
  key: MspUploadFileKey;
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

export const MSP_TEXT = {
  page: {
    eyebrow: "MSP Procurement",
    title: "MSP E2E workbench",
    description: "Upload the approved procurement inputs, let the backend fetch live Shopee stock and sales, and follow the controller through all three stages.",
    selectedShop: "Selected shop",
  },
  form: {
    title: "Start a procurement run",
    description: "The backend stores the files on the shared pipeline volume and never trusts browser-supplied paths.",
    shop: "Shop",
    requiredInputs: "Required SSOA inputs",
    requiredInputsDescription: "All four files are uploaded in one request; the reviewed mapper is normalized into SSOA order history.",
    salesWindow: "Sales history window",
    salesWindowDescription: "The backend fetches current stock and generates sales history from Shopee.",
    lookbackDays: "Lookback days",
    rangeStart: "Range start",
    rangeEnd: "Range end",
    explicitRange: "Use an explicit date range",
    forceRefresh: "Force-refresh sales history",
    policy: "Advanced controller policy",
    policyDescription: "Blank numeric values use MSP defaults. Values are validated before upload.",
    method: "MILP selection method",
    methodDescription: "Choose the weighting method used by SSOA.",
    supplierConstraints: "Supplier price constraints",
    privacyNotice: "No files or controller credentials are sent anywhere except the authenticated RIMU backend.",
    start: "Start MSP run",
    starting: "Starting pipeline...",
    reconnectNotice: "This shop has no active Shopee token. Reconnect it from Home before starting.",
    noShop: "No connected Shopee shop is available. Connect a shop from Home first.",
    noSelectedFile: "No file selected",
    csvOnly: "All MSP input files must use the .csv format.",
    selectFiles: "Select all four CSV files before starting the pipeline.",
    selectShop: "Select a connected Shopee shop first.",
    invalidConfiguration: "Invalid pipeline configuration.",
  },
  detail: {
    title: "Run details",
    description: "Controller-backed execution and stage evidence.",
    refresh: "Refresh",
    cancel: "Cancel",
    selectRun: "Select a run from history or start a new pipeline.",
    currentStage: "Current stage",
    noStageSummary: "No stage summary returned.",
    shop: "Shop",
    created: "Created",
    updated: "Updated",
    stages: "MSP pipeline stages",
    completed: "Pipeline completed",
    failed: "Pipeline failed",
    cancelled: "Pipeline cancelled",
    stageResults: "Stage results",
    runArtifacts: "Run artifacts",
    noArtifactContent: "No artifact content available.",
    stageError: "Stage error",
    warnings: "Warnings",
    decisionSummary: "Decision summary",
    howItWorks: "How this stage works",
    artifacts: "Artifacts",
  },
  history: {
    title: "Recent runs",
    description: "Open a run to resume status polling.",
    noRuns: "No MSP runs for this shop yet.",
    page: "Page",
    pageOf: "of",
    previous: "Previous",
    next: "Next",
    open: "Open",
    run: "Run",
    status: "Status",
    stage: "Stage",
    updated: "Updated",
  },
  dialogs: {
    cancelTitle: "Cancel this pipeline?",
    cancelDescription: "The controller will stop the current run. Completed stages remain available for inspection.",
    keepRunning: "Keep running",
    cancelPipeline: "Cancel pipeline",
    cancelling: "Cancelling...",
    artifactPrefix: "Artifact",
    artifactDescription: "Artifact content returned through the authenticated backend.",
    previewRows: "Showing up to",
    previewRowsSuffix: "rows.",
    close: "Close",
  },
  validation: {
    dateRangeRequired: "Both sales history dates are required.",
    dateRangeOrder: "Sales history end date must be on or after the start date.",
    lookbackRange: `Lookback must be a whole number between ${MIN_LOOKBACK_DAYS} and ${MAX_LOOKBACK_DAYS} days.`,
    selectionMethodRequired: "MILP selection method is required.",
    finiteNumberSuffix: "must be a finite number.",
    positiveNumberSuffix: "must be greater than zero.",
    nonnegativeNumberSuffix: "must be zero or greater.",
    positiveIntegerSuffix: "must be a positive whole number.",
  },
  notifications: {
    loadShopsTitle: "Failed to load Shopee shops",
    loadShopsDescription: "Unable to load connected shops.",
    loadRunsTitle: "Failed to load MSP runs",
    loadRunsDescription: "Unable to load pipeline history.",
    loadRunTitle: "Failed to load pipeline run",
    loadRunDescription: "Unable to retrieve this pipeline run.",
    stageResultsUnavailable: "Stage results are not available yet.",
    artifactsUnavailable: "Artifacts are not available yet.",
    pipelineStartedTitle: "MSP pipeline started",
    pipelineAccepted: (runID: string) => `Run ${runID} was accepted.`,
    startPipelineError: "Unable to start the MSP pipeline.",
    cancellationRequestedTitle: "Pipeline cancellation requested",
    cancellationAccepted: "The controller accepted the cancellation.",
    cancellationFailedTitle: "Cancellation failed",
    cancellationError: "Unable to cancel this pipeline run.",
    loadArtifactTitle: "Failed to load artifact",
    loadArtifactError: "Unable to retrieve artifact content.",
  },
} as const;
