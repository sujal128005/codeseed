/* =====================================================================
   Code Seed website settings: the only file you need to edit.
   ===================================================================== */
window.CODESEED = {
  // Your YouTube channel ID (starts with "UC", 24 characters).
  // Find it: YouTube Studio → Customization → Basic info → Channel URL.
  channelId: "UCW0oTdAoQXlP4_OLj3aYUMQ",

  handle: "codeseed_dev9",      // YouTube handle, without @
  instagram: "codeseed_dev9",   // Instagram username, without @

  // OPTIONAL: Instagram posts on the site.
  // Create a free feed at https://behold.so (connect Instagram → JSON feed), paste the feed URL here.
  beholdFeedUrl: "",

  // OPTIONAL: only if you do NOT host on GitHub Pages (e.g. Netlify/Vercel without the auto-update job).
  // A YouTube Data API key restricted to your domain lets the browser load videos directly.
  youtubeApiKey: "",

  // Series / playlists shown in the "Series" section. Add one block per series.
  series: [
    {
      title: "Foundations",
      tagline: "How web apps work, before we write any code.",
      thumbnail: "assets/lecture-01.jpg",
      playlistId: "",          // paste the playlist ID (starts with "PL") once it exists
      episodes: [
        { title: "How the Web Works", slides: "slides/lecture-01-how-the-web-works.pdf" },
        { title: "APIs & REST",       slides: "slides/lecture-02-apis-and-rest.pdf" },
        { title: "Databases",         slides: "slides/lecture-03-databases.pdf" }
      ]
    }
  ],

  // Leave false. Set true (or open the site with #demo) to preview the layout with sample content.
  demo: false
};
