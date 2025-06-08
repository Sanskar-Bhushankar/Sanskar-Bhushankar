const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");

(async () => {
  try {
    const client = new TwitterApi({
      appKey: process.env.CONSUMER_KEY,
      appSecret: process.env.CONSUMER_SECRET,
      accessToken: process.env.ACCESS_TOKEN,
      accessSecret: process.env.ACCESS_TOKEN_SECRET,
    });

    const twitterHandle = "sanskar2804";

    const { data: user } = await client.v2.userByUsername(twitterHandle);
    if (!user) {
      console.error("Twitter user not found.");
      process.exit(1);
    }

    const timeline = await client.v2.userTimeline(user.id, {
      max_results: 5,
      exclude: ["replies", "retweets"],
      expansions: ["attachments.media_keys"],
      "tweet.fields": ["created_at", "text", "entities", "attachments"],
      "media.fields": ["url", "preview_image_url", "type"],
    });

    if (!timeline.data || timeline.data.length === 0) {
      console.log("No tweets found or unable to fetch latest tweet.");
      process.exit(0);
    }

    const latestTweet = timeline.data[0];
    let tweetText = latestTweet.text;

    if (latestTweet.entities?.urls) {
      for (const url of latestTweet.entities.urls) {
        tweetText = tweetText.replace(url.url, `[${url.display_url || url.url}](${url.expanded_url})`);
      }
    }

    const tweetUrl = `https://twitter.com/${twitterHandle}/status/${latestTweet.id}`;

    let mediaContent = "";
    if (timeline.includes?.media?.length) {
      const media = timeline.includes.media[0];
      if (media.type === "photo" && media.url) {
        mediaContent = `\n\n![Tweet Image](${media.url})`;
      } else if ((media.type === "video" || media.type === "animated_gif") && media.preview_image_url) {
        mediaContent = `\n\n[![Video Preview](${media.preview_image_url})](${tweetUrl})`;
      }
    }

    const formattedTweet = `🐦 Latest Tweet:\n\n> ${tweetText}\n\n[View on Twitter](${tweetUrl})${mediaContent}`;

    const readmePath = "README.md";
    let readmeContent = fs.readFileSync(readmePath, "utf8");
    const startMarker = "<!-- LATEST_TWEET_START -->";
    const endMarker = "<!-- LATEST_TWEET_END -->";

    if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
      const before = readmeContent.slice(0, readmeContent.indexOf(startMarker) + startMarker.length);
      const after = readmeContent.slice(readmeContent.indexOf(endMarker));
      readmeContent = `${before}\n${formattedTweet}\n${after}`;
      fs.writeFileSync(readmePath, readmeContent, "utf8");
      console.log("README.md updated with latest tweet.");
    } else {
      console.warn(`Markers ${startMarker} and ${endMarker} not found in README.md`);
    }
  } catch (error) {
    console.error("Error fetching or updating tweet:", error);
    process.exit(1);
  }
})();
