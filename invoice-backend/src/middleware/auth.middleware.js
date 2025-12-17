const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log('[AUTH MIDDLEWARE] No token provided'); // ✅ log error
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error(err);
    console.log('[AUTH MIDDLEWARE] Invalid Token :', err); // ✅ log error
    return res.status(401).json({ message: 'Invalid token' });
  }
};
