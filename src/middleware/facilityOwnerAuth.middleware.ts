import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendError } from "../utils/apiResponse";

/**
 * Combined authentication + role-guard middleware for the Facility Owner API.
 *
 * Validates the Bearer JWT, attaches `req.user`, and then checks that
 * the caller's role is exactly "FACILITY_OWNER". Returns 401 for missing/
 * invalid tokens and 403 for any other role.
 */
export const facilityOwnerAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Unauthorized", "UNAUTHORIZED", 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = { ...decoded, id: decoded.sub };

    if (req.user.role !== "FACILITY_OWNER") {
      sendError(
        res,
        "Access denied. Facility owner role required.",
        "FORBIDDEN",
        403
      );
      return;
    }

    next();
  } catch {
    sendError(res, "Invalid or expired token", "UNAUTHORIZED", 401);
  }
};
