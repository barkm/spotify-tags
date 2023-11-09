import { useEffect, useState } from "react";
import {
  Track,
  Tag,
  makeSpotifyRequest,
  getTags,
  createPlaylist,
  getTracks,
} from "./spotify";
import { IntervalWithPause } from "./interval";

async function getCurrentlyPlayingTrack(): Promise<Track | null> {
  const access_token = localStorage.getItem("access_token");
  if (!access_token) {
    throw Error();
  }
  const response = await makeSpotifyRequest(
    "/me/player/currently-playing",
    "GET"
  );
  if (response.status == 204) {
    return null;
  }
  if (response.status !== 200) {
    throw Error();
  }
  const body = await response.json();
  if (body.item === null) {
    return null;
  }
  return {
    id: body.item.id,
    name: body.item.name,
    artists: body.item.artists.map((artist: any) => artist.name),
  };
}

async function trackHasTag(track: Track, tag: Tag): Promise<boolean> {
  return (await getTracks(tag))
    .map((track: Track) => track.id)
    .includes(track.id);
}

async function toggleTagTrack(track: Track, tag: Tag): Promise<boolean> {
  let tagged = true;
  let method: "POST" | "DELETE" = "POST";
  if (await trackHasTag(track, tag)) {
    tagged = false;
    method = "DELETE";
  }
  await makeSpotifyRequest(
    "/playlists/" + tag.playlist_id + "/tracks",
    method,
    {},
    {
      uris: ["spotify:track:" + track.id],
    }
  );
  return tagged;
}

async function createTag(name: string) {
  return await createPlaylist(`#${name}`);
}

async function deleteTag(tag: Tag) {
  if (!confirm(`Do you want to delete "${tag.name}"? This cannot be undone!`)) {
    throw Error();
  }
  const delete_response = await makeSpotifyRequest(
    `/playlists/${tag.playlist_id}/followers`,
    "DELETE"
  );
  if (delete_response.status != 200) {
    throw Error();
  }
}

export function Tagger() {
  const [track, setTrack] = useState<Track | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [track_has_tag, setTrackHasTags] = useState<boolean[] | null>(null);
  const [search_pattern, setSearchPattern] = useState<string>("");

  useEffect(() => {
    getCurrentlyPlayingTrack().then(setTrack);
  }, []);
  useEffect(() => {
    const interval = new IntervalWithPause(
      () =>
        getCurrentlyPlayingTrack().then((new_track: Track | null) => {
          if (new_track?.id !== track?.id) {
            setTrack(new_track);
          }
        }),
      1e3
    );
    return () => {
      interval.clear();
    };
  }, [track]);
  useEffect(() => {
    getTags()
      .then((tags: Tag[]) => {
        tags.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name));
        return tags;
      })
      .then(setTags);
  }, []);
  useEffect(() => {
    if (!track || !tags) {
      return;
    }
    Promise.all(tags.map((tag: Tag) => trackHasTag(track, tag))).then(
      setTrackHasTags
    );
  }, [track, tags]);

  if (!track) {
    return <p>No track is playing</p>;
  }

  if (!tags || !track_has_tag) {
    return <p>Loading tags...</p>;
  }

  const buttons = tags.map((tag: Tag, index: number) => {
    return {
      tag: tag,
      button: (
        <button
          key={index}
          onClick={() =>
            toggleTagTrack(track, tag).then((is_tagged: boolean) => {
              let next_track_has_tag = [...track_has_tag];
              next_track_has_tag[index] = is_tagged;
              setTrackHasTags(next_track_has_tag);
            })
          }
        >
          {tag.name}
        </button>
      ),
    };
  });
  const tagged_buttons = buttons
    .filter((_, i: number) => track_has_tag[i])
    .map((b) => b.button);
  const untagged_buttons = buttons
    .filter(
      (b, i: number) => !track_has_tag[i] && b.tag.name.includes(search_pattern)
    )
    .map((b) => {
      return (
        <span>
          {b.button}
          <button
            onClick={() => deleteTag(b.tag).then(() => getTags().then(setTags))}
          >
            x
          </button>
        </span>
      );
    });

  return (
    <>
      <h1>{track.name}</h1>
      <h4>{track.artists}</h4>
      <p>{tagged_buttons}</p>
      <p>
        <input
          type="text"
          placeholder="search for tags"
          onChange={(event) => {
            setSearchPattern(event.target.value);
          }}
        />
        <button
          onClick={() => {
            if (!tags.map((t) => t.name).includes(search_pattern)) {
              createTag(search_pattern).then(() => {
                getTags().then(setTags);
              });
            }
          }}
        >
          +
        </button>
      </p>
      {untagged_buttons.map((b: JSX.Element, i: number) => (
        <p key={i}>{b}</p>
      ))}
    </>
  );
}
