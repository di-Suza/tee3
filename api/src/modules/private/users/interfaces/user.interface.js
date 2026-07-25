const userFields = Object.freeze({
  required: ['name', 'email', 'password'],
  optional: ['role', 'isDeleted'],
});

export default userFields;
