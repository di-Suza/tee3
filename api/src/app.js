import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';

import env from './config/env.js';
import authRoutes from './modules/private/auth/auth.route.js';
import commentaryRoutes from './modules/private/commentary/commentary.route.js';
import matchRoutes from './modules/private/match/match.route.js';
import playerRoutes from './modules/private/player/player.route.js';
import playingXiRoutes from './modules/private/playing-xi/playingXi.route.js';
import scoreRoutes from './modules/private/score/score.route.js';
import seriesRoutes from './modules/private/series/series.route.js';
import squadRoutes from './modules/private/squad/squad.route.js';
import responseCache from './modules/public/cache/responseCache.js';
import publicCommentaryRoutes from './modules/public/commentary/commentary.route.js';
import publicHomeRoutes from './modules/public/home/home.route.js';
import publicMatchRoutes from './modules/public/match/match.route.js';
import publicPlayerRoutes from './modules/public/player/player.route.js';
import publicPointsTableRoutes from './modules/public/points-table/pointsTable.route.js';
import publicSearchRoutes from './modules/public/search/search.route.js';
import publicSeriesRoutes from './modules/public/series/series.route.js';
import publicTeamRoutes from './modules/public/team/team.route.js';
import teamRoutes from './modules/private/team/team.route.js';
import userRoutes from './modules/private/users/user.route.js';
import errorHandler from './shared/middleware/errorHandler.js';
import notFound from './shared/middleware/notFound.js';
import requestLogger from './shared/middleware/requestLogger.js';
import { apiRateLimiter, securityHeaders } from './shared/middleware/security.js';

function getAllowedCorsOrigins() {
  if (env.CORS_ORIGIN === '*') return '*';

  const configuredOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const origins = new Set(configuredOrigins);

  if (env.NODE_ENV === 'development') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }

  return Array.from(origins);
}

function publicOnlyRouter(...middlewares) {
  const router = express.Router({ mergeParams: true });

  router.use((req, _res, next) => {
    if (req.headers.authorization) return next('router');
    return next();
  });

  router.use(...middlewares);
  return router;
}

function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  return next();
}

function shouldBypassLiveMatchCache(req) {
  const status = String(req.query.status || '').toLowerCase();
  return req.originalUrl.includes('/center') || ['live', 'innings_break'].includes(status);
}

class App {
  constructor() {
    this.app = express();
    this.registerGlobalMiddleware();
    this.registerHealthCheck();
    this.registerPublicRoutes();
    this.registerAdminRoutes();
    this.registerErrorMiddleware();
  }

  getInstance() {
    return this.app;
  }

  registerGlobalMiddleware() {
    this.app.disable('x-powered-by');
    this.app.disable('etag');
    this.app.use(requestLogger);
    this.app.use(securityHeaders);
    const allowedOrigins = getAllowedCorsOrigins();
    this.app.use(
      cors({
        origin: allowedOrigins === '*' ? true : allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '5mb' }));
    this.app.use(cookieParser());
    this.app.use(apiRateLimiter);
  }

  registerHealthCheck() {
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'Cricket backend is healthy',
      });
    });
  }

  registerPublicRoutes() {
    this.app.use('/api/public/home', noStore, publicHomeRoutes);
    this.app.use('/api/public/matches/:matchId/commentary', noStore, publicCommentaryRoutes);
    this.app.use('/api/public/matches', noStore, responseCache(10, { shouldBypass: shouldBypassLiveMatchCache }), publicMatchRoutes);
    this.app.use('/api/public/series/:seriesId/points-table', responseCache(30), publicPointsTableRoutes);
    this.app.use('/api/public/search', responseCache(30), publicSearchRoutes);
    this.app.use('/api/public/series', responseCache(60), publicSeriesRoutes);
    this.app.use('/api/public/teams', responseCache(60), publicTeamRoutes);
    this.app.use('/api/public/players', responseCache(60), publicPlayerRoutes);

    this.app.use('/api/home', noStore, publicHomeRoutes);
    this.app.use('/api/matches/:matchId/commentary', publicOnlyRouter(noStore, publicCommentaryRoutes));
    this.app.use('/api/matches', publicOnlyRouter(noStore, responseCache(10, { shouldBypass: shouldBypassLiveMatchCache }), publicMatchRoutes));
    this.app.use('/api/series/:seriesId/points-table', publicOnlyRouter(responseCache(30), publicPointsTableRoutes));
    this.app.use('/api/search', responseCache(30), publicSearchRoutes);
    this.app.use('/api/series', publicOnlyRouter(responseCache(60), publicSeriesRoutes));
    this.app.use('/api/teams', publicOnlyRouter(responseCache(60), publicTeamRoutes));
    this.app.use('/api/players', publicOnlyRouter(responseCache(60), publicPlayerRoutes));
  }

  registerAdminRoutes() {
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/teams/:teamId/squad', squadRoutes);
    this.app.use('/api/matches/:matchId/playing-xi', playingXiRoutes);
    this.app.use('/api/matches/:matchId/scores', scoreRoutes);
    this.app.use('/api/matches/:matchId/commentary', commentaryRoutes);
    this.app.use('/api/series', seriesRoutes);
    this.app.use('/api/teams', teamRoutes);
    this.app.use('/api/players', playerRoutes);
    this.app.use('/api/matches', matchRoutes);
  }

  registerErrorMiddleware() {
    this.app.use(notFound);
    this.app.use(errorHandler);
  }
}

const appFactory = new App();

export { App };
export default appFactory.getInstance();
