import axios from "axios";

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong."
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }
    if (typeof responseData?.error === "string") {
      return responseData.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
