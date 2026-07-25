import express from 'express';
import homeController from './home.controller.js';

class HomePublicRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.get('/', homeController.getHomeFeed);
  }

  getRouter() {
    return this.router;
  }
}

export { HomePublicRoutes };
export default new HomePublicRoutes().getRouter();
