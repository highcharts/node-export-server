class ExportError extends Error {
  /**
   * @param {string} message - The error message.
   * @param {number} statusCode - The status code (400, 500, etc.).
   */
  constructor(message, statusCode) {
    super();

    this.message = message;
    this.stackMessage = message;

    if (statusCode) {
      this.statusCode = statusCode;
    }
  }

  setError(error) {
    this.error = error;

    if (error.name) {
      this.name = error.name;
    }

    if (error.statusCode) {
      this.statusCode = error.statusCode;
    }

    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }

    return this;
  }
}

export default ExportError;
