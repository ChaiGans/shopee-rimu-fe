import type {
  MspPolicyValues,
  PipelineRunStatus,
} from "@/types/Msp";
import type { Shop } from "@/types/Shop";

import {
  CSV_FILE_EXTENSION,
  EMPTY_DISPLAY_VALUE,
  EMPTY_TEXT,
  MAX_LOOKBACK_DAYS,
  MIN_LOOKBACK_DAYS,
  MSP_TEXT,
  NUMERIC_POLICY_FIELDS,
  SHOP_FALLBACK_PREFIX,
  SHOP_OPTION_SEPARATOR,
} from "./constants";

export type NormalizedStageStatus =
  | "pending"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export const isActiveStatus = (status: unknown): boolean => {
  const normalized = String(status ?? EMPTY_TEXT).toLowerCase();
  return normalized === "queued" || normalized === "running";
};

export const normalizeStageStatus = (status: unknown): NormalizedStageStatus => {
  switch (String(status ?? EMPTY_TEXT).toLowerCase()) {
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

export const statusLabel = (status: NormalizedStageStatus | PipelineRunStatus): string => {
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

export const statusClassName = (status: NormalizedStageStatus | PipelineRunStatus): string => {
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

export const formatDate = (value?: string | null): string => {
  if (!value) {
    return EMPTY_DISPLAY_VALUE;
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

export const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === EMPTY_TEXT) {
    return EMPTY_DISPLAY_VALUE;
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

export const jsonText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return EMPTY_DISPLAY_VALUE;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? EMPTY_DISPLAY_VALUE;
  } catch {
    return String(value);
  }
};

export const buildPipelineConfig = ({
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
  policy: MspPolicyValues;
}): { config: Record<string, unknown> | null; error: string | null } => {
  const config: Record<string, unknown> = {};
  if (useDateRange) {
    if (!rangeStart || !rangeEnd) {
      return { config: null, error: MSP_TEXT.validation.dateRangeRequired };
    }
    if (rangeEnd < rangeStart) {
      return { config: null, error: MSP_TEXT.validation.dateRangeOrder };
    }
    config.range_start = rangeStart;
    config.range_end = rangeEnd;
  } else {
    const parsedLookback = Number(lookbackDays);
    if (!Number.isInteger(parsedLookback) || parsedLookback < MIN_LOOKBACK_DAYS || parsedLookback > MAX_LOOKBACK_DAYS) {
      return { config: null, error: MSP_TEXT.validation.lookbackRange };
    }
    config.lookback_days = parsedLookback;
  }
  if (forceRefresh) {
    config.force_refresh = true;
  }

  const selectionMethod = policy.milp_selection_method.trim();
  if (!selectionMethod) {
    return { config: null, error: MSP_TEXT.validation.selectionMethodRequired };
  }
  const additionalSettings: Record<string, unknown> = {
    milp_selection_method: selectionMethod,
  };
  for (const field of NUMERIC_POLICY_FIELDS) {
    const rawValue = policy[field.key].trim();
    if (rawValue === EMPTY_TEXT) {
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return { config: null, error: `${field.label} ${MSP_TEXT.validation.finiteNumberSuffix}` };
    }
    if (field.rule === "positive" && value <= 0) {
      return { config: null, error: `${field.label} ${MSP_TEXT.validation.positiveNumberSuffix}` };
    }
    if (field.rule === "nonnegative" && value < 0) {
      return { config: null, error: `${field.label} ${MSP_TEXT.validation.nonnegativeNumberSuffix}` };
    }
    if (field.rule === "integer" && (!Number.isInteger(value) || value < 1)) {
      return { config: null, error: `${field.label} ${MSP_TEXT.validation.positiveIntegerSuffix}` };
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

export const formatShopName = (shop: Pick<Shop, "name" | "identifier">): string =>
  shop.name || `${SHOP_FALLBACK_PREFIX} ${shop.identifier}`;

export const formatShopOption = (shop: Pick<Shop, "name" | "identifier">): string =>
  `${formatShopName(shop)}${SHOP_OPTION_SEPARATOR}${shop.identifier}`;

export const isCsvFile = (file: File): boolean =>
  file.name.toLowerCase().endsWith(CSV_FILE_EXTENSION);
