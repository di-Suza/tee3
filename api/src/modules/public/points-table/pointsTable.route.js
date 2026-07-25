import express from 'express';
import pointsTableController from './pointsTable.controller.js';

class PointsTablePublicRoutes {
  constructor() {
    this.router = express.Router({ mergeParams: true });
    this.register();
  }

  register() {
    this.router.get('/', pointsTableController.getBySeries);
  }

  getRouter() {
    return this.router;
  }
}

export { PointsTablePublicRoutes };
export default new PointsTablePublicRoutes().getRouter();
