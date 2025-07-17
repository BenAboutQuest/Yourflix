// Genre and subgenre definitions for the movie collection app

export const MAIN_GENRES = [
  'Action',
  'Adult',
  'Adventure', 
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Documentary',
  'Faith Films',
  'Family',
  'Fantasy',
  'Historical',
  'Horror',
  'Musical',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western'
];

export const SUB_GENRES: Record<string, string[]> = {
  'Action': [
    'Superhero',
    'Martial Arts',
    'Spy / Espionage',
    'Disaster',
    'Revenge',
    'Heist'
  ],
  'Adventure': [
    'Swashbuckler',
    'Treasure Hunt',
    'Survival',
    'Post-apocalyptic'
  ],
  'Comedy': [
    'Slapstick',
    'Satire / Parody',
    'Romantic Comedy (Rom-Com)',
    'Black Comedy',
    'Coming-of-Age',
    'Dramedy'
  ],
  'Drama': [
    'Courtroom',
    'Political',
    'Medical',
    'Biographical (Biopic)',
    'Melodrama',
    'Social Issues'
  ],
  'Horror': [
    'Slasher',
    'Psychological Horror',
    'Supernatural',
    'Found Footage',
    'Monster',
    'Gothic Horror',
    'Body Horror'
  ],
  'Science Fiction': [
    'Cyberpunk',
    'Dystopian',
    'Space Opera',
    'Time Travel',
    'Alien Invasion',
    'Tech Thriller'
  ],
  'Romance': [
    'Historical Romance',
    'Teen Romance',
    'Tragic Romance',
    'Love Triangle',
    'Erotic Romance'
  ],
  'Thriller': [
    'Noir',
    'Detective',
    'Political Thriller',
    'Conspiracy',
    'Psychological Thriller',
    'Legal Thriller'
  ],
  'Mystery': [
    'Noir',
    'Detective',
    'Conspiracy',
    'Psychological Thriller',
    'Legal Thriller'
  ],
  'Family': [
    'Fairy Tale',
    'Educational',
    'Talking Animals',
    'Holiday'
  ],
  'Animation': [
    'Fairy Tale',
    'Educational',
    'Talking Animals',
    'Holiday',
    'Stop-Motion',
    '2D / Hand-Drawn',
    '3D / CGI'
  ],
  'Faith Films': [
    'Biblical',
    'Christian',
    'Inspirational',
    'Religious Drama',
    'Spiritual Journey'
  ]
};

export const ADDITIONAL_TAGS = [
  'Cult Classic',
  'Arthouse',
  'Experimental',
  'B-Movie',
  'Grindhouse',
  'Made-for-TV',
  'Direct-to-Video',
  'Remake',
  'Silent Film',
  'Black & White',
  'Foreign Language',
  'Based on a True Story',
  'Award-Winning',
  'Criterion Collection'
];

export function getSubGenresForGenre(genre: string): string[] {
  return SUB_GENRES[genre] || [];
}

export function getAllSubGenres(): string[] {
  return Object.values(SUB_GENRES).flat();
}