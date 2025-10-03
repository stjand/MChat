const ANIMALS = [
  'Tiger', 'Wolf', 'Eagle', 'Panther', 'Lion', 'Bear', 'Fox', 'Hawk',
  'Dragon', 'Phoenix', 'Raven', 'Falcon', 'Cheetah', 'Jaguar', 'Puma',
  'Cobra', 'Viper', 'Shark', 'Orca', 'Dolphin', 'Owl', 'Lynx'
];

const COLORS = [
  'Red', 'Blue', 'Green', 'Gold', 'Silver', 'Black', 'White', 'Purple',
  'Orange', 'Pink', 'Cyan', 'Magenta', 'Crimson', 'Azure', 'Emerald',
  'Amber', 'Violet', 'Scarlet', 'Turquoise', 'Jade'
];

export function generateAnonymousUsername(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const number = Math.floor(Math.random() * 900) + 100;

  return `${color}${animal}${number}`;
}

export function getRandomIcebreaker(): string {
  const icebreakers = [
    "If you could have dinner with any fictional character, who would it be?",
    "What's the most embarrassing thing that happened to you in class?",
    "If you could instantly master any skill, what would it be?",
    "What's your most unpopular opinion about campus life?",
    "If you could swap lives with anyone for a day, who would it be?",
    "What's the weirdest dream you've ever had?",
    "If you had to eat one food for the rest of your life, what would it be?",
    "What's your biggest college regret so far?",
    "If you could time travel, past or future?",
    "What's a secret talent nobody knows about?",
    "Most overrated thing about college?",
    "If you could read minds for a day, whose mind would you read?",
    "What would you do with a million dollars right now?",
    "Biggest plot twist in your life so far?",
    "If you could have any superpower, but only for 24 hours, what would it be?"
  ];

  return icebreakers[Math.floor(Math.random() * icebreakers.length)];
}