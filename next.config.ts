import type { NextConfig } from "next";

/**
 * Keep Next’s default HTML-limited bots, and add WeChat / WeCom crawlers so
 * OG tags land in the initial <head> (streaming metadata breaks link cards).
 */
const htmlLimitedBots =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|MicroMessenger|WeChat|Weixin|wxwork|WeCom/i;

const nextConfig: NextConfig = {
  // Uses Node.js built-in node:sqlite (no native addon rebuild on NAS).
  htmlLimitedBots,
};

export default nextConfig;
