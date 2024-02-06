import HttpError from './HttpError.js';

class BadRequestError extends HttpError {
  constructor(message, error) {
    super(400, message || 'Bad request');
    if (error) {
      this.stack = error.stack;
    }
  }
}

export default BadRequestError;
