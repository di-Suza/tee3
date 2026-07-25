import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { emitPublic, emitToMatch } from '../../../sockets/socketGateway.js';
import { responseCache } from '../../public/cache/responseCache.js';
import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import commentaryRepository from './commentary.repository.js';

class CommentaryService extends ScaffoldService {
  constructor(repository = commentaryRepository) {
    super('commentary', repository);
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  assertLiveMatch(match) {
    if (!match) throw new NotFoundError('Match not found');
    if (match.status !== MatchStatus.LIVE) {
      throw new ConflictError('Commentary can only be added for live matches');
    }
  }

  async getCommentary(matchId, query = {}) {
    const match = await this.repository.findMatch(matchId);
    if (!match) throw new NotFoundError('Match not found');

    return this.repository.findAll(matchId, query);
  }

  async resolveBallContext(matchId, data) {
    if (data.scoreEventId) {
      const scoreEvent = await this.repository.findScoreEvent(matchId, data.scoreEventId);
      if (!scoreEvent) throw new NotFoundError('Score event not found for this match');

      return {
        scoreEvent,
        innings: scoreEvent.innings,
        over: scoreEvent.over,
        ball: scoreEvent.ball,
      };
    }

    if (data.innings !== undefined && data.over !== undefined && data.ball !== undefined) {
      return {
        scoreEvent: null,
        innings: data.innings,
        over: data.over,
        ball: data.ball,
      };
    }

    const latestEvent = await this.repository.findLatestScoreEvent(matchId);
    if (!latestEvent) {
      throw new BadRequestError('Score a ball first or provide over and ball for commentary');
    }

    return {
      scoreEvent: latestEvent,
      innings: latestEvent.innings,
      over: latestEvent.over,
      ball: latestEvent.ball,
    };
  }

  async createCommentary(matchId, data, requester = null) {
    const match = await this.repository.findMatch(matchId);
    this.assertLiveMatch(match);

    const context = await this.resolveBallContext(matchId, data);
    const commentary = await this.repository.create({
      match: matchId,
      scoreEvent: context.scoreEvent?._id || null,
      innings: context.innings,
      over: context.over,
      ball: context.ball,
      text: data.text,
      type: data.type || 'NORMAL',
      ...(this.getUserId(requester) ? { createdBy: this.getUserId(requester) } : {}),
    });

    await responseCache.clear();
    emitToMatch(matchId, 'commentary.created', {
      matchId: String(matchId),
      commentary,
    });
    emitPublic('public.feed.updated', { matchId: String(matchId), reason: 'commentary.created' });

    return commentary;
  }

  async deleteCommentary(id, requester = null) {
    const commentary = await this.repository.delete(id, this.getUserId(requester));
    if (!commentary) throw new NotFoundError('Commentary not found');

    await responseCache.clear();
    emitToMatch(commentary.match, 'commentary.deleted', {
      matchId: String(commentary.match),
      commentaryId: String(commentary._id),
    });
    emitPublic('public.feed.updated', { matchId: String(commentary.match), reason: 'commentary.deleted' });

    return commentary;
  }
}

export { CommentaryService };
export default new CommentaryService();
