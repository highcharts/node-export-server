import ExportError from './ExportError.js';

class HttpError extends ExportError {
  constructor(message, status, errorCode = false) {
    super(message);
    this.status = this.statusCode = status;

    if (errorCode) {
      this.errorCode = errorCode;
    }
  }

  setStatus(status) {
    this.status = status;
    return this;
  }
}

export default HttpError;
