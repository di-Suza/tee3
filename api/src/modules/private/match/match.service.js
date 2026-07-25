import { MATCH_STATUS_FLOW, MatchStatus } from '../../../shared/constants/matchStatus.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { emitPublic, emitToMatch } from '../../../sockets/socketGateway.js';
import { responseCache } from '../../public/cache/responseCache.js';
import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import matchRepository from './match.repository.js';

class MatchService extends ScaffoldService {
  constructor(repository = matchRepository) {
    super('match', repository);
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  getPagination(query = {}) {
    return {
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  getListFilters(query = {}) {
    return {
      seriesId: query.seriesId,
      status: query.status,
      matchType: query.matchType,
      search: query.search,
    };
  }

  getSeriesTeamIds(series) {
    return (series.teams || [])
      .map((entry) => String(entry.team?._id || entry.team))
      .filter(Boolean);
  }

  assertSeriesCanSchedule(series) {
    if (!series) throw new NotFoundError('Series not found');
    if (series.status === 'COMPLETED') {
      throw new ConflictError('Cannot schedule matches for a completed series');
    }
  }

  assertTeamsBelongToSeries(series, team1, team2) {
    if (String(team1) === String(team2)) {
      throw new BadRequestError('A match cannot use the same team on both sides');
    }

    const seriesTeamIds = new Set(this.getSeriesTeamIds(series));
    if (!seriesTeamIds.has(String(team1)) || !seriesTeamIds.has(String(team2))) {
      throw new BadRequestError('Both match teams must be selected in this series');
    }
  }

  async assertEligibleMatchTeams(team1, team2) {
    const teams = await this.repository.findTeamsByIds([team1, team2]);
    const foundIds = new Set(teams.map((team) => String(team._id)));

    [team1, team2].forEach((teamId) => {
      if (!foundIds.has(String(teamId))) {
        throw new NotFoundError('One or more selected teams were not found');
      }
    });

    teams.forEach((team) => {
      if ((team.squadPlayers || []).length < 11) {
        throw new BadRequestError(`${team.name} needs at least 11 squad players before creating a match`);
      }
    });
  }

  assertScheduleWithinSeries(series, scheduledAt) {
    const scheduledDate = new Date(scheduledAt);
    const startDate = new Date(series.startDate);
    const endDate = new Date(series.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (scheduledDate < startDate || scheduledDate > endDate) {
      throw new BadRequestError('Match schedule must be within the series date window');
    }
  }

  assertStatusTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) return;

    const currentIndex = MATCH_STATUS_FLOW.indexOf(currentStatus);
    const nextIndex = MATCH_STATUS_FLOW.indexOf(nextStatus);

    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestError('Invalid match status');
    }

    if (nextIndex !== currentIndex + 1) {
      throw new ConflictError('Match status must follow the lifecycle step by step');
    }
  }

  hasPlayingXi(match) {
    return Boolean(match?.playingXI?.team1?.length === 11 && match?.playingXI?.team2?.length === 11);
  }

  getMatchTeamIds(match) {
    return [match?.team1?._id || match?.team1, match?.team2?._id || match?.team2].map((teamId) => String(teamId));
  }

  assertTeamBelongsToMatch(match, teamId, label = 'Team') {
    if (!this.getMatchTeamIds(match).includes(String(teamId))) {
      throw new BadRequestError(`${label} must be one of the match teams`);
    }
  }

  emitStatusEvents(match) {
    const payload = {
      matchId: String(match._id),
      match,
    };

    emitToMatch(match._id, 'match.status.updated', payload);

    if (match.status === MatchStatus.LIVE) {
      emitToMatch(match._id, 'match.started', payload);
    }

    if (match.status === MatchStatus.COMPLETED) {
      emitToMatch(match._id, 'match.completed', payload);
    }

    emitPublic('public.feed.updated', {
      matchId: String(match._id),
      reason: 'match.status.updated',
      status: match.status,
    });
  }

  async getAllMatches(query = {}) {
    return this.repository.findAll(this.getListFilters(query), this.getPagination(query));
  }

  async getMatchById(id) {
    const match = await this.repository.findById(id);
    if (!match) throw new NotFoundError('Match not found');
    return match;
  }

  async createMatch(data, requester = null) {
    if (!data.seriesId) {
      throw new BadRequestError('Series is required to create a match');
    }

    const series = await this.repository.findSeriesById(data.seriesId);
    this.assertSeriesCanSchedule(series);

    const existingMatches = await this.repository.countSeriesMatches(data.seriesId);
    if (existingMatches >= series.numberOfMatches) {
      throw new BadRequestError('Series match limit has already been reached');
    }

    this.assertTeamsBelongToSeries(series, data.team1, data.team2);
    await this.assertEligibleMatchTeams(data.team1, data.team2);
    this.assertScheduleWithinSeries(series, data.scheduledAt);

    const userId = this.getUserId(requester);
    const created = await this.repository.create({
      series: data.seriesId,
      team1: data.team1,
      team2: data.team2,
      scheduledAt: data.scheduledAt,
      venue: data.venue || '',
      matchType: series.matchType || 'T20',
      status: MatchStatus.UPCOMING,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    });

    await responseCache.clear();
    emitPublic('public.feed.updated', { matchId: String(created._id), reason: 'match.created' });
    return created;
  }

  async updateMatch(id, data, requester = null) {
    const match = await this.getMatchById(id);

    if (match.status !== MatchStatus.UPCOMING) {
      throw new ConflictError('Only upcoming scheduled matches can be edited');
    }

    const seriesId = match.series?._id || match.series;
    const series = await this.repository.findSeriesById(seriesId);
    this.assertSeriesCanSchedule(series);

    const team1 = data.team1 || match.team1?._id || match.team1;
    const team2 = data.team2 || match.team2?._id || match.team2;

    this.assertTeamsBelongToSeries(series, team1, team2);
    await this.assertEligibleMatchTeams(team1, team2);

    const scheduledAt = data.scheduledAt || match.scheduledAt;
    this.assertScheduleWithinSeries(series, scheduledAt);

    const payload = {
      team1,
      team2,
      scheduledAt,
      venue: data.venue ?? match.venue ?? '',
      matchType: series.matchType || 'T20',
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    };

    const updated = await this.repository.update(id, payload);
    if (!updated) throw new NotFoundError('Match not found');
    await responseCache.clear();
    emitPublic('public.feed.updated', { matchId: String(updated._id), reason: 'match.updated' });
    return updated;
  }

  async updateMatchStatus(id, status, requester = null) {
    const match = await this.getMatchById(id);
    this.assertStatusTransition(match.status, status);

    if (status === MatchStatus.TOSS_COMPLETED) {
      throw new ConflictError('Record toss winner and decision from the toss endpoint');
    }

    if (status === MatchStatus.PLAYING_XI_SELECTED) {
      throw new ConflictError('Select Playing XI from the Playing XI module to move this match forward');
    }

    if (status === MatchStatus.LIVE) {
      return this.startMatch(id, requester);
    }

    if (status === MatchStatus.COMPLETED) {
      throw new ConflictError('Complete the match with winner and result from the complete endpoint');
    }

    if (status === MatchStatus.LIVE && !this.hasPlayingXi(match)) {
      throw new ConflictError('Playing XI must be selected before starting the match');
    }

    const updated = await this.repository.update(id, {
      status,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });

    if (!updated) throw new NotFoundError('Match not found');
    await responseCache.clear();
    this.emitStatusEvents(updated);
    return updated;
  }

  async recordToss(id, data, requester = null) {
    const match = await this.getMatchById(id);

    if (match.status !== MatchStatus.UPCOMING) {
      throw new ConflictError('Toss can only be recorded for upcoming matches');
    }

    this.assertTeamBelongsToMatch(match, data.tossWinner, 'Toss winner');

    const updated = await this.repository.update(id, {
      tossWinner: data.tossWinner,
      tossDecision: data.tossDecision,
      status: MatchStatus.TOSS_COMPLETED,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });

    if (!updated) throw new NotFoundError('Match not found');

    const payload = { matchId: String(updated._id), match: updated };
    await responseCache.clear();
    emitToMatch(updated._id, 'toss.updated', payload);
    emitToMatch(updated._id, 'match.status.updated', payload);
    emitPublic('public.feed.updated', { matchId: String(updated._id), reason: 'toss.updated', status: updated.status });
    return updated;
  }

  async startMatch(id, requester = null) {
    const match = await this.getMatchById(id);

    if (match.status !== MatchStatus.PLAYING_XI_SELECTED) {
      throw new ConflictError('Match can only start after Playing XI is selected');
    }

    if (!this.hasPlayingXi(match)) {
      throw new ConflictError('Playing XI must be selected before starting the match');
    }

    const updated = await this.repository.update(id, {
      status: MatchStatus.LIVE,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });

    if (!updated) throw new NotFoundError('Match not found');
    await responseCache.clear();
    this.emitStatusEvents(updated);
    return updated;
  }

  async completeMatch(id, data, requester = null) {
    const match = await this.getMatchById(id);

    if (![MatchStatus.LIVE, MatchStatus.INNINGS_BREAK].includes(match.status)) {
      throw new ConflictError('Only live or innings-break matches can be completed');
    }

    this.assertTeamBelongsToMatch(match, data.winner, 'Winner');

    const updated = await this.repository.update(id, {
      winner: data.winner,
      result: data.result,
      status: MatchStatus.COMPLETED,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });

    if (!updated) throw new NotFoundError('Match not found');
    await responseCache.clear();
    this.emitStatusEvents(updated);
    return updated;
  }

  async deleteMatch(id, requester = null) {
    const match = await this.getMatchById(id);

    if ([MatchStatus.LIVE, MatchStatus.INNINGS_BREAK].includes(match.status)) {
      throw new ConflictError('Live matches cannot be deleted');
    }

    const deleted = await this.repository.delete(id, this.getUserId(requester));
    if (!deleted) throw new NotFoundError('Match not found');
    await responseCache.clear();
    emitPublic('public.feed.updated', { matchId: String(id), reason: 'match.deleted' });
    return deleted;
  }
}

export { MatchService };
export default new MatchService();
