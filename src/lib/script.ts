/**
 * Call script, shown on screen during calling mode.
 *
 * These are lines to speak from, not a monologue to recite. If it sounds like
 * you're reading, it's worse than saying it badly in your own words.
 *
 * The guiding rule: no technique. Openers that announce themselves — "can I
 * borrow thirty seconds", "I'll be honest, this is a cold call", "how are you
 * today" — all read as sales moves, because they are. What actually earns the
 * next sentence is being specific about *their* business immediately, which
 * proves the call isn't a mass dial. That's the only credibility available in
 * the first ten seconds, and every lead in this pipeline qualified because it
 * has no website, so the specific detail is always in hand before dialling.
 */

export const OPENING = [
  "Hi, is this {contact}?",
  "Hey {contact} — my name's Wes, I'm a web developer here in Rockwall. I came across {business} and noticed you don't have a website up. Is that something you've thought about?",
];

/**
 * Their first reaction, and where to go with it. Real branches, because the
 * second sentence is where most cold calls actually fall apart.
 */
export const BRANCHES: { they: string; you: string }[] = [
  {
    they: "Yeah, we've been meaning to",
    you: "That's usually how it goes — it's nobody's first priority. What's held it up so far, time or cost?",
  },
  {
    they: "Who is this? / What's this about?",
    you: "Wes Harris — I build websites for small businesses around Rockwall and Forney. That's the whole reason I'm calling.",
  },
  {
    they: "We use Facebook",
    you: "A lot of folks do, and it works. Does anyone ever tell you they had trouble finding your prices or booking you?",
  },
  {
    they: "We're not interested",
    you: "Fair enough. Mind if I ask — is it that you don't want one, or just not right now?",
  },
  {
    they: "We're busy / bad time",
    you: "No problem. Is there a better time, or do you want me to just text you instead?",
  },
];

/** Ask, then stop talking. Their answer is what you sell against later. */
export const DISCOVERY = [
  "How do most people find you right now?",
  "And when somebody wants a price, how do they get hold of you?",
];

/**
 * Drop in naturally once they've described their situation. Real local names
 * do more than any claim about your process.
 */
export const CREDIBILITY =
  "I've done a handful around here — Alsteen Handyman over in Forney, The Greeting Fairy. Both were in the same spot, everything running through Facebook.";

/** Small, concrete, and it costs them nothing to say yes to. */
export const THE_ASK = [
  "Here's what I'd do. Let me put something together so you can actually see what yours would look like — no charge, no strings.",
  "If you like it, we talk. If not, that's the end of it. Can I text it to this number?",
];

export const THE_LINE =
  "You already have the customers. There's just nowhere to send them.";

/** Short. Give a reason to call back, don't pitch into the machine. */
export const VOICEMAIL =
  "Hey, this is Wes Harris — I'm a web developer here in Rockwall. I was looking at {business} and noticed you don't have a website. If that's something you've been thinking about, give me a call back at [YOUR NUMBER]. Thanks.";

/** Send right after the voicemail — your notes show texts get the replies. */
export const TEXT_FOLLOW_UP =
  "Hi {contact}, Wes Harris here — just left you a voicemail. I build websites for small businesses around Rockwall and Forney (did Alsteen Handyman and The Greeting Fairy). Noticed {business} doesn't have one. Happy to put a free mockup together so you can see it — want me to?";

export const GATEKEEPER =
  "No worries — I'm not selling anything over the phone. I build websites for local businesses and I wanted to show {business} what one would look like. Who handles that?";

export const OBJECTIONS: { objection: string; response: string }[] = [
  {
    objection: "How much?",
    response:
      "Most of the ones I do run $500 to $800 depending on how many pages. One time, not monthly. I'd give you an exact number once I know what you want on it.",
  },
  {
    objection: "We don't need one, Facebook works fine.",
    response:
      "For a lot of what you do it probably does. The one that costs you is the person who hears your name from a friend, looks you up, finds nothing, and calls somebody else. You never hear about that one.",
  },
  {
    objection: "Just email me something.",
    response:
      "I can, but honestly a brochure won't tell you much. Let me build the mockup instead so you're looking at your own site. What's the best number for it?",
  },
  {
    objection: "I can build it myself.",
    response:
      "You could, and some of those builders are decent. It's really whether you want to spend your weekends on it. I'd handle the whole thing and you'd still own everything at the end.",
  },
  {
    objection: "We already have a guy.",
    response:
      "Good — not trying to step on that. I'm local, so if he ever gets slow to answer, I'm easy to find.",
  },
  {
    objection: "Is there a monthly fee?",
    response:
      "Not to me. You'd pay for the domain and hosting directly, around twenty bucks a month, and those accounts go in your name. I charge once to build it.",
  },
  {
    objection: "What if you disappear?",
    response:
      "Everything's yours — domain, hosting, the code. Any developer can pick it up. You're not renting it from me.",
  },
  {
    objection: "Send me your website.",
    response:
      "harriswebworks.dev. Take a look at alsteenhandyman.com too — that's one of mine, and it's probably closer to what yours would be.",
  },
];

export const WORDING_WARNING =
  "Never say it has \"no ongoing cost.\" Domain and hosting are real recurring costs — about $20/month, paid to those providers, not to you. What's true is that there's no recurring fee to you and they own everything. Overstate it now and you lose the deal on call two.";

export const CALL_GOAL =
  "You're not selling a website on this call. You're getting permission to text them a mockup.";
