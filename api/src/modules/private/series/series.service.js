import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import seriesRepository from './series.repository.js';

class SeriesService extends ScaffoldService {
  constructor(repository = seriesRepository) {
    super('series', repository);
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
      search: query.search,
      status: query.status,
      format: query.format,
      matchType: query.matchType,
    };
  }

  normalizeTeamInput(teams = []) {
    return teams.map((entry) => {
      if (typeof entry === 'string') {
        return { team: entry, group: null };
      }

      return {
        team: entry.team?._id || entry.team || entry.teamId,
        group: entry.group || null,
      };
    });
  }

  getSeriesTeamIds(series) {
    return (series.teams || [])
      .map((entry) => String(entry.team?._id || entry.team))
      .filter(Boolean);
  }

  assertDateRange(startDate, endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestError('End date must be after start date');
    }
  }

  assertStatusFlow(currentStatus, nextStatus) {
    const order = ['UPCOMING', 'LIVE', 'COMPLETED'];
    const currentIndex = order.indexOf(currentStatus);
    const nextIndex = order.indexOf(nextStatus);

    if (currentIndex === -1 || nextIndex === -1 || nextIndex < currentIndex) {
      throw new BadRequestError('Series status can only move from UPCOMING to LIVE to COMPLETED');
    }
  }

  async assertUniqueNameSeason(name, season, excludedId = null) {
    const existing = await this.repository.findByNameAndSeason(name, season, excludedId);
    if (existing) throw new ConflictError('Series with this name and season already exists');
  }

  async assertEligibleTeams(teams = [], format = null) {
    const normalizedTeams = this.normalizeTeamInput(teams);
    const teamIds = normalizedTeams.map((entry) => entry.team);
    const uniqueTeamIds = new Set(teamIds.map(String));

    if (teamIds.length !== uniqueTeamIds.size) {
      throw new BadRequestError('Duplicate teams are not allowed in a series');
    }

    if (format === 'A' && teamIds.length % 2 !== 0) {
      throw new BadRequestError('Format A requires an even number of teams');
    }

    if (format === 'B' && teamIds.length < 4) {
      throw new BadRequestError('Format B requires at least 4 teams');
    }

    if (teamIds.length === 0) return normalizedTeams;

    const foundTeams = await this.repository.findTeamsByIds(teamIds);
    const foundIds = new Set(foundTeams.map((team) => String(team._id)));

    teamIds.forEach((teamId) => {
      if (!foundIds.has(String(teamId))) {
        throw new NotFoundError('One or more selected teams were not found');
      }
    });

    foundTeams.forEach((team) => {
      if ((team.squadPlayers || []).length < 11) {
        throw new BadRequestError(`${team.name} needs at least 11 squad players before joining a series`);
      }
    });

    return normalizedTeams;
  }

  assertTeamsBelongToSeries(series, team1, team2) {
    if (String(team1) === String(team2)) {
      throw new BadRequestError('A match cannot use the same team on both sides');
    }

    const seriesTeamIds = new Set(this.getSeriesTeamIds(series));
    if (!seriesTeamIds.has(String(team1)) || !seriesTeamIds.has(String(team2))) {
      throw new BadRequestError('Both match teams must be added to this series first');
    }
  }

  async getAllSeries(query = {}) {
    return this.repository.findAll(this.getListFilters(query), this.getPagination(query));
  }

  async getSeriesById(id) {
    const series = await this.repository.findById(id);
    if (!series) throw new NotFoundError('Series not found');
    return series;
  }

  async getEligibleTeams() {
    return this.repository.getEligibleTeams();
  }

  async createSeries(data, requester = null) {
    this.assertDateRange(data.startDate, data.endDate);
    await this.assertUniqueNameSeason(data.name, data.season);

    const teams = await this.assertEligibleTeams(data.teams || [], data.format);
    const userId = this.getUserId(requester);
    const payload = {
      ...data,
      teams,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    };

    return this.repository.create(payload);
  }

  async updateSeries(id, data, requester = null) {
    const series = await this.getSeriesById(id);
    const nextName = data.name || series.name;
    const nextSeason = data.season || series.season;
    const nextStartDate = data.startDate || series.startDate;
    const nextEndDate = data.endDate || series.endDate;
    const nextFormat = data.format || series.format;

    this.assertDateRange(nextStartDate, nextEndDate);
    if (data.status) this.assertStatusFlow(series.status, data.status);
    await this.assertUniqueNameSeason(nextName, nextSeason, id);

    const payload = { ...data };
    if (data.teams) {
      payload.teams = await this.assertEligibleTeams(data.teams, nextFormat);
    } else if (data.format) {
      await this.assertEligibleTeams(series.teams, nextFormat);
    }

    const userId = this.getUserId(requester);
    if (userId) payload.updatedBy = userId;

    const updated = await this.repository.update(id, payload);
    if (!updated) throw new NotFoundError('Series not found');
    return updated;
  }

  async updateStatus(id, status, requester = null) {
    const series = await this.getSeriesById(id);
    this.assertStatusFlow(series.status, status);

    return this.repository.update(id, {
      status,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });
  }

  async deleteSeries(id, requester = null) {
    const matchCount = await this.repository.countSeriesMatches(id);
    if (matchCount > 0) {
      throw new ConflictError('Series cannot be deleted while scheduled matches exist');
    }

    const series = await this.repository.delete(id, this.getUserId(requester));
    if (!series) throw new NotFoundError('Series not found');
    return series;
  }

  async addTeams(id, teams, requester = null) {
    const series = await this.getSeriesById(id);
    const existingTeams = this.normalizeTeamInput(series.teams);
    const nextTeams = [...existingTeams, ...this.normalizeTeamInput(teams)];
    const eligibleTeams = await this.assertEligibleTeams(nextTeams, series.format);

    return this.repository.update(id, {
      teams: eligibleTeams,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });
  }

  async removeTeam(id, teamId, requester = null) {
    const series = await this.getSeriesById(id);
    const matchCount = await this.repository.countSeriesMatches(id);

    if (matchCount > 0) {
      throw new ConflictError('Series teams cannot be changed after matches are scheduled');
    }

    const teams = this.normalizeTeamInput(series.teams).filter((entry) => String(entry.team) !== String(teamId));
    await this.assertEligibleTeams(teams, series.format);

    return this.repository.update(id, {
      teams,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });
  }

  async getSeriesMatches(id) {
    await this.getSeriesById(id);
    return this.repository.findSeriesMatches(id);
  }

  async createSeriesMatch(id, data, requester = null) {
    const series = await this.getSeriesById(id);
    const existingMatches = await this.repository.countSeriesMatches(id);

    if (existingMatches >= series.numberOfMatches) {
      throw new BadRequestError('Series match limit has already been reached');
    }

    this.assertTeamsBelongToSeries(series, data.team1, data.team2);

    await this.assertEligibleTeams([{ team: data.team1 }, { team: data.team2 }]);

    const userId = this.getUserId(requester);
    return this.repository.createMatch({
      series: id,
      team1: data.team1,
      team2: data.team2,
      scheduledAt: data.scheduledAt,
      venue: data.venue || '',
      matchType: series.matchType || 'T20',
      status: MatchStatus.UPCOMING,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    });
  }

  async updateSeriesMatch(id, matchId, data, requester = null) {
    const series = await this.getSeriesById(id);
    const match = await this.repository.findSeriesMatch(id, matchId);
    if (!match) throw new NotFoundError('Match not found');
    if (match.status !== MatchStatus.UPCOMING) {
      throw new ConflictError('Only upcoming scheduled matches can be edited');
    }

    const team1 = data.team1 || match.team1?._id || match.team1;
    const team2 = data.team2 || match.team2?._id || match.team2;
    this.assertTeamsBelongToSeries(series, team1, team2);
    await this.assertEligibleTeams([{ team: team1 }, { team: team2 }]);

    const payload = {
      ...data,
      team1,
      team2,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    };

    const updated = await this.repository.updateSeriesMatch(id, matchId, payload);
    if (!updated) throw new NotFoundError('Match not found');
    return updated;
  }
}

export { SeriesService };
export default new SeriesService();
