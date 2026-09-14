import { test } from "node:test";
import assert from "node:assert/strict";
import { creativeMedia, mediaUrl } from "../supabase/functions/_shared/media";
test("Media URLs never include Graph API calls or credentials", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://media.example/v.mp4",
    "https://graph.facebook.com/123",
    "https://x.example/?access_token=secret",
    "https://u:p@x.example/video",
  ])
    assert.equal(mediaUrl(value), null);
  assert.equal(
    mediaUrl("https://video.xx.fbcdn.net/v.mp4?oe=123"),
    "https://video.xx.fbcdn.net/v.mp4?oe=123",
  );
});
test("Videos stay videos without a source; dynamic and carousel assets preserve identity", () => {
  const poster = "https://x.fbcdn.net/poster.jpg";
  assert.deepEqual(creativeMedia({ video_id: "123", thumbnail_url: poster }), [
    { type: "video", videoId: "123", url: null, poster },
  ]);
  const dynamic = creativeMedia({
    video_id: "123",
    thumbnail_url: poster,
    asset_feed_spec: { videos: [{ video_id: "123" }, { video_id: "456" }] },
  });
  assert.equal(dynamic.length, 2);
  assert.equal(dynamic[1].videoId, "456");
  const carousel = creativeMedia({
    object_story_spec: {
      link_data: {
        child_attachments: [
          { picture: poster },
          { video_id: "789", picture: poster },
        ],
      },
    },
  });
  assert.deepEqual(
    carousel.map((m) => m.type),
    ["image", "video"],
  );
});
