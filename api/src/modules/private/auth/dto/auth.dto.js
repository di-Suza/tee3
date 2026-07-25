const authDto = Object.freeze({
  tokenPayloadFields: ['id', 'role', 'email'],
  responseFields: ['user', 'accessToken'],
});

export default authDto;
