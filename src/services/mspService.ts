import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import {
  PipelineRunAccepted,
  PipelineRunArtifactContent,
  PipelineRunArtifactsData,
  PipelineRunListData,
  PipelineRunStageResults,
  PipelineRunView,
  ShopeePipelineUploadFiles,
} from "@/types/Msp";

export interface GetPipelineRunsParams {
  shopId?: number;
  page: number;
  limit: number;
}

export const uploadAndStartPipeline = async (
  shopId: number,
  config: Record<string, unknown>,
  files: ShopeePipelineUploadFiles,
  idempotencyKey: string,
): Promise<PipelineRunAccepted> => {
  const formData = new FormData();
  formData.append("shop_id", shopId.toString());
  formData.append("config", JSON.stringify(config));
  formData.append("order_mapping", files.orderMapping);
  formData.append("supplier_info", files.supplierInfo);
  formData.append("sku_master", files.skuMaster);
  formData.append("business_constraints", files.businessConstraints);

  const response = await api.post<ApiResponse<PipelineRunAccepted>>(
    "/api/msp/pipeline-runs/upload-start",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return response.data.data;
};

export const getPipelineRuns = async (
  params: GetPipelineRunsParams,
): Promise<PipelineRunListData> => {
  const searchParams = new URLSearchParams();
  searchParams.set("page", params.page.toString());
  searchParams.set("limit", params.limit.toString());
  searchParams.set("summary", "true");
  if (params.shopId !== undefined) {
    searchParams.set("shop_id", params.shopId.toString());
  }

  const response = await api.get<ApiResponse<PipelineRunListData>>(
    `/api/msp/pipeline-runs?${searchParams.toString()}`,
  );
  return response.data.data;
};

export const getPipelineRun = async (
  pipelineRunId: string,
): Promise<PipelineRunView> => {
  const response = await api.get<ApiResponse<PipelineRunView>>(
    `/api/msp/pipeline-runs/${encodeURIComponent(pipelineRunId)}`,
  );
  return response.data.data;
};

export const getPipelineStageResults = async (
  pipelineRunId: string,
): Promise<PipelineRunStageResults> => {
  const response = await api.get<ApiResponse<PipelineRunStageResults>>(
    `/api/msp/pipeline-runs/${encodeURIComponent(pipelineRunId)}/stage-results`,
  );
  return response.data.data;
};

export const getPipelineArtifacts = async (
  pipelineRunId: string,
): Promise<PipelineRunArtifactsData> => {
  const response = await api.get<ApiResponse<PipelineRunArtifactsData>>(
    `/api/msp/pipeline-runs/${encodeURIComponent(pipelineRunId)}/artifacts`,
  );
  return response.data.data;
};

export const getPipelineArtifactContent = async (
  pipelineRunId: string,
  artifactName: string,
): Promise<PipelineRunArtifactContent> => {
  const response = await api.get<ApiResponse<PipelineRunArtifactContent>>(
    `/api/msp/pipeline-runs/${encodeURIComponent(pipelineRunId)}/artifacts/${encodeURIComponent(artifactName)}/content`,
  );
  return response.data.data;
};

export const cancelPipelineRun = async (
  pipelineRunId: string,
): Promise<PipelineRunView> => {
  const response = await api.post<ApiResponse<PipelineRunView>>(
    `/api/msp/pipeline-runs/${encodeURIComponent(pipelineRunId)}/cancel`,
  );
  return response.data.data;
};
