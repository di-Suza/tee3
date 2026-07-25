const seriesFields = Object.freeze({
  required: ['name', 'season', 'startDate', 'endDate', 'format', 'matchType', 'numberOfMatches'],
  optional: ['status', 'teams', 'createdBy', 'updatedBy', 'isDeleted'],
});

export default seriesFields;
