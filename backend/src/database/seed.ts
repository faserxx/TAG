/**
 * Seed data for demo adventure
 */

export interface SeedData {
  adventure: {
    id: string;
    name: string;
    description: string;
    start_location_id: string;
  };
  locations: Array<{
    id: string;
    adventure_id: string;
    name: string;
    description: string;
  }>;
  exits: Array<{
    from_location_id: string;
    to_location_id: string;
    direction: string;
  }>;
  characters: Array<{
    id: string;
    location_id: string;
    name: string;
    dialogue: string[];
    isAiPowered?: boolean;
    personality?: string;
    aiConfig?: {
      temperature?: number;
      maxTokens?: number;
    };
  }>;
}

export const DEMO_ADVENTURE: SeedData = {
  adventure: {
    id: 'demo-adventure',
    name: 'The Lost Temple',
    description: 'A mysterious ancient temple awaits exploration',
    start_location_id: 'entrance'
  },
  locations: [
    {
      id: 'entrance',
      adventure_id: 'demo-adventure',
      name: 'Temple Entrance',
      description: 'You stand before an ancient temple, its weathered stone columns rising majestically into the sky. Intricate carvings of forgotten deities adorn the archway, their faces worn smooth by centuries of wind and rain. A dark passage leads north into the temple\'s heart, while to the east, you glimpse a verdant garden through an ornate archway. The air here feels heavy with history and untold secrets.'
    },
    {
      id: 'hall',
      adventure_id: 'demo-adventure',
      name: 'Great Hall',
      description: 'A vast hall stretches before you, its vaulted ceiling disappearing into shadows above. Shafts of golden light pierce through high stained-glass windows, illuminating ancient murals that cover every wall. The paintings depict elaborate rituals, celestial alignments, and robed figures performing mysterious ceremonies. The stone floor is polished smooth by countless footsteps. A passage leads south back to the entrance, while a narrow staircase descends into darkness to the west.'
    },
    {
      id: 'garden',
      adventure_id: 'demo-adventure',
      name: 'Temple Garden',
      description: 'You find yourself in a tranquil sanctuary, a hidden oasis within the temple grounds. Exotic flowers bloom in vibrant colors you\'ve never seen before, their sweet fragrance filling the air. A crystal-clear fountain bubbles at the garden\'s center, its water sparkling in the dappled sunlight. Stone benches carved with intricate patterns offer peaceful resting spots. Butterflies dance between the blossoms, and you can hear the distant sound of wind chimes. The temple entrance lies to the west.'
    },
    {
      id: 'crypt',
      adventure_id: 'demo-adventure',
      name: 'Ancient Crypt',
      description: 'The temperature drops as you descend into this underground chamber. Cold stone walls press in around you, their surfaces damp with condensation. Torches mounted in iron sconces cast flickering shadows that seem to dance with a life of their own. Stone sarcophagi line both walls, each carved with the likeness of its occupant - priests, warriors, and nobles of a bygone era. The air is thick with the scent of earth and age. Ancient inscriptions cover the walls, their meaning lost to time. Stone stairs lead up to the great hall above.'
    },
    {
      id: 'sanctum',
      adventure_id: 'demo-adventure',
      name: 'Inner Sanctum',
      description: 'You enter the temple\'s most sacred chamber, a place of profound stillness and ancient power. The circular room is bathed in ethereal light filtering through a crystalline dome above. At the center stands a raised dais surrounded by seven pillars, each inscribed with glowing runes that pulse with a gentle rhythm. The walls are lined with shelves containing countless scrolls and tomes, their pages yellowed with age but perfectly preserved. The air itself seems to hum with latent energy, and you feel the weight of millennia of accumulated wisdom pressing upon your consciousness. A narrow passage leads back north to the great hall.'
    }
  ],
  exits: [
    { from_location_id: 'entrance', to_location_id: 'hall', direction: 'north' },
    { from_location_id: 'entrance', to_location_id: 'garden', direction: 'east' },
    { from_location_id: 'hall', to_location_id: 'entrance', direction: 'south' },
    { from_location_id: 'hall', to_location_id: 'crypt', direction: 'west' },
    { from_location_id: 'hall', to_location_id: 'sanctum', direction: 'north' },
    { from_location_id: 'garden', to_location_id: 'entrance', direction: 'west' },
    { from_location_id: 'crypt', to_location_id: 'hall', direction: 'east' },
    { from_location_id: 'sanctum', to_location_id: 'hall', direction: 'south' }
  ],
  characters: [
    {
      id: 'guard',
      location_id: 'entrance',
      name: 'Temple Guard',
      dialogue: [
        'Welcome, traveler. I am sworn to protect this sacred place and guide those who seek knowledge.',
        'The temple has stood for over a thousand years. Many come seeking answers, but few find what they truly need.',
        'Be careful as you explore. Not all who enter these halls return unchanged. The temple has a way of revealing truths we may not wish to see.',
        'The ancient ones who built this place understood secrets of the universe that we have long forgotten. Perhaps you will rediscover some of their wisdom.'
      ]
    },
    {
      id: 'scholar',
      location_id: 'hall',
      name: 'Scholar',
      dialogue: [
        'Ah, another curious soul! Welcome to the Great Hall. I am studying these magnificent murals - they tell the story of the temple\'s founding.',
        'These paintings are not mere decoration. They form a celestial map, showing the alignment of stars on the night the temple was consecrated.',
        'I\'ve been here for three years now, and each day I discover something new. Just yesterday, I found a hidden symbol that suggests there may be more chambers yet undiscovered.',
        'The crypt below holds the remains of the temple\'s founders. If you venture down, approach with respect. Some say their spirits still watch over this place.'
      ]
    },
    {
      id: 'gardener',
      location_id: 'garden',
      name: 'Gardener',
      dialogue: [
        'Peace be with you, friend. I tend these gardens as my ancestors did before me. Each plant here has been cultivated for generations.',
        'These flowers are not native to this land. The temple founders brought seeds from distant shores, places that may no longer exist.',
        'The fountain\'s water comes from a spring deep beneath the temple. It is said to have healing properties, though I cannot say if that is truth or legend.',
        'Sometimes, when the moon is full, the flowers glow with a soft light. It is the most beautiful sight you could imagine. Perhaps you will be fortunate enough to witness it.'
      ]
    },
    {
      id: 'ancient-sage',
      location_id: 'sanctum',
      name: 'Ancient Sage',
      dialogue: [],
      isAiPowered: true,
      personality: 'You are the Ancient Sage, a mystical guardian of the Lost Temple who has watched over its secrets for centuries. You possess deep knowledge of the temple\'s history and the ancient civilization that built it. You speak with wisdom and gravitas, often referencing celestial alignments and forgotten rituals. While helpful to seekers of knowledge, you understand some truths must be discovered rather than told. You occasionally speak in riddles.',
      aiConfig: {
        temperature: 0.8,
        maxTokens: 150
      }
    }
  ]
};
