const playerFields = Object.freeze({
  required: ['name', 'image', 'role', 'country', 'battingStyle'],
  optional: ['bowlingStyle', 'createdBy', 'updatedBy', 'isDeleted'],
});

export default playerFields;
