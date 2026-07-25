import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import playingXiService from './playingXi.service.js';

class PlayingXiController extends ScaffoldController {
  constructor(service = playingXiService) {
    super(service);
  }

  getSelection = async (req, res, next) => {
    try {
      const data = await this.service.getSelection(req.validated.matchId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  select = async (req, res, next) => {
    try {
      const { matchId, ...payload } = req.validated;
      const data = await this.service.selectPlayingXi(matchId, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export { PlayingXiController };
export default new PlayingXiController();
