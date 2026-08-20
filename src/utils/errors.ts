export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, errorCode: string = "BAD_REQUEST") {
    super(message, 400, errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", errorCode: string = "UNAUTHORIZED") {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", errorCode: string = "FORBIDDEN") {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found", errorCode: string = "NOT_FOUND") {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: string = "CONFLICT") {
    super(message, 409, errorCode);
  }
}
