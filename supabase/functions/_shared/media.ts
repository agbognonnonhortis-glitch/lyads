// Only provider-returned HTTPS media URLs, never Graph API URLs or credentials.
export function mediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      /(^|\.)graph\.facebook\.com$/i.test(u.hostname) ||
      [...u.searchParams.keys()].some((k) =>
        /access_token|appsecret|authorization/i.test(k)
      )
    ) {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}
export type AdMedia = {
  type: "video" | "image";
  url: string | null;
  poster: string | null;
  videoId?: string;
};
export function creativeMedia(c: Record<string, any>): AdMedia[] {
  const poster = mediaUrl(c.thumbnail_url);
  const media: AdMedia[] = [];
  const add = (video: unknown, image: unknown) => {
    if (typeof video === "string" && /^\d+$/.test(video)) {
      if (!media.some((m) => m.videoId === video)) {
        media.push({
          type: "video",
          videoId: video,
          url: null,
          poster: mediaUrl(image) || poster,
        });
      }
    } else {
      const url = mediaUrl(image);
      if (url && !media.some((m) => m.url === url)) {
        media.push({ type: "image", url, poster: null });
      }
    }
  };
  const spec = c.object_story_spec || {};
  const children = spec.link_data?.child_attachments;
  if (Array.isArray(children) && children.length) {
    children.forEach((a) => add(a.video_id, a.picture || a.image_url));
  } else {
    add(
      c.video_id || spec.video_data?.video_id,
      c.image_url || spec.video_data?.image_url || spec.link_data?.picture,
    );
    if (Array.isArray(c.asset_feed_spec?.videos)) {
      c.asset_feed_spec.videos.forEach((a: any) =>
        add(a.video_id, a.thumbnail_url)
      );
    }
    if (
      !media.some((m) => m.type === "video") &&
      Array.isArray(c.asset_feed_spec?.images)
    ) {
      c.asset_feed_spec.images.forEach((a: any) => add(null, a.url));
    }
  }
  if (!media.length && poster) {
    media.push({ type: "image", url: poster, poster: null });
  }
  return media.slice(0, 10);
}
