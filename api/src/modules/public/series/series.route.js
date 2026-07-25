import express from 'express';
import seriesController from './series.controller.js';

const router = express.Router();

router.get('/', seriesController.getAll);
router.get('/:id', seriesController.getById);

export default router;
