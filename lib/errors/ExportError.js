class ExportError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }

  setError(error) {
    this.error = error;
    this.name = error.name;
    if (error.stack) {
      this.stack = error.stack;
    }
    return this;
  }
}

export default ExportError;
