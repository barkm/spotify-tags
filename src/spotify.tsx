import { refreshAccessToken } from "./authorization";

export interface Tag {
  name: string;
  playlist_id: string;
}

export interface Track {
  id: string;
  name: string;
  artists: string[];
}

export async function makeSpotifyRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE",
  search_params?: any,
  body?: any
): Promise<Response> {
  console.log(endpoint, method);
  const access_token = localStorage.getItem("access_token");
  if (!access_token) {
    throw Error();
  }
  let url = new URL("https://api.spotify.com/v1" + endpoint)
  if (search_params) {
    url.search = new URLSearchParams(search_params).toString()
  }
  const response = await fetch(url.toString(), {
    method: method,
    headers: {
      Authorization: "Bearer " + access_token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (response.status === 401) {
    await refreshAccessToken()
    return await makeSpotifyRequest(endpoint, method, body)
  }
  return response
}

export async function getTags(): Promise<Tag[]> {
  const response = await makeSpotifyRequest("/me/playlists", "GET", {limit: 50});
  if (response.status != 200) {
    throw Error()
  }
  const body = await response.json();
  return body.items
    .filter((playlist: any) => playlist.name.startsWith("#"))
    .map((playlist: any) => {
      return { name: playlist.name, playlist_id: playlist.id };
    });
}

export async function createPlaylist(name: string): Promise<string> {
  const me_response = await makeSpotifyRequest("/me", "GET");
  const me_body = await me_response.json();
  const id = me_body["id"];
  const create_response = await makeSpotifyRequest(
    `/users/${id}/playlists`,
    "POST",
    {},
    {
      name: name,
      public: false,
    }
  );
  if (create_response.status != 201) {
    throw Error();
  }
  const response_data = await create_response.json();
  return response_data["id"];
}

async function requestTracks(playlist_id: string, params?: URLSearchParams): Promise<Track[]> {
  const response = await makeSpotifyRequest(
    `/playlists/${playlist_id}/tracks`,
    "GET",
    params ? params : {limit: 50}
  );
  const data = await response.json();
  let tracks = data["items"].map((item: any): Track => {
    return {
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((artist: any) => artist.name),
    };
  });
  if (data["next"]) {
    const next_params = new URL(data["next"]).searchParams
    const next_tracks = await requestTracks(playlist_id, next_params)
    tracks = tracks.concat(next_tracks)
  }
    return tracks
}

export async function getTracks(tag: Tag): Promise<Track[]> {
  return await requestTracks(tag.playlist_id)
}