export type BotId = 'pyra' | 'cubo' | 'pera' | 'mochi' | 'pip' | 'sprout';

export type Bot = {
  id: BotId;
  name: string;
  vibe: string;
  /** One concrete sentence on how this bot coaches you, shown on the pick screen. */
  role: string;
  /** gradient stops: highlight, mid, shadow */
  light: string;
  mid: string;
  dark: string;
  greeting: string;
};

/** S-Bank green (#00A843) with a lighter highlight and darker shade for the 3D look. */
const GREEN = { light: '#9BEBB9', mid: '#00A843', dark: '#006F2A' };

export const ALL_BOTS: Record<BotId, Bot> = {
  pyra: { id: 'pyra', name: 'Pyra', vibe: 'Sharp thinker', role: 'Finds your money leaks and tells you straight where to cut.', ...GREEN, greeting: 'Sharp on numbers, soft on you.' },
  cubo: { id: 'cubo', name: 'Cubo', vibe: 'Loves order', role: 'Keeps your bills on track so payday never surprises you.', ...GREEN, greeting: 'Let’s put your money in boxes.' },
  pera: { id: 'pera', name: 'Pera', vibe: 'Warm and cosy', role: 'Nudges you to save a little more each week, gently.', ...GREEN, greeting: 'Ripe for some savings?' },
  mochi: { id: 'mochi', name: 'Mochi', vibe: 'Gentle and calm', role: 'Celebrates small wins and never judges a splurge.', ...GREEN, greeting: 'Small steps, soft landings.' },
  pip: { id: 'pip', name: 'Pip', vibe: 'Number cruncher', role: 'Answers every question with exact numbers.', ...GREEN, greeting: 'Beep. I already counted your coffees.' },
  sprout: { id: 'sprout', name: 'Sprout', vibe: 'Patient grower', role: 'Helps you grow a safety buffer, week by week.', ...GREEN, greeting: 'Let’s grow that buffer together.' },
};

/** The three bots the user can choose from. Swap ids here to change the lineup. */
export const PICKABLE: BotId[] = ['pyra', 'cubo', 'pera'];
