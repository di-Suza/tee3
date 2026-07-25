import seriesService from './series.service.js';

class SeriesPublicController {
  constructor(service = seriesService) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const { series, pagination } = await this.service.getSeries(req.query);
      res.status(200).json({ success: true, data: series, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getSeriesById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export { SeriesPublicController };
export default new SeriesPublicController();
