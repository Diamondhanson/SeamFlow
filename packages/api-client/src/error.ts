/**
 * Thrown by every api-client method when the server returns a non-2xx
 * response. `status` is the HTTP status code, `body` is the parsed response
 * body (typically `{ statusCode, message, error }` from NestJS).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }
}
