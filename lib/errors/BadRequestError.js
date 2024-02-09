import HttpError from './HttpError.js';

class BadRequestError extends HttpError {
  constructor(message, error) {
    super(message || 'Bad request', 400);
    if (error) {
      this.stack = error.stack;
    }
  }
}

export default BadRequestError;
