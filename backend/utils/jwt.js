import { StatusCodes } from 'http-status-codes';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  // `secure` only in production: a secure cookie sent over plain http on
  // localhost is dropped without a word, which presents as "login succeeds but
  // the very next request is unauthenticated".
  secure: process.env.NODE_ENV === 'production',
  // The deployed frontend (Netlify) and API (Render) are different sites, so
  // the session cookie has to be SameSite=None to survive the trip.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
});

export const sendToken = (user, statusCode, res) => {
  const token = user.signJWT();
  res.cookie('token', token, { ...cookieOptions(), maxAge: SEVEN_DAYS });
  // Also returned in the body so a non-browser client has something to use;
  // the browser app ignores it and relies on the cookie.
  res.status(statusCode).json({ success: true, token, user });
};

export const clearToken = (res) => {
  res.cookie('token', '', { ...cookieOptions(), expires: new Date(0) });
};

export { StatusCodes };
