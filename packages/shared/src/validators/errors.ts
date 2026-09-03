export class SharedValidationError extends Error {
  public readonly code = 'VALIDATION' as const;

  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = 'SharedValidationError';
  }
}