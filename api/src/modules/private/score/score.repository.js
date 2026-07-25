import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Match from '../match/match.model.js';
import Score, { ScoreEvent } from './score.model.js';

class ScoreRepository extends ScaffoldRepository {
  constructor(scoreModel = Score, eventModel = ScoreEvent, matchModel = Match) {
    super('score');
    this.scoreModel = scoreModel;
    this.eventModel = eventModel;
    this.matchModel = matchModel;
  }

  populateMatch(query) {
    return query
      .populate('series', 'name season matchType status')
      .populate({ path: 'team1', select: 'name shortName logo primaryColor squadPlayers', populate: { path: 'squadPlayers', select: 'name role country image' } })
      .populate({ path: 'team2', select: 'name shortName logo primaryColor squadPlayers', populate: { path: 'squadPlayers', select: 'name role country image' } })
      .populate('tossWinner', 'name shortName logo primaryColor')
      .populate('winner', 'name shortName logo primaryColor')
      .populate('playingXI.team1.player', 'name role country image')
      .populate('playingXI.team2.player', 'name role country image');
  }

  populateScore(query) {
    return query
      .populate('battingTeam', 'name shortName logo primaryColor')
      .populate('bowlingTeam', 'name shortName logo primaryColor')
      .populate('currentStriker', 'name role country image')
      .populate('currentNonStriker', 'name role country image')
      .populate('currentBowler', 'name role country image');
  }

  populateEvent(query) {
    return query
      .populate('battingTeam', 'name shortName logo primaryColor')
      .populate('bowlingTeam', 'name shortName logo primaryColor')
      .populate('striker', 'name role country image')
      .populate('nonStriker', 'name role country image')
      .populate('bowler', 'name role country image')
      .populate('dismissedPlayer', 'name role country image')
      .populate('newBatter', 'name role country image');
  }

  findMatch(matchId) {
    return this.populateMatch(this.matchModel.findOne({ _id: matchId, isDeleted: false }));
  }

  findScore(matchId, innings) {
    return this.populateScore(this.scoreModel.findOne({ match: matchId, innings }));
  }

  async createScore(data) {
    const score = await this.scoreModel.create(data);
    return this.populateScore(this.scoreModel.findById(score._id));
  }

  updateScore(scoreId, data) {
    return this.populateScore(
      this.scoreModel.findByIdAndUpdate(scoreId, data, {
        returnDocument: 'after',
        runValidators: true,
      })
    );
  }

  async createEvent(data) {
    const event = await this.eventModel.create(data);
    return this.populateEvent(this.eventModel.findById(event._id));
  }

  findScores(matchId) {
    return this.populateScore(this.scoreModel.find({ match: matchId }).sort({ innings: 1 }));
  }

  findRecentEvents(matchId, limit = 24) {
    return this.populateEvent(
      this.eventModel
        .find({ match: matchId })
        .sort({ createdAt: -1 })
        .limit(Number(limit || 24))
    );
  }

  findAllEvents(matchId) {
    return this.populateEvent(this.eventModel.find({ match: matchId }).sort({ innings: 1, createdAt: 1 }));
  }
}

export { ScoreRepository };
export default new ScoreRepository();
