/**
 * Call script, shown on screen during calling mode.
 *
 * Rewritten from Call_Script.pdf. What changed and why:
 *
 *  - The old opener ("is this the owner or the person who handles the website
 *    for X?") is the exact cadence of a spam call, so it triggered a reflexive
 *    no. "Not interested" was the single biggest loss reason across the first
 *    83 calls (25 of them). This one names the call for what it is instead,
 *    which is unexpected enough to buy a few seconds.
 *
 *  - It leads with a specific observation about *their* business rather than
 *    an explanation of the offer. The ICP here is businesses active on social
 *    with no website, so that observation is always available before dialling.
 *
 *  - Ownership and the one-time fee moved out of the opener and into objection
 *    handling. They answer "why you over another developer", which is a
 *    question nobody has asked in the first twenty seconds.
 *
 *  - Social proof was absent entirely. Three real local clients are worth more
 *    than any feature claim, and Alsteen Handyman is a live site to point at.
 *
 *  - The ask is now a free mock-up delivered by text, not "a quick call" —
 *    a smaller yes, and it uses the channel these prospects already reply on.
 */

export const OPENING = [
  "Hey, is this {contact}?",
  "My name's Wes, I'm calling from Rockwall. I'll be straight with you — this is a cold call, but it's a short one. Can I borrow thirty seconds?",
];

/** Said after they agree to the thirty seconds. Name what you actually saw. */
export const OBSERVATION =
  "So I came across {business} — you've got a solid following on Facebook. Am I right that you don't have an actual website yet?";

/** Their answer matters less than getting them talking. */
export const DISCOVERY = [
  "How are most people finding you right now — mostly Facebook and word of mouth?",
  "And when somebody wants to book you or get a price, how do they usually do that?",
];

/**
 * Only after they've described their own situation. Name real local clients —
 * this is the most persuasive sentence in the call.
 */
export const RELEVANCE =
  "That's why I called. I build websites for local businesses around here — I did Alsteen Handyman over in Forney, and The Greeting Fairy. Both were right where you are: doing fine on Facebook, but nothing to send people to when they wanted to book.";

/** A small, concrete, zero-risk yes. Not "let's schedule a call". */
export const THE_ASK = [
  "I'm not trying to sell you anything today. What I'd like to do is put together a quick mock-up of what yours could look like — free, no obligation — and text you the link.",
  "If you like it, we talk. If not, you've lost nothing and I won't bother you again. Fair enough?",
];

/** Confirm the channel before hanging up, or the mock-up goes nowhere. */
export const CONFIRM =
  "Perfect — is this the best number to text it to? I'll have something over to you in the next couple of days.";

export const THE_LINE =
  "You already have the customers. You just don't have anywhere to send them.";

/** Fifteen seconds. Most people delete anything longer. */
export const VOICEMAIL =
  "Hi, this is Wes from Rockwall — I build websites for local businesses. I saw {business} doesn't have one yet and I put together an idea for what yours could look like. No cost, no obligation. Give me a call back at [YOUR NUMBER] or just text me and I'll send it over.";

/** Sent right after a voicemail. Your notes show texting is what gets replies. */
export const TEXT_FOLLOW_UP =
  "Hi {contact}, this is Wes — the local web guy who just left you a voicemail. I build sites for small businesses around Rockwall/Forney (did Alsteen Handyman and The Greeting Fairy). Happy to mock something up for {business} free so you can see it. Worth a look?";

export const GATEKEEPER =
  "No problem — I'm not selling anything over the phone. I build websites for local businesses and I put together a free mock-up for {business}. Who's the best person to get that in front of?";

export const OBJECTIONS: { objection: string; response: string }[] = [
  {
    objection: "How much does it cost?",
    response:
      "For a local business site like this, most of mine land around $500 to $800 depending on how many pages you need. One-time — not a monthly bill. I'll give you an exact number once I know what you want on it.",
  },
  {
    objection: "Not interested.",
    response:
      "Totally fair. Can I ask one thing before I let you go — is that because a website isn't a priority right now, or because you've been burned by somebody before?",
  },
  {
    objection: "I don't need a website, Facebook works fine.",
    response:
      "Honestly, for a lot of what you do it probably does. The gap I usually see is the person who hears about you from a friend, searches your name, and finds nothing official. That's the customer you never hear about because they never called.",
  },
  {
    objection: "Just send me some information.",
    response:
      "I'll do you one better — let me build the mock-up and text you the link so you're looking at your own site instead of a brochure. What's the best number?",
  },
  {
    objection: "I can build one myself.",
    response:
      "You absolutely can, and some of those builders are fine. The question is whether you want to spend your weekends on it. I'll handle it end to end and you still own everything at the finish.",
  },
  {
    objection: "We already have someone.",
    response:
      "Good — I'm not trying to take that. I'm local here in Rockwall, so if you ever want a second opinion or they get slow to respond, I'm easy to reach.",
  },
  {
    objection: "So there's no monthly fee?",
    response:
      "None to me. You'll pay for your domain and hosting directly — normally around twenty bucks a month total, and those accounts are in your name, not mine. I charge once to build it.",
  },
  {
    objection: "What if I stop working with you?",
    response:
      "Nothing happens. The domain, the hosting, and the source code are all yours. Any other developer can pick it up. You're not renting it from me.",
  },
  {
    objection: "I'm busy right now.",
    response:
      "No problem — I'll keep it to a text. What's the best number, and I'll send the mock-up over when it's ready?",
  },
];

export const WORDING_WARNING =
  "Don't say the website has \"zero ongoing cost.\" Domain and hosting are real recurring third-party costs — roughly $20/month, paid to them, not you. Your differentiator is no recurring fee to you, plus they keep ownership. Overstating it is the fastest way to lose trust on call two.";

/** Shown under the script as a reminder of what the call is actually for. */
export const CALL_GOAL =
  "The goal is not to sell a website. It's to get permission to text them a free mock-up.";
