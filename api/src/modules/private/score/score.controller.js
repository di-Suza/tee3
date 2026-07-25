import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import scoreService from './score.service.js';

class ScoreController extends ScaffoldController {
  constructor(service = scoreService) {
    super(service);
  }

  getScoreboard = async (req, res, next) => {
    try {
      const data = await this.service.getScoreboard(req.validated.matchId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  addBall = async (req, res, next) => {
    try {
      const { matchId, ...payload } = req.validated;
      const data = await this.service.addBall(matchId, payload, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export { ScoreController };
export default new ScoreController();
