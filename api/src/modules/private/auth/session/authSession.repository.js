import AuthSession from './authSession.model.js';

class AuthSessionRepository {
  create(payload) {
    return AuthSession.create(payload);
  }

  findByRefreshTokenHash(refreshTokenHash) {
    return AuthSession.findOne({ refreshTokenHash });
  }

  findActiveByRefreshTokenHash(refreshTokenHash) {
    return AuthSession.findOne({
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  revokeByRefreshTokenHash(refreshTokenHash, reason = 'LOGOUT') {
    return AuthSession.findOneAndUpdate(
      {
        refreshTokenHash,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true }
    );
  }

  revokeAllByUserId(userId, reason = 'LOGOUT_ALL') {
    return AuthSession.updateMany(
      {
        userId,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      }
    );
  }

  deleteExpiredSessions() {
    return AuthSession.deleteMany({
      expiresAt: { $lte: new Date() },
    });
  }
}

const authSessionRepository = new AuthSessionRepository();

export { AuthSessionRepository };
export default authSessionRepository;
