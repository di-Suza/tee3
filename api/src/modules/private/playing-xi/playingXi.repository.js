import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import Match from '../match/match.model.js';

class PlayingXiRepository extends ScaffoldRepository {
  constructor(model = Match) {
    super('playing-xi');
    this.model = model;
  }

  populateMatch(query) {
    return query
      .populate('series', 'name season matchType status')
      .populate({
        path: 'team1',
        select: 'name shortName logo primaryColor squadPlayers',
        populate: {
          path: 'squadPlayers',
          match: { isDeleted: false },
          select: 'name role country image battingStyle bowlingStyle',
        },
      })
      .populate({
        path: 'team2',
        select: 'name shortName logo primaryColor squadPlayers',
        populate: {
          path: 'squadPlayers',
          match: { isDeleted: false },
          select: 'name role country image battingStyle bowlingStyle',
        },
      })
      .populate('playingXI.team1.player', 'name role country image')
      .populate('playingXI.team2.player', 'name role country image');
  }

  findMatchForSelection(matchId) {
    return this.populateMatch(this.model.findOne({ _id: matchId, isDeleted: false }));
  }

  savePlayingXi(matchId, playingXI, updatedBy = null) {
    return this.populateMatch(
      this.model.findOneAndUpdate(
        { _id: matchId, isDeleted: false, status: MatchStatus.TOSS_COMPLETED },
        {
          $set: {
            playingXI,
            status: MatchStatus.PLAYING_XI_SELECTED,
            ...(updatedBy ? { updatedBy } : {}),
          },
        },
        { new: true, runValidators: true }
      )
    );
  }
}

export { PlayingXiRepository };
export default new PlayingXiRepository();
