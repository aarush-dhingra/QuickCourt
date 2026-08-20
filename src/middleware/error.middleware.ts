import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error:", err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errorCode: "VALIDATION_ERROR",
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format.",
      errorCode: "VALIDATION_ERROR",
    });
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry.",
      errorCode: "CONFLICT",
    });
  }

  // Default error
  const statusCode = 500;
  const message = env.NODE_ENV === "production" ? "Internal server error" : err.message;
  res.status(statusCode).json({
    success: false,
    message,
    errorCode: "INTERNAL_SERVER_ERROR",
  });
};
