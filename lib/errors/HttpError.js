import ExportError from './ExportError.js';

class HttpError extends ExportError {
  /**
   * @param {string} message - The error message.
   * @param {number} statusCode - The status code (400, 500, etc.).
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
  }

  setStatus(statusCode) {
    this.statusCode = statusCode;

    return this;
  }
}

export default HttpError;
