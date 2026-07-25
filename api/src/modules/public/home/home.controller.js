import asyncHandler from '../../../shared/utils/asyncHandler.js';
import homeService from './home.service.js';

class HomePublicController {
  constructor(service = homeService) {
    this.service = service;
    this.getHomeFeed = asyncHandler(this.getHomeFeed.bind(this));
  }

  async getHomeFeed(_req, res) {
    const data = await this.service.getHomeFeed();
    res.json({ success: true, data });
  }
}

export { HomePublicController };
export default new HomePublicController();
