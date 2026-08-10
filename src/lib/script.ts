/**
 * Talking points from Call_Script.pdf, kept on-screen during calling mode so
 * the PDF doesn't have to be open in another window.
 */

export const OPENING =
  "Hi, is this the owner or the person who handles the website for {business}?";

export const PITCH = [
  "My name is Wes. I'm a local web developer based here in Rockwall. I build websites specifically for local businesses — I'm not calling to sell advertising or a monthly marketing package.",
  "I build the website for a one-time charge. There's no monthly fee paid to me, and I don't hold your website hostage. Your business owns the domain, hosting account, and full source code.",
  "Do you currently have somebody managing your website, or is that something you've been wanting to improve?",
];

export const THE_LINE =
  "I build it once. You own it. Your domain, your hosting, your source code. No required monthly fee paid to me, and I'm local here in Rockwall.";

export const OBJECTIONS: { objection: string; response: string }[] = [
  {
    objection: "How much does it cost?",
    response:
      "It depends on what you need, but I keep the pricing straightforward. It's a one-time project cost, not a monthly website fee. If you tell me what you need, I can give you a clear price before you commit to anything.",
  },
  {
    objection: "So there really isn't a monthly fee?",
    response:
      "Correct — I don't charge you a required monthly fee. The only ongoing costs are normal third-party expenses such as your domain registration and hosting, and those are set up under your account. You pay those providers directly. I'm not marking them up.",
  },
  {
    objection: "Who owns the website?",
    response:
      "You do. Your business controls the domain and hosting, and I provide you with the source code. You're not renting the website from me.",
  },
  {
    objection: "What if I stop working with you?",
    response:
      "Nothing happens to your website. It's yours. You have the hosting, domain, and source code, so you can keep it running or have another developer work on it whenever you want.",
  },
  {
    objection: "I can build one myself.",
    response:
      "Absolutely, and platforms like that can work. What I'm offering is to handle the build professionally so you don't have to spend your time designing, configuring, and troubleshooting it — while still making sure you own the finished product.",
  },
  {
    objection: "We already have someone.",
    response:
      "No problem. If you're happy with them, I'm not trying to disrupt that. I'm local in Rockwall, so if you ever need another option or want a second opinion on the website, I'd be happy to be a local contact.",
  },
  {
    objection: "Just send me some information.",
    response:
      "Absolutely. What's the best email or number to send it to? I'll keep it short. The main thing to remember is that I build the site for a one-time charge, you own everything, and there's no required monthly website fee from me.",
  },
  {
    objection: "Not interested.",
    response:
      "No problem at all. Before I let you go — is that mainly because you're happy with the website you have, or is a website just not a priority for the business right now?",
  },
];

export const CLOSING =
  "What I'd like to do is take a closer look at the business, put together a simple idea for what I'd recommend, and then show it to you. There's no obligation. If you like the direction and the price makes sense, we can go from there. Would [DAY/TIME] work for a quick call?";

/** Reminder from the last page of the script — easy line to get wrong. */
export const WORDING_WARNING =
  "Avoid saying the website has 'zero ongoing cost.' Domains and hosting normally have recurring third-party costs. Your differentiator is that you don't charge a recurring management fee and the customer keeps ownership.";
