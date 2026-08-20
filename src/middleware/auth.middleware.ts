import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendError } from "../utils/apiResponse";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Unauthorized", "UNAUTHORIZED", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      ...decoded,
      id: decoded.sub,
    };
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired token", "UNAUTHORIZED", 401);
  }
};
