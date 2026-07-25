import express from 'express';
import commentaryController from './commentary.controller.js';

class CommentaryPublicRoutes {
  constructor() {
    this.router = express.Router({ mergeParams: true });
    this.register();
  }

  register() {
    this.router.get('/', commentaryController.getAll);
  }

  getRouter() {
    return this.router;
  }
}

export { CommentaryPublicRoutes };
export default new CommentaryPublicRoutes().getRouter();
