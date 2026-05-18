export interface Feature {
  title: string;
  symbol: string;
  paras: string[];
  tip: string | null;
}

export const FEATURES: Feature[] = [
  {
    title: "The Spine",
    symbol: "♩",
    paras: [
      `The program begins with a "spine," similar to a warmup. This is a short routine of only the essentials. If you only have 15 minutes to practice on a given day, you can do only this. Put things that you are focusing on, and things that benefit from frequency here (memorization, sight-reading, technique, etc.). Keep it short and under 3-5 exercises.`,
      `You can set spine exercises in the settings menu.`,
    ],
    tip: `If you get sick of an exercise, uncheck the "on" box to remove it from the practice log. You can always add it back in later by re-checking the checkbox.`,
  },
  {
    title: "Focus Areas",
    symbol: "♪",
    paras: [
      `You can set up to 3 focus areas in the settings menu. These are big-picture focus areas that are distinct. On a given day, you can focus your practice to a single big-picture area. Additionally, you can choose from a list of active exercises for each focus. Lastly, if you're too busy to practice on a given day, just set the focus to "Free" and take the day off guilt free.`,
      `Like the spine exercises, you can set exercises for each focus in the settings menu. Keep the number of "active" exercises short (3-5), enough to have fun variety in exercise selection, while making you repeat exercises at enough frequency to let the knowledge stick.`,
    ],
    tip: `This is a great way to have a reserve of exercises. If you are doom-scrolling and come across a cool exercise, just note it down in the settings menu and uncheck the "on" checkbox. Later on, when you want to restructure your routine, you have a reserve of interesting exercises to choose from.`,
  },
  {
    title: "Weekly Logs",
    symbol: "𝄞",
    paras: [
      `The weekly logs are for practice elements that take multiple sessions, such as playing in all 12 keys, navigating every fretboard position, or working on difficult repertoire. At the start of every week, you select your focus for that week. For example, you can set a focus area to be "Key" and then at the start of every week, you can set the key you want to focus on for that week (e.g. E major).`,
      `You can set up to 3 weekly focus areas in the settings menu, and you can set the week's focuses in the "Start week" menu.`,
    ],
    tip: null,
  },
];
