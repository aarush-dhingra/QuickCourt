import { Response } from "express";

interface SuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
}

interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: Array<{ field: string; message: string }>;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): void => {
  const response: SuccessResponse<T> = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  errorCode: string,
  statusCode: number = 400,
  errors?: Array<{ field: string; message: string }>
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
    errorCode,
  };
  if (errors) response.errors = errors;
  res.status(statusCode).json(response);
};
