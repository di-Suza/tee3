import { NotFoundError } from '../../../shared/errors/index.js';
import seriesRepository from '../../private/series/series.repository.js';
import PublicQueryHelper from '../shared/query.js';
import pointsTableService from '../points-table/pointsTable.service.js';

class SeriesPublicService {
  constructor(repository = seriesRepository) {
    this.repository = repository;
  }

  getPagination(query = {}) {
    return {
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  getListFilters(query = {}) {
    return {
      search: query.search,
      status: query.status,
      format: query.format,
    };
  }

  serializeTeam(entry) {
    const team = entry.team?.toObject ? entry.team.toObject() : entry.team;

    return {
      _id: team?._id,
      name: team?.name,
      shortName: team?.shortName,
      logo: team?.logo,
      primaryColor: team?.primaryColor,
      group: entry.group,
    };
  }

  serializeSeries(series) {
    const data = series?.toObject ? series.toObject() : series;

    return {
      _id: data._id,
      name: data.name,
      season: data.season,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      format: data.format,
      matchType: data.matchType,
      numberOfMatches: data.numberOfMatches,
      teams: Array.isArray(data.teams) ? data.teams.filter((entry) => entry.team).map((entry) => this.serializeTeam(entry)) : [],
    };
  }

  async getSeries(query = {}) {
    const { series, pagination } = await this.repository.findAll(
      this.getListFilters(query),
      this.getPagination(query)
    );

    return {
      series: series.map((item) => this.serializeSeries(item)),
      pagination,
    };
  }

  async getSeriesById(id) {
    const safeId = PublicQueryHelper.ensureId(id, 'Series');
    const [series, matches, pointsTable] = await Promise.all([
      this.repository.findById(safeId),
      this.repository.findSeriesMatches(safeId),
      pointsTableService.getPointsTable(safeId),
    ]);

    if (!series) throw new NotFoundError('Series not found');

    return {
      series: this.serializeSeries(series),
      matches,
      pointsTable,
    };
  }
}

export { SeriesPublicService };
export default new SeriesPublicService();
