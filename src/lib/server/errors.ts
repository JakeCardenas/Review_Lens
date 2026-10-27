/** An error whose message is safe and useful to show to the person using the app. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = () => new AppError("NOT_FOUND", "This upload doesn't exist or was deleted.", 404);
