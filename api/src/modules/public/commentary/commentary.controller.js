import asyncHandler from '../../../shared/utils/asyncHandler.js';
import commentaryService from './commentary.service.js';

class CommentaryPublicController {
  constructor(service = commentaryService) {
    this.service = service;
    this.getAll = asyncHandler(this.getAll.bind(this));
  }

  async getAll(req, res) {
    const { commentary, pagination } = await this.service.getCommentary(req.params.matchId, req.query);
    res.json({ success: true, data: commentary, meta: pagination });
  }
}

export { CommentaryPublicController };
export default new CommentaryPublicController();
