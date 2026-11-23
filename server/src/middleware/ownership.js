import mongoose from 'mongoose';

/**
 * Middleware factory to ensure that the authenticated user is the owner
 * of the document specified by req.params[paramName] (defaults to 'id').
 * Admins are also allowed access.
 */
export const requireOwner = (Model, ownerField = 'seller', customForbiddenMsg = 'Forbidden', paramName = 'id') => async (req, res, next) => {
  try {
    const id = req.params[paramName] || req.params.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const docOwner = doc[ownerField];
    const isOwner = docOwner && (
      docOwner._id
        ? docOwner._id.equals(req.user._id)
        : docOwner.equals
          ? docOwner.equals(req.user._id)
          : docOwner.toString() === req.user._id.toString()
    );

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: customForbiddenMsg });
    }

    req.doc = doc;
    next();
  } catch (err) {
    next(err);
  }
};
