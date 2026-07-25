import asyncHandler from '../../../shared/utils/asyncHandler.js';
import searchService from './search.service.js';

class SearchPublicController {
  constructor(service = searchService) {
    this.service = service;
    this.search = asyncHandler(this.search.bind(this));
  }

  async search(req, res) {
    const data = await this.service.search(req.query);
    res.json({ success: true, data });
  }
}

export { SearchPublicController };
export default new SearchPublicController();
