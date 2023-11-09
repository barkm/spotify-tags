import { useEffect, useState } from "react";
import {
  Tag,
  Track,
  makeSpotifyRequest,
  getTags,
  createPlaylist,
  getTracks,
} from "./spotify";

function reduceIntersection<Type>(
  list_of_lists: Type[][],
  key: (t: Type) => any
) {
  if (list_of_lists.length === 0) {
    return [];
  }
  return list_of_lists.reduce((intersection: Type[], list: Type[]) => {
    const key_list = list.map(key);
    return intersection.filter((v) => key_list.includes(key(v)));
  }, list_of_lists[0]);
}

function reduceUnion<Type>(list_of_lists: Type[][]) {
  if (list_of_lists.length === 0) {
    return [];
  }
  return list_of_lists.slice(1).reduce((union: Type[], list: Type[]) => {
    return union.concat(list);
  }, list_of_lists[0]);
}

async function getTracksWithTags(
  source_tags: Tag[],
  required_tags: Tag[]
): Promise<Track[]> {
  const tracks_for_source_tags = await Promise.all(source_tags.map(getTracks));
  if (required_tags.length === 0) {
    return reduceUnion(tracks_for_source_tags);
  }
  const get_track_id = (t: Track) => t.id;
  const tracks_with_required_tags = await Promise.all(
    required_tags.map(getTracks)
  ).then((all_tracks) => reduceIntersection(all_tracks, get_track_id));
  const tracks_for_source_tags_in_required = tracks_for_source_tags.map(
    (tracks: Track[]) =>
      reduceIntersection([tracks, tracks_with_required_tags], get_track_id)
  );
  return reduceUnion(tracks_for_source_tags_in_required);
}

async function addTracks(playlist_id: string, tracks: Track[]) {
  if (tracks.length === 0) {
    return;
  }
  const response = await makeSpotifyRequest(
    "/playlists/" + playlist_id + "/tracks",
    "POST",
    {},
    {
      uris: tracks.map((track: Track) => "spotify:track:" + track.id),
    }
  );
  console.log(response.status);
}

async function createPlaylistWithTracks(name: string, tracks: Track[]) {
  createPlaylist(name).then((id) => addTracks(id, tracks));
}

export function Creator() {
  const [playlist_name, setPlaylistName] = useState<string>("");
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [tag_is_required, setTagIsRequired] = useState<boolean[] | null>(null);
  const [tag_is_source, setTagIsSource] = useState<boolean[] | null>(null);
  const [selected_tracks, setSelectedTracks] = useState<Track[]>([]);
  const [search_pattern, setSearchPattern] = useState<string>("");
  useEffect(() => {
    getTags()
      .then((tags: Tag[]) => {
        tags.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name));
        return tags;
      })
      .then((tags: Tag[]) => {
        setTags(tags);
        setTagIsRequired(Array(tags.length).fill(false));
        setTagIsSource(Array(tags.length).fill(false));
      });
  }, []);

  useEffect(() => {
    if (!tags || !tag_is_required || !tag_is_source) {
      return;
    }
    const selected_tags = tags.filter((_, i) => tag_is_source[i]);
    const required_tags = tags.filter((_, i) => tag_is_required[i]);
    getTracksWithTags(selected_tags, required_tags).then(setSelectedTracks);
  }, [tags, tag_is_required, tag_is_source]);

  if (!tags || !tag_is_required || !tag_is_source) {
    return <></>;
  }

  const buttons = tags.map((tag: Tag, index: number) => {
    return {
      tag: tag,
      button: [
        <>
          <button
            style={{
              color: "green"
            }}
            key={index}
            onClick={() => {
              let next_tag_is_source = [...tag_is_source];
              next_tag_is_source[index] = !next_tag_is_source[index];
              setTagIsSource(next_tag_is_source);
            }}
          >
            {tag.name}
          </button>
          </>
        ,
        <>
        <button
          style={{
            color: "red"
          }}
          key={index}
          onClick={() => {
            let next_tag_is_required = [...tag_is_required];
            next_tag_is_required[index] = !next_tag_is_required[index];
            setTagIsRequired(next_tag_is_required);
          }}
        >
          {tag.name}
        </button>
        </>
      ],
    };
  });
  let selected_buttons = buttons.filter((_, i) => tag_is_source[i]).map((b) => b.button[0]);
  selected_buttons.push(...buttons.filter((_, i) => tag_is_required[i]).map((b) => b.button[1]));
  const unselected_buttons = buttons
    .filter(
      (b, i: number) => !tag_is_source[i] && !tag_is_required[i] && b.tag.name.includes(search_pattern)
    )
    .map((b) => <>{b.button[0]}{b.button[1]}</>);

  let selected_tags_component: JSX.Element;
  if (selected_buttons.length === 0) {
    selected_tags_component = <>No selected tags</>;
  } else if (selected_tracks.length === 0) {
    selected_tags_component = <>No tracks</>;
  } else {
    selected_tags_component = (
      <>
        {selected_tracks.map((t: Track, i: number) => (
          <p key={i}>{t.name}</p>
        ))}
      </>
    );
  }

  return (
    <>
      <p>
        <input
          style={{ fontSize: "20px" }}
          type="text"
          value={playlist_name}
          placeholder="playlist name"
          onChange={(event) => setPlaylistName(event.target.value)}
        />
      </p>
      {selected_tags_component}
      <p>
        <button
          disabled={playlist_name.length === 0}
          onClick={() => {
            createPlaylistWithTracks(playlist_name, selected_tracks).then(
              () => {
                setPlaylistName("");
                alert(`Created playlist: ${playlist_name}`);
              }
            );
          }}
        >
          Create playlist
        </button>
      </p>
      <p>{selected_buttons}</p>
      <p>
        <input
          type="text"
          placeholder="search for tags"
          onChange={(event) => {
            setSearchPattern(event.target.value);
          }}
        />
      </p>
      {unselected_buttons.map((b: JSX.Element, i: number) => (
        <p key={i}>{b}</p>
      ))}
    </>
  );
}
