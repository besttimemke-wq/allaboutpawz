// ---------------------------------------------------------------------------
// Category hero imagery — static merchandising assets (the 10 dog studio
// portraits shipped as shop hero assets). Presentation-layer mapping from
// customer-facing category slug to the hero image; categories, counts and
// filters still come entirely from SQL.
// ---------------------------------------------------------------------------

const HEROES: Record<string, { src: string; alt: string }> = {
  dog: {
    src: "/Shop/heroes/German_Shepherd_studio_portrait_202609050636.jpeg",
    alt: "German Shepherd studio portrait",
  },
  grooming: {
    src: "/Shop/heroes/Groomed_poodle_portrait_headshot_202609050636.jpeg",
    alt: "Freshly groomed poodle portrait",
  },
  "beds-furniture": {
    src: "/Shop/heroes/Siberian_Husky_studio_portrait_202609050636.jpeg",
    alt: "Siberian Husky studio portrait",
  },
  treats: {
    src: "/Shop/heroes/Beagle_portrait_studio_shot_202609050636.jpeg",
    alt: "Beagle studio portrait",
  },
  "apparel-accessories": {
    src: "/Shop/heroes/Cocker_Spaniel_portrait_studio_202609050636.jpeg",
    alt: "Cocker Spaniel studio portrait",
  },
  "chew-toys": {
    src: "/Shop/heroes/Border_Collie_studio_portrait_202609050636.jpeg",
    alt: "Border Collie studio portrait",
  },
  "collars-harnesses-leashes": {
    src: "/Shop/heroes/Pomeranian_dog_portrait_202609050636.jpeg",
    alt: "Pomeranian dog portrait",
  },
  travel: {
    src: "/Shop/heroes/French_Bulldog_posing_in_studio_202609050636.jpeg",
    alt: "French Bulldog posing in studio",
  },
  wellness: {
    src: "/Shop/heroes/Groomed_Shih_Tzu_portrait_202609050636.jpeg",
    alt: "Groomed Shih Tzu portrait",
  },
  "feeding-watering": {
    src: "/Shop/heroes/image.png_202609050636.jpeg",
    alt: "Happy dog portrait",
  },
  "new-arrivals": {
    src: "/Shop/heroes/Beagle_portrait_studio_shot_202609050636.jpeg",
    alt: "Beagle studio portrait",
  },
  sale: {
    src: "/Shop/heroes/Pomeranian_dog_portrait_202609050636.jpeg",
    alt: "Pomeranian dog portrait",
  },
}

export function categoryHero(key: string): { src: string; alt: string } | null {
  return HEROES[key] || null
}
