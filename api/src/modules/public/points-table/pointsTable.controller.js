import asyncHandler from '../../../shared/utils/asyncHandler.js';
import pointsTableService from './pointsTable.service.js';

class PointsTablePublicController {
  constructor(service = pointsTableService) {
    this.service = service;
    this.getBySeries = asyncHandler(this.getBySeries.bind(this));
  }

  async getBySeries(req, res) {
    const data = await this.service.getPointsTable(req.params.seriesId);
    res.json({ success: true, data });
  }
}

export { PointsTablePublicController };
export default new PointsTablePublicController();
