import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import commentaryService from './commentary.service.js';

class CommentaryController extends ScaffoldController {
  constructor(service = commentaryService) {
    super(service);
  }

  getAll = async (req, res, next) => {
    try {
      const { matchId, ...query } = req.validated;
      const { commentary, pagination } = await this.service.getCommentary(matchId, query);
      res.status(200).json({ success: true, data: commentary, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const { matchId, ...payload } = req.validated;
      const data = await this.service.createCommentary(matchId, payload, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.deleteCommentary(req.validated.id, req.user);
      res.status(200).json({ success: true, message: 'Commentary deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export { CommentaryController };
export default new CommentaryController();
