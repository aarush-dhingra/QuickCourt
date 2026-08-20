import { Request, Response } from "express";
import { sendError } from "../utils/apiResponse";

export const notFoundMiddleware = (req: Request, res: Response) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, "NOT_FOUND", 404);
};
