const authFields = Object.freeze({
  register: ['name', 'email', 'password', 'role'],
  login: ['email', 'password'],
});

export default authFields;
