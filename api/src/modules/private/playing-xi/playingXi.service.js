import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { emitPublic, emitToMatch } from '../../../sockets/socketGateway.js';
import { responseCache } from '../../public/cache/responseCache.js';
import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import playingXiRepository from './playingXi.repository.js';

class PlayingXiService extends ScaffoldService {
  constructor(repository = playingXiRepository) {
    super('playing-xi', repository);
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  getPlayerId(player) {
    return String(player?._id || player?.id || player?.player || player);
  }

  hasSelectedPlayingXi(match) {
    return Boolean(match?.playingXI?.team1?.length || match?.playingXI?.team2?.length);
  }

  getSquadIds(team) {
    return new Set((team?.squadPlayers || []).map((player) => this.getPlayerId(player)));
  }

  normalizeLineup(lineup = [], team, label) {
    if (!Array.isArray(lineup) || lineup.length !== 11) {
      throw new BadRequestError(`${label} must have exactly 11 players`);
    }

    const squadIds = this.getSquadIds(team);
    const seen = new Set();
    let captainCount = 0;
    let wicketKeeperCount = 0;

    const normalized = lineup.map((entry) => {
      const playerId = String(entry.player);

      if (seen.has(playerId)) {
        throw new BadRequestError(`${label} has duplicate players`);
      }

      if (!squadIds.has(playerId)) {
        throw new BadRequestError(`${label} players must belong to the team squad`);
      }

      seen.add(playerId);

      const isCaptain = Boolean(entry.isCaptain);
      const isWicketKeeper = Boolean(entry.isWicketKeeper);
      if (isCaptain) captainCount += 1;
      if (isWicketKeeper) wicketKeeperCount += 1;

      return {
        player: playerId,
        isCaptain,
        isWicketKeeper,
      };
    });

    if (captainCount !== 1) {
      throw new BadRequestError(`${label} must have exactly one captain`);
    }

    if (wicketKeeperCount !== 1) {
      throw new BadRequestError(`${label} must have exactly one wicket keeper`);
    }

    return normalized;
  }

  async getSelection(matchId) {
    const match = await this.repository.findMatchForSelection(matchId);
    if (!match) throw new NotFoundError('Match not found');
    return match;
  }

  async selectPlayingXi(matchId, data, requester = null) {
    const match = await this.getSelection(matchId);

    if (match.status !== MatchStatus.TOSS_COMPLETED) {
      throw new ConflictError('Playing XI can only be selected after toss is completed');
    }

    if (this.hasSelectedPlayingXi(match)) {
      throw new ConflictError('Playing XI is already selected for this match');
    }

    const team1Lineup = this.normalizeLineup(data.team1, match.team1, match.team1?.name || 'Team 1');
    const team2Lineup = this.normalizeLineup(data.team2, match.team2, match.team2?.name || 'Team 2');

    const allSelected = [...team1Lineup, ...team2Lineup].map((entry) => String(entry.player));
    if (new Set(allSelected).size !== allSelected.length) {
      throw new BadRequestError('A player cannot be selected for both teams');
    }

    const updated = await this.repository.savePlayingXi(
      matchId,
      {
        team1: team1Lineup,
        team2: team2Lineup,
        selectedAt: new Date(),
        ...(this.getUserId(requester) ? { selectedBy: this.getUserId(requester) } : {}),
      },
      this.getUserId(requester)
    );

    if (!updated) {
      throw new ConflictError('Playing XI could not be saved because match status changed');
    }

    await responseCache.clear();
    emitToMatch(matchId, 'playingXI.updated', {
      matchId: String(matchId),
      match: updated,
    });
    emitToMatch(matchId, 'match.status.updated', {
      matchId: String(matchId),
      match: updated,
    });
    emitPublic('public.feed.updated', { matchId: String(matchId), reason: 'playingXI.updated' });

    return updated;
  }
}

export { PlayingXiService };
export default new PlayingXiService();
