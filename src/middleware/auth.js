import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please Add a Missing Token' })
  }
  const token = header.slice('Bearer '.length)
  const secret=process.env.JWT_SECRET ?? "SECRET" ;
  try {
    req.user = jwt.verify(token, secret) 
    next()
  } catch (error) {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin access only' })
  }
  next()
}
