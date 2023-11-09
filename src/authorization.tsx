const CLIENT_ID = "5c84cbaecef5498a904d81a6a11b07a1";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI + import.meta.env.BASE_URL;

const SCOPE = "user-read-currently-playing playlist-read-private playlist-modify-private playlist-modify-public";
const AUTH_URL = new URL("https://accounts.spotify.com/authorize")

const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

const base64Encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const authorize = async () => {
  const code_verifier = generateRandomString(64);
  localStorage.setItem("code_verifier", code_verifier);
  const hashed = await sha256(code_verifier)
  const code_challenge = base64Encode(hashed);
  const params =  {
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: code_challenge,
    redirect_uri: REDIRECT_URI,
  }
  AUTH_URL.search = new URLSearchParams(params).toString();
  window.location.href = AUTH_URL.toString();
}

const getToken = async (): Promise<void> => {
  console.log("Fetching access token");
  let code_verifier = localStorage.getItem('code_verifier');
  if (!code_verifier) {
    console.log("No code verifier");
    throw Error()
  }
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) {
    console.log("No code");
    throw Error()
  }
  url.searchParams.delete("code")
  history.replaceState(history.state, '', url.href);
  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: code_verifier,
      }),
    }
  );
  const body = await response.json();
  if (response.status != 200) {
    throw Error()
  }

  const access_token = body.access_token
  const refresh_token = body.refresh_token
  if (!access_token || !refresh_token) {
    throw Error()
  }
  console.log(access_token, refresh_token);
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);
}

export const isAuthorized = async () => {
  if (localStorage.getItem("access_token")) {
    console.log("Found access token");
    return
  }
  await getToken()
}

export const refreshAccessToken = async () => {
  console.log("refreshing acess token");
  const refresh_token = localStorage.getItem('refresh_token') as string;
  const url = "https://accounts.spotify.com/api/token";
   const payload = {
     method: 'POST',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded'
     },
     body: new URLSearchParams({
       grant_type: 'refresh_token',
       refresh_token: refresh_token,
       client_id: CLIENT_ID
     }),
   }
   const body = await fetch(url, payload);
   const response = await body.json();
   localStorage.setItem('access_token', response.access_token);
   localStorage.setItem('refresh_token', response.refresh_token);
 }

 export const deauthorize = () => {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
 }