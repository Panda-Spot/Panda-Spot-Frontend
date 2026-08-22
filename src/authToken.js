// The auth token lives in localStorage, not a cookie — the frontend
// (Vercel) and API (VPS) are on entirely different domains, and modern
// browsers increasingly block third-party cookies outright (Safari by
// default, Chrome rolling it out), which silently broke session
// persistence right after a fresh signup/login. A Bearer token sent
// explicitly on every request sidesteps that whole class of problem.
const TOKEN_KEY = "pandaspot_token"

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
