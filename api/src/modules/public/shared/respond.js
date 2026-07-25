import asyncHandler from '../../../shared/utils/asyncHandler.js';

class PublicResponder {
  static ok(handler) {
    return asyncHandler(async (req, res) => {
      const data = await handler(req);
      res.json({ success: true, data });
    });
  }
}

export default PublicResponder;
