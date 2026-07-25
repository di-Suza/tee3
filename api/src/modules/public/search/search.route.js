import express from 'express';
import searchController from './search.controller.js';

class SearchPublicRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.get('/', searchController.search);
  }

  getRouter() {
    return this.router;
  }
}

export { SearchPublicRoutes };
export default new SearchPublicRoutes().getRouter();
