import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { emitPublic, emitToMatch } from '../../../sockets/socketGateway.js';
import { responseCache } from '../../public/cache/responseCache.js';
import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import logger from '../../../config/logger.js';
import scoreRepository from './score.repository.js';

const MATCH_SCORING_RULES = Object.freeze({
  T20: { maxInnings: 2, maxBallsPerInnings: 120, maxOvers: 20 },
  ODI: { maxInnings: 2, maxBallsPerInnings: 300, maxOvers: 50 },
  TEST: { maxInnings: 4, maxBallsPerInnings: null, maxOvers: null },
});

class ScoreService extends ScaffoldService {
  constructor(repository = scoreRepository) {
    super('score', repository);
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  getTeamId(team) {
    return String(team?._id || team?.id || team);
  }

  getPlayerId(player) {
    return String(player?._id || player?.id || player?.player || player || '');
  }

  toPlain(value) {
    if (!value) return value;
    if (typeof value.toObject === 'function') {
      return value.toObject({ versionKey: false });
    }
    return value;
  }

  async notifyScoreUpdate(matchId, payload) {
    try {
      await responseCache.clear();
    } catch (error) {
      logger.warn(`Public cache could not be cleared: ${error.message}`);
    }

    try {
      emitToMatch(matchId, 'score.updated', payload);
      emitPublic('public.feed.updated', {
        matchId: String(matchId),
        reason: 'score.updated',
        score: payload.score,
        event: payload.event,
      });
    } catch (error) {
      logger.warn(`Score socket update could not be delivered: ${error.message}`);
    }
  }

  formatOvers(balls) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  calculateRunRate(runs, balls) {
    if (!balls) return 0;
    return Number((runs / (balls / 6)).toFixed(2));
  }

  isLegalBall(extraType) {
    return !['WIDE', 'NO_BALL'].includes(extraType);
  }

  getScoringRules(match) {
    return MATCH_SCORING_RULES[match?.matchType] || MATCH_SCORING_RULES.T20;
  }

  isInningsComplete(score, rules) {
    if (!score) return false;
    if (score.wickets >= 10) return true;
    if (rules.maxBallsPerInnings && score.balls >= rules.maxBallsPerInnings) return true;
    if (score.target && score.runs >= score.target) return true;
    return false;
  }

  getScoreByInnings(scores = [], innings) {
    return scores.find((score) => Number(score.innings) === Number(innings)) || null;
  }

  getLineupForTeam(match, teamId) {
    const requestedTeamId = this.getTeamId(teamId);
    if (requestedTeamId === this.getTeamId(match.team1)) return match.playingXI?.team1 || [];
    if (requestedTeamId === this.getTeamId(match.team2)) return match.playingXI?.team2 || [];
    return [];
  }

  getLineupPlayers(match, teamId) {
    return this.getLineupForTeam(match, teamId).map((entry) => entry.player).filter(Boolean);
  }

  getLineupPlayerIds(match, teamId) {
    return new Set(this.getLineupForTeam(match, teamId).map((entry) => this.getPlayerId(entry.player)));
  }

  getOppositeTeamId(match, teamId) {
    const requestedTeamId = this.getTeamId(teamId);
    const team1Id = this.getTeamId(match.team1);
    const team2Id = this.getTeamId(match.team2);
    if (requestedTeamId === team1Id) return team2Id;
    if (requestedTeamId === team2Id) return team1Id;
    return null;
  }

  getExpectedFirstBattingTeam(match) {
    if (!match?.tossWinner || !match?.tossDecision) return null;
    const tossWinner = this.getTeamId(match.tossWinner);
    return match.tossDecision === 'BAT' ? tossWinner : this.getOppositeTeamId(match, tossWinner);
  }

  assertLiveMatch(match) {
    if (!match) throw new NotFoundError('Match not found');
    if (![MatchStatus.LIVE, MatchStatus.INNINGS_BREAK].includes(match.status)) {
      throw new ConflictError('Score can only be updated for live matches');
    }
  }

  resolveBowlingTeam(match, battingTeamId) {
    const requestedTeamId = this.getTeamId(battingTeamId);
    const team1Id = this.getTeamId(match.team1);
    const team2Id = this.getTeamId(match.team2);

    if (requestedTeamId === team1Id) return team2Id;
    if (requestedTeamId === team2Id) return team1Id;

    throw new BadRequestError('Batting team must be one of the match teams');
  }

  assertExpectedBattingTeam(match, data) {
    if (Number(data.innings) !== 1) return;

    const expectedTeam = this.getExpectedFirstBattingTeam(match);
    if (expectedTeam && expectedTeam !== this.getTeamId(data.battingTeam)) {
      throw new BadRequestError('First innings batting team must follow the toss decision');
    }
  }

  assertPlayerInLineup(playerId, allowedIds, label) {
    if (!playerId || !allowedIds.has(String(playerId))) {
      throw new BadRequestError(`${label} must be selected in the Playing XI`);
    }
  }

  getDismissedPlayerIds(events = [], innings) {
    return new Set(
      events
        .filter((event) => Number(event.innings) === Number(innings) && event.dismissedPlayer)
        .map((event) => this.getPlayerId(event.dismissedPlayer))
    );
  }

  getAvailableBattingIds(match, battingTeamId, dismissedIds) {
    return this.getLineupForTeam(match, battingTeamId)
      .map((entry) => this.getPlayerId(entry.player))
      .filter((playerId) => playerId && !dismissedIds.has(playerId));
  }

  pickAvailablePlayer(preferredIds = [], availableIds = [], blockedIds = new Set()) {
    const preferred = preferredIds.find((playerId) => playerId && availableIds.includes(playerId) && !blockedIds.has(playerId));
    if (preferred) return preferred;

    return availableIds.find((playerId) => !blockedIds.has(playerId)) || '';
  }

  resolveActiveBatters(match, score, data, events = []) {
    const dismissedIds = this.getDismissedPlayerIds(events, data.innings);
    const availableIds = this.getAvailableBattingIds(match, data.battingTeam, dismissedIds);
    const scoreStriker = this.getPlayerId(score?.currentStriker);
    const scoreNonStriker = this.getPlayerId(score?.currentNonStriker);
    const dataStriker = this.getPlayerId(data.striker);
    const dataNonStriker = this.getPlayerId(data.nonStriker);

    const striker = this.pickAvailablePlayer(
      score ? [scoreStriker, dataStriker] : [dataStriker, scoreStriker],
      availableIds
    );
    const nonStriker = this.pickAvailablePlayer(
      score ? [scoreNonStriker, dataNonStriker] : [dataNonStriker, scoreNonStriker],
      availableIds,
      new Set([striker])
    );

    return {
      striker,
      nonStriker,
      dismissedIds,
    };
  }

  resolveBallPlayers(match, score, data, events = []) {
    const battingIds = this.getLineupPlayerIds(match, data.battingTeam);
    const bowlingTeam = this.resolveBowlingTeam(match, data.battingTeam);
    const bowlingIds = this.getLineupPlayerIds(match, bowlingTeam);
    const { striker, nonStriker, dismissedIds } = this.resolveActiveBatters(match, score, data, events);
    const bowler = data.bowler || this.getPlayerId(score?.currentBowler);

    if (!striker || !nonStriker || !bowler) {
      throw new BadRequestError('Striker, non-striker, and bowler are required before scoring a ball');
    }

    if (striker === nonStriker) {
      throw new BadRequestError('Striker and non-striker must be different players');
    }

    this.assertPlayerInLineup(striker, battingIds, 'Striker');
    this.assertPlayerInLineup(nonStriker, battingIds, 'Non-striker');
    this.assertPlayerInLineup(bowler, bowlingIds, 'Bowler');

    const dismissedPlayer = data.isWicket ? data.dismissedPlayer || striker : null;
    if (dismissedPlayer && ![striker, nonStriker].includes(String(dismissedPlayer))) {
      throw new BadRequestError('Dismissed player must be the striker or non-striker');
    }

    if (dismissedIds.has(striker) || dismissedIds.has(nonStriker)) {
      throw new ConflictError('Dismissed players cannot continue batting');
    }

    if (data.newBatter) {
      this.assertPlayerInLineup(data.newBatter, battingIds, 'New batter');
      if ([striker, nonStriker].includes(String(data.newBatter)) || dismissedIds.has(String(data.newBatter))) {
        throw new BadRequestError('New batter must be an available batting player');
      }
    }

    return {
      striker,
      nonStriker,
      bowler,
      bowlingTeam,
      dismissedPlayer,
      newBatter: data.newBatter || null,
    };
  }

  shouldSwapForRuns(runs, extras, extraType) {
    const runningRuns = Number(runs || 0) + (['BYE', 'LEG_BYE'].includes(extraType) ? Number(extras || 0) : 0);
    return runningRuns % 2 === 1;
  }

  resolveNextStrike(participants, data, isLegalBall, nextBalls, nextWickets) {
    let striker = participants.striker;
    let nonStriker = participants.nonStriker;

    if (data.isWicket && participants.dismissedPlayer && nextWickets < 10) {
      if (!participants.newBatter) {
        throw new BadRequestError('New batter is required unless the innings is all out');
      }

      if (participants.dismissedPlayer === striker) {
        striker = participants.newBatter;
      } else if (participants.dismissedPlayer === nonStriker) {
        nonStriker = participants.newBatter;
      }
    }

    if (this.shouldSwapForRuns(data.runs, data.extras, data.extraType || 'NONE')) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (isLegalBall && nextBalls % 6 === 0) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    return { striker, nonStriker };
  }

  async assertInningsCanStart(match, data) {
    const rules = this.getScoringRules(match);
    this.assertExpectedBattingTeam(match, data);

    if (data.innings > rules.maxInnings) {
      throw new BadRequestError(`${match.matchType || 'T20'} matches can have only ${rules.maxInnings} innings`);
    }

    const scores = await this.repository.findScores(match._id);

    if (data.innings > 1) {
      const previousScore = this.getScoreByInnings(scores, data.innings - 1);

      if (!this.isInningsComplete(previousScore, rules)) {
        throw new ConflictError(`Innings ${data.innings} can start only after innings ${data.innings - 1} is complete`);
      }
    }

    if (['T20', 'ODI'].includes(match.matchType) && data.innings === 2) {
      const firstInnings = this.getScoreByInnings(scores, 1);
      if (firstInnings && this.getTeamId(firstInnings.battingTeam) === this.getTeamId(data.battingTeam)) {
        throw new BadRequestError('Second innings batting team must be the opposite team');
      }
    }

    return {
      rules,
      scores,
    };
  }

  async getScoreboard(matchId) {
    const match = await this.repository.findMatch(matchId);
    if (!match) throw new NotFoundError('Match not found');

    const [scores, recentEvents, events] = await Promise.all([
      this.repository.findScores(matchId),
      this.repository.findRecentEvents(matchId),
      this.repository.findAllEvents(matchId),
    ]);

    return {
      match,
      scores,
      recentEvents,
      stats: this.calculateScoreStats(match, scores, events),
      inningsPlayerMeta: this.getInningsPlayerMeta(match, scores, events),
      fallOfWickets: this.calculateFallOfWickets(events),
    };
  }

  async getOrCreateScore(match, data, scores, participants, requester = null) {
    const score = await this.repository.findScore(match._id, data.innings);
    const bowlingTeam = participants.bowlingTeam;
    const previousScore = data.innings > 1 ? this.getScoreByInnings(scores, data.innings - 1) : null;
    const target = previousScore ? previousScore.runs + 1 : null;

    if (score) {
      if (this.getTeamId(score.battingTeam) !== String(data.battingTeam)) {
        throw new ConflictError('This innings already belongs to another batting team');
      }

      return score;
    }

    return this.repository.createScore({
      match: match._id,
      innings: data.innings,
      battingTeam: data.battingTeam,
      bowlingTeam,
      target,
      currentStriker: participants.striker,
      currentNonStriker: participants.nonStriker,
      currentBowler: participants.bowler,
      ...(this.getUserId(requester) ? { createdBy: this.getUserId(requester), updatedBy: this.getUserId(requester) } : {}),
    });
  }

  createPlayerStat(player) {
    return {
      player,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      overs: '0.0',
      runsConceded: 0,
      wickets: 0,
    };
  }

  calculateScoreStats(match, scores = [], events = []) {
    return scores.map((score) => {
      const battingIds = this.getLineupPlayerIds(match, score.battingTeam);
      const bowlingIds = this.getLineupPlayerIds(match, score.bowlingTeam);
      const batting = new Map();
      const bowling = new Map();

      this.getLineupForTeam(match, score.battingTeam).forEach((entry) => {
        batting.set(this.getPlayerId(entry.player), this.createPlayerStat(entry.player));
      });

      this.getLineupForTeam(match, score.bowlingTeam).forEach((entry) => {
        bowling.set(this.getPlayerId(entry.player), this.createPlayerStat(entry.player));
      });

      events
        .filter((event) => Number(event.innings) === Number(score.innings))
        .forEach((event) => {
          const strikerId = this.getPlayerId(event.striker);
          const bowlerId = this.getPlayerId(event.bowler);

          if (battingIds.has(strikerId)) {
            const stat = batting.get(strikerId) || this.createPlayerStat(event.striker);
            stat.runs += Number(event.batterRuns || event.runs || 0);
            if (event.isLegalBall) stat.balls += 1;
            if (Number(event.batterRuns || event.runs) === 4) stat.fours += 1;
            if (Number(event.batterRuns || event.runs) === 6) stat.sixes += 1;
            batting.set(strikerId, stat);
          }

          const dismissedId = this.getPlayerId(event.dismissedPlayer);
          if (dismissedId && batting.has(dismissedId)) {
            batting.get(dismissedId).isOut = true;
          }

          if (bowlingIds.has(bowlerId)) {
            const stat = bowling.get(bowlerId) || this.createPlayerStat(event.bowler);
            if (event.isLegalBall) stat.balls += 1;
            stat.runsConceded += Number(event.runs || 0) + (['WIDE', 'NO_BALL'].includes(event.extraType) ? Number(event.extras || 0) : 0);
            if (event.isWicket && !['RUN_OUT', 'RETIRED_HURT'].includes(event.wicketType)) stat.wickets += 1;
            stat.overs = this.formatOvers(stat.balls);
            bowling.set(bowlerId, stat);
          }
        });

      return {
        innings: score.innings,
        batting: Array.from(batting.values()),
        bowling: Array.from(bowling.values()),
      };
    });
  }

  getInningsPlayerMeta(match, scores = [], events = []) {
    return scores.map((score) => {
      const dismissedIds = this.getDismissedPlayerIds(events, score.innings);
      const activeBatterIds = [
        this.getPlayerId(score.currentStriker),
        this.getPlayerId(score.currentNonStriker),
      ].filter(Boolean);
      const activeBatterSet = new Set(activeBatterIds);

      return {
        innings: score.innings,
        battingTeam: score.battingTeam,
        dismissedPlayerIds: Array.from(dismissedIds),
        activeBatterIds,
        availableNewBatters: this.getLineupPlayers(match, score.battingTeam).filter((player) => {
          const playerId = this.getPlayerId(player);
          return playerId && !dismissedIds.has(playerId) && !activeBatterSet.has(playerId);
        }),
      };
    });
  }

  calculateFallOfWickets(events = []) {
    const fallOfWickets = [];
    const inningsState = new Map();

    events.forEach((event) => {
      const innings = Number(event.innings);
      
      if (!inningsState.has(innings)) {
        inningsState.set(innings, { runs: 0, wickets: 0 });
      }

      const state = inningsState.get(innings);
      state.runs += Number(event.runs || 0) + (['WIDE', 'NO_BALL'].includes(event.extraType) ? Number(event.extras || 0) : 0) + (['BYE', 'LEG_BYE'].includes(event.extraType) ? Number(event.extras || 0) : 0);

      if (event.isWicket) {
        state.wickets += 1;
        fallOfWickets.push({
          innings: innings,
          over: `${event.over}.${event.ball}`,
          player: event.dismissedPlayer?.name,
          runs: event.batterRuns || 0, // This is runs scored by that batter in this ball, not total. The prompt requires batter's total runs. Wait, I'll fix this below.
          balls: 0, 
          score: state.runs,
          wickets: state.wickets,
          dismissal: event.wicketType,
          isLast: state.wickets === 10
        });
      }
    });

    // To get the dismissed player's runs and balls accurately, we must accumulate them per player.
    const fowFinal = [];
    const playerStats = new Map();

    events.forEach((event) => {
      const strikerId = this.getPlayerId(event.striker);
      if (!playerStats.has(strikerId)) {
        playerStats.set(strikerId, { runs: 0, balls: 0 });
      }

      const stat = playerStats.get(strikerId);
      stat.runs += Number(event.batterRuns || event.runs || 0);
      if (event.isLegalBall) stat.balls += 1;

      if (event.isWicket) {
        const dismissedId = this.getPlayerId(event.dismissedPlayer);
        // Sometimes the dismissed player is the non-striker
        const dismissedStat = playerStats.get(dismissedId) || { runs: 0, balls: 0 };
        
        // Find the corresponding FOW we pushed earlier
        const fowEntry = fallOfWickets.find(f => f.player === event.dismissedPlayer?.name && f.over === `${event.over}.${event.ball}`);
        if (fowEntry) {
          fowEntry.runs = dismissedStat.runs;
          fowEntry.balls = dismissedStat.balls;
          fowFinal.push(fowEntry);
        }
      }
    });

    return fowFinal;
  }

  async addBall(matchId, data, requester = null) {
    const match = await this.repository.findMatch(matchId);
    this.assertLiveMatch(match);
    
    if (match.status === MatchStatus.INNINGS_BREAK) {
      match.status = MatchStatus.LIVE;
      await match.save();
      emitToMatch(matchId, 'match.status.updated', { matchId: String(matchId), status: MatchStatus.LIVE });
      emitPublic('public.feed.updated', { matchId: String(matchId), reason: 'match.status.updated' });
    }
    
    const { rules, scores } = await this.assertInningsCanStart(match, data);
    const events = await this.repository.findAllEvents(matchId);
    const existingScore = await this.repository.findScore(match._id, data.innings);
    const initialParticipants = this.resolveBallPlayers(match, existingScore, data, events);
    const score = await this.getOrCreateScore(match, data, scores, initialParticipants, requester);
    const participants = this.resolveBallPlayers(match, score, data, events);
    if (this.isInningsComplete(score, rules)) {
      throw new ConflictError('This innings is already complete');
    }

    const extraType = data.extraType || 'NONE';
    const extras = Number(data.extras || 0);
    const runs = Number(data.runs || 0);
    const isLegalBall = this.isLegalBall(extraType);
    const wicketDelta = data.isWicket ? 1 : 0;
    const nextWickets = score.wickets + wicketDelta;

    if (nextWickets > 10) {
      throw new BadRequestError('Wickets cannot be more than 10');
    }

    if (extraType === 'NONE' && extras > 0) {
      throw new BadRequestError('Extra type is required when extras are added');
    }

    if (rules.maxBallsPerInnings && score.balls >= rules.maxBallsPerInnings) {
      throw new ConflictError(`Innings cannot exceed ${rules.maxOvers} overs`);
    }

    const eventOver = Math.floor(score.balls / 6);
    const eventBall = (score.balls % 6) + 1;
    const nextRuns = score.runs + runs + extras;
    const nextBalls = score.balls + (isLegalBall ? 1 : 0);
    const nextStrike = this.resolveNextStrike(participants, { ...data, extraType }, isLegalBall, nextBalls, nextWickets);
    const userId = this.getUserId(requester);

    const event = await this.repository.createEvent({
      match: match._id,
      score: score._id,
      innings: score.innings,
      battingTeam: this.getTeamId(score.battingTeam),
      bowlingTeam: this.getTeamId(score.bowlingTeam),
      striker: participants.striker,
      nonStriker: participants.nonStriker,
      bowler: participants.bowler,
      dismissedPlayer: participants.dismissedPlayer,
      newBatter: participants.newBatter,
      over: eventOver,
      ball: eventBall,
      runs,
      batterRuns: runs,
      extras,
      extraType,
      totalRuns: runs + extras,
      isLegalBall,
      isWicket: Boolean(data.isWicket),
      wicketType: data.isWicket ? data.wicketType || 'OTHER' : null,
      note: data.note || '',
      ...(userId ? { createdBy: userId } : {}),
    });

    const updatedScore = await this.repository.updateScore(score._id, {
      runs: nextRuns,
      wickets: nextWickets,
      balls: nextBalls,
      overs: this.formatOvers(nextBalls),
      runRate: this.calculateRunRate(nextRuns, nextBalls),
      currentStriker: nextStrike.striker,
      currentNonStriker: nextStrike.nonStriker,
      currentBowler: participants.bowler,
      ...(userId ? { updatedBy: userId } : {}),
    });

    const payload = {
      matchId: String(match._id),
      score: this.toPlain(updatedScore),
      event: this.toPlain(event),
    };

    await this.notifyScoreUpdate(match._id, payload);
    return payload;
  }
}

export { ScoreService };
export default new ScoreService();
