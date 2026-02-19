// Each song has a `safe` array of seek timestamps (in seconds) that
// target verse, intro, or bridge sections where the song title is
// NOT being sung. The game picks one at random before playing.

const SONGS = [
  // ═══════════════════════════════════════════
  // BLACKPINK (Group)
  // ═══════════════════════════════════════════

  // SQUARE ONE (2016)
  { id: "3yHQKddM8SVCRnuPSo3HPN", title: "BOOMBAYAH", artist: "BLACKPINK", member: "group",
    safe: [13, 22, 70] }, // rap verses before chorus
  { id: "7HWmJ1wBecOAMNGjC6SmKE", title: "WHISTLE", artist: "BLACKPINK", member: "group",
    safe: [32, 42, 108] }, // verse sections, bridge

  // SQUARE TWO (2016)
  { id: "5ANbXf5qR48a4jfFnSq80w", title: "PLAYING WITH FIRE", artist: "BLACKPINK", member: "group",
    safe: [14, 28, 80] }, // verse 1, pre-chorus, verse 2
  { id: "5LBxMvApPk3HdsQdi6DT9L", title: "STAY", artist: "BLACKPINK", member: "group",
    safe: [8, 18, 68] }, // intro instrumental, verse

  // Single (2017)
  { id: "4ZxOuNHhpyOj4gv52MtQpT", title: "As If It's Your Last", artist: "BLACKPINK", member: "group",
    safe: [12, 24, 78] }, // verse 1

  // SQUARE UP (2018)
  { id: "7b8YOVV5quZcSKEijDgyWB", title: "DDU-DU DDU-DU", artist: "BLACKPINK", member: "group",
    safe: [15, 27, 82] }, // rap verse, verse 2
  { id: "2naEVOadudtXHwtZNfjMDM", title: "Forever Young", artist: "BLACKPINK", member: "group",
    safe: [10, 22, 75] }, // verse 1
  { id: "2r5oD7twaQTsv5KoRS6v16", title: "Really", artist: "BLACKPINK", member: "group",
    safe: [10, 25, 70] }, // verse 1
  { id: "3AyLh4R4D3fQfyqCsTdFf3", title: "See U Later", artist: "BLACKPINK", member: "group",
    safe: [12, 28, 80] }, // verse 1

  // Kill This Love EP (2019)
  { id: "0M98PvIvx7vZ8LDpzMw1hB", title: "Kill This Love", artist: "BLACKPINK", member: "group",
    safe: [18, 30, 85] }, // verse (after brass intro)
  { id: "7ibZWzytUh41z5ycK2I5N8", title: "Don't Know What To Do", artist: "BLACKPINK", member: "group",
    safe: [10, 22, 75] }, // verse 1
  { id: "6MN6oiT2d7qxYEOwXwgV34", title: "Kick It", artist: "BLACKPINK", member: "group",
    safe: [10, 24, 68] }, // verse 1
  { id: "6euC2yxyQA6uztolUYnhiW", title: "Hope Not", artist: "BLACKPINK", member: "group",
    safe: [8, 20, 65] }, // verse (ballad, title in chorus)

  // THE ALBUM (2020)
  { id: "4SFknyjLcyTLJFPKD2m96o", title: "How You Like That", artist: "BLACKPINK", member: "group",
    safe: [16, 28, 85] }, // verse, rap section
  { id: "4JUPEh2DVSXFGExu4Uxevz", title: "Ice Cream", artist: "BLACKPINK ft. Selena Gomez", member: "group",
    safe: [18, 30, 78] }, // verse
  { id: "1XnpzbOGptRwfJhZgLbmSr", title: "Pretty Savage", artist: "BLACKPINK", member: "group",
    safe: [12, 26, 80] }, // verse 1
  { id: "7iAgNZdotu40NwtoIWJHFe", title: "Bet You Wanna", artist: "BLACKPINK ft. Cardi B", member: "group",
    safe: [14, 28, 72] }, // verse
  { id: "4Ws314Ylb27BVsvlZOy30C", title: "Lovesick Girls", artist: "BLACKPINK", member: "group",
    safe: [15, 30, 90] }, // verse 1, verse 2
  { id: "7qq0EOPW4RRlqdvMBmdd73", title: "Crazy Over You", artist: "BLACKPINK", member: "group",
    safe: [8, 20, 65] }, // verse
  { id: "7iKDsPfLT0d5mu2htfMKBZ", title: "Love To Hate Me", artist: "BLACKPINK", member: "group",
    safe: [12, 26, 72] }, // verse 1
  { id: "39kzWAiVPpycdMpr745oPj", title: "You Never Know", artist: "BLACKPINK", member: "group",
    safe: [10, 24, 70] }, // verse 1

  // Single (2022)
  { id: "1Wwh6gmMeolwzbRzfZMY5b", title: "Ready For Love", artist: "BLACKPINK", member: "group",
    safe: [12, 24, 68] }, // verse 1

  // BORN PINK (2022)
  { id: "6stcJnJHPO8RrYx5LLz5OP", title: "Pink Venom", artist: "BLACKPINK", member: "group",
    safe: [20, 34, 90] }, // verse/rap (after "blackpink" intro)
  { id: "0ARKW62l9uWIDYMZTUmJHF", title: "Shut Down", artist: "BLACKPINK", member: "group",
    safe: [15, 30, 82] }, // verse (after violin intro)
  { id: "0L8LOav65XwLjCLS11gNPD", title: "Typa Girl", artist: "BLACKPINK", member: "group",
    safe: [12, 26, 75] }, // verse
  { id: "5TfKoQg9AjmDIWYKFoDqMN", title: "Yeah Yeah Yeah", artist: "BLACKPINK", member: "group",
    safe: [15, 28, 72] }, // verse
  { id: "3MJhPqL2IgGs7gHEB2M35q", title: "Hard to Love", artist: "BLACKPINK", member: "group",
    safe: [10, 22, 70] }, // verse
  { id: "1XoY4WZrvPIphBaikXGjF8", title: "The Happiest Girl", artist: "BLACKPINK", member: "group",
    safe: [8, 20, 60] }, // verse (ballad)
  { id: "0bYVPJvXr8ACmw313cVvhB", title: "Tally", artist: "BLACKPINK", member: "group",
    safe: [10, 24, 68] }, // verse

  // ═══════════════════════════════════════════
  // JENNIE (Solo)
  // ═══════════════════════════════════════════

  { id: "2wVDWtLKXunswWecARNILj", title: "SOLO", artist: "Jennie", member: "jennie",
    safe: [16, 28, 85] }, // verse (avoids "solo" hook)
  { id: "6gcuJpHu0Ey30D5WR76y98", title: "You & Me", artist: "Jennie", member: "jennie",
    safe: [10, 22, 65] },

  // RUBY (2025)
  { id: "2CspwnypzT7rcWI9RfsoSb", title: "Mantra", artist: "Jennie", member: "jennie",
    safe: [14, 26, 70] },
  { id: "2chbuybiy6aDDBC985tJcP", title: "ZEN", artist: "Jennie", member: "jennie",
    safe: [10, 22, 65] },
  { id: "3gJAFFELdZyIM8tiwLAikg", title: "Handlebars", artist: "Jennie ft. Dua Lipa", member: "jennie",
    safe: [12, 24, 68] },
  { id: "0fK7ie6XwGxQTIkpFoWkd1", title: "like JENNIE", artist: "Jennie", member: "jennie",
    safe: [10, 22, 60] },
  { id: "6SaSFVlIQC1L6Fh1QKLeFi", title: "start a war", artist: "Jennie", member: "jennie",
    safe: [10, 24, 65] },
  { id: "7rzzByujLJIBXpyOCnJhfx", title: "with the IE (way up)", artist: "Jennie", member: "jennie",
    safe: [12, 22, 60] },
  { id: "7AKwWqnoMmvCqBQtcdIECG", title: "ExtraL", artist: "Jennie ft. Doechii", member: "jennie",
    safe: [10, 24, 68] },
  { id: "0rx7xu0RmZLpJjKNVZjSVv", title: "Love Hangover", artist: "Jennie ft. Dominic Fike", member: "jennie",
    safe: [10, 22, 65] },
  { id: "6HjYE79OOCGEhkIRfXLqrz", title: "Damn Right", artist: "Jennie ft. Childish Gambino & Kali Uchis", member: "jennie",
    safe: [12, 26, 70] },
  { id: "1iRIdATb1I276VdKK7JVAB", title: "F.T.S.", artist: "Jennie", member: "jennie",
    safe: [10, 22, 60] },
  { id: "6ZTBPObroUwS2p3LDpmq1F", title: "Filter", artist: "Jennie", member: "jennie",
    safe: [10, 24, 65] },
  { id: "3pY2M4k9BSk7ulLBSV0tcX", title: "Seoul City", artist: "Jennie", member: "jennie",
    safe: [8, 20, 60] },
  { id: "0rNCeIkEvz61X0oP48z6cC", title: "Starlight", artist: "Jennie", member: "jennie",
    safe: [10, 22, 60] },
  { id: "5DIZg9QqSdzgHmkZ2k2F1a", title: "twin", artist: "Jennie", member: "jennie",
    safe: [10, 22, 58] },

  // ═══════════════════════════════════════════
  // LISA (Solo)
  // ═══════════════════════════════════════════

  { id: "7uQZVznj0uQOGC9KhV2Mg6", title: "LALISA", artist: "Lisa", member: "lisa",
    safe: [20, 35, 88] }, // verse (avoids "lalisa" chant)
  { id: "7hU3IHwjX150XLoTVmjD0q", title: "MONEY", artist: "Lisa", member: "lisa",
    safe: [22, 38, 92] }, // deep verse sections (title is everywhere)

  // Alter Ego (2025)
  { id: "6vvPecFTmWxDfEJ6cYT1wa", title: "Rockstar", artist: "Lisa", member: "lisa",
    safe: [14, 28, 75] },
  { id: "7ov3TDp5D00Rnu5R1viX4w", title: "New Woman", artist: "Lisa ft. Rosalía", member: "lisa",
    safe: [12, 26, 72] },
  { id: "3yDRcs0Y4pPzkvMbUfeF9H", title: "Moonlit Floor", artist: "Lisa", member: "lisa",
    safe: [10, 22, 65] },
  { id: "4JxY3pNkxMKHjrPiOGQqcQ", title: "When I'm With You", artist: "Lisa ft. Tyla", member: "lisa",
    safe: [10, 24, 68] },
  { id: "4CPuDVC8jhhK6lA2DIt8Cf", title: "Born Again", artist: "Lisa ft. Doja Cat & RAYE", member: "lisa",
    safe: [12, 26, 70] },
  { id: "5hv6DLR5Vr5dVk4ahNBoDU", title: "Elastigirl", artist: "Lisa", member: "lisa",
    safe: [10, 24, 65] },
  { id: "4d3buGFeBDfll8IpoMRCQn", title: "Thunder", artist: "Lisa", member: "lisa",
    safe: [10, 22, 62] },
  { id: "4rBRRLgdB9DYJhqA9uVcWt", title: "FXCK UP THE WORLD", artist: "Lisa ft. Future", member: "lisa",
    safe: [14, 28, 72] },
  { id: "03qZDQKRYZdjhKsQ5G5H0t", title: "Rapunzel", artist: "Lisa ft. Megan Thee Stallion", member: "lisa",
    safe: [12, 26, 68] },
  { id: "5TXztZ5uNjv2XtUupk3i7w", title: "BADGRRRL", artist: "Lisa", member: "lisa",
    safe: [10, 24, 65] },
  { id: "2DMC4phhdMN0sHg1F0A4qD", title: "Lifestyle", artist: "Lisa", member: "lisa",
    safe: [10, 22, 65] },
  { id: "1QIUF20HdqMA0CJvkBOHNb", title: "Chill", artist: "Lisa", member: "lisa",
    safe: [8, 20, 60] },
  { id: "7KHgcZusKvEM9JunrRFSAN", title: "Dream", artist: "Lisa", member: "lisa",
    safe: [8, 20, 58] },

  // ═══════════════════════════════════════════
  // ROSÉ (Solo)
  // ═══════════════════════════════════════════

  // -R- EP (2021)
  { id: "2pn8dNVSpYnAtlKFC8Q0DJ", title: "On The Ground", artist: "Rosé", member: "rose",
    safe: [14, 28, 80] }, // verse
  { id: "2dHoVW9AxJVSRebPRyV2aA", title: "Gone", artist: "Rosé", member: "rose",
    safe: [12, 24, 70] }, // verse

  // rosie (2025)
  { id: "5vNRhkKd0yEAg8suGBpjeY", title: "APT.", artist: "Rosé ft. Bruno Mars", member: "rose",
    safe: [18, 32, 78] }, // verse (avoids "apateu" chant)
  { id: "02CrqOYzrJR8fYOffhvRZZ", title: "number one girl", artist: "Rosé", member: "rose",
    safe: [10, 22, 65] },
  { id: "1z5ebC9238uGoBgzYyvGpQ", title: "toxic till the end", artist: "Rosé", member: "rose",
    safe: [10, 24, 68] },
  { id: "3fpWkbEZMP1BgOOfymwoaS", title: "drinks or coffee", artist: "Rosé", member: "rose",
    safe: [8, 20, 60] },
  { id: "0kLzF2Cl3zvFOyzgE86ssW", title: "too bad for us", artist: "Rosé", member: "rose",
    safe: [10, 22, 62] },
  { id: "5OdI6v2L7Aez4cclpbojiZ", title: "stay a little longer", artist: "Rosé", member: "rose",
    safe: [10, 24, 65] },
  { id: "67siqMtQTGPpJZI4Dz8OpM", title: "not the same", artist: "Rosé", member: "rose",
    safe: [8, 20, 60] },
  { id: "3y4q6bBdbXsTIaPiwiiUfy", title: "3am", artist: "Rosé", member: "rose",
    safe: [8, 18, 55] },
  { id: "50aQbgfdydBXABx2gATQHn", title: "dance all night", artist: "Rosé", member: "rose",
    safe: [10, 22, 62] },
  { id: "77n3jFGqPPxYrEGwrWylNv", title: "gameboy", artist: "Rosé", member: "rose",
    safe: [10, 22, 60] },
  { id: "4HxGH28DitgAuuKpEVrLzN", title: "two years", artist: "Rosé", member: "rose",
    safe: [8, 20, 58] },
  { id: "51RVssSB8iuq9llBacPbER", title: "call it the end", artist: "Rosé", member: "rose",
    safe: [8, 20, 60] },

  // ═══════════════════════════════════════════
  // JISOO (Solo)
  // ═══════════════════════════════════════════

  // ME (2023)
  { id: "69CrOS7vEHIrhC2ILyEi0s", title: "FLOWER", artist: "Jisoo", member: "jisoo",
    safe: [16, 30, 80] }, // verse (avoids "flower" chorus)
  { id: "7e4OpsQwklauQSXlBvM5WD", title: "All Eyes On Me", artist: "Jisoo", member: "jisoo",
    safe: [12, 24, 70] },

  // AMORTAGE (2025)
  { id: "10zywlg5b0gQOC3q1A7ADx", title: "earthquake", artist: "Jisoo", member: "jisoo",
    safe: [10, 22, 65] },
  { id: "6TPpCbn9z0IY5Te048iy5R", title: "Your Love", artist: "Jisoo", member: "jisoo",
    safe: [10, 22, 60] },
  { id: "08fvSPSKjoF4vmoEtcGain", title: "TEARS", artist: "Jisoo", member: "jisoo",
    safe: [8, 20, 58] },
  { id: "4tDRFi7B03oY6bnZoFBM6G", title: "Hugs & Kisses", artist: "Jisoo", member: "jisoo",
    safe: [10, 22, 60] },
];
