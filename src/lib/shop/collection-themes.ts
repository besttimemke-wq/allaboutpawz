export type CollectionTheme = {
  path: string
  title: string
  description: string
}

export const COLLECTION_THEMES: CollectionTheme[] = [
  { path: "all-about-pawz-picks", title: "All About Pawz Picks", description: "Groomer-approved favorites for everyday care, comfort, and play." },
  { path: "back-to-school", title: "Back to School", description: "Routines and essentials that help pets settle into a new season." },
  { path: "better-for-your-dog", title: "Better for Your Dog", description: "Thoughtful everyday picks made for a happier, healthier dog." },
  { path: "birthday", title: "Birthday", description: "Everything needed to celebrate your pet's big day." },
  { path: "birthday/pet-birthday-cakes-treats", title: "Pet Birthday Cakes & Treats", description: "A celebratory spread for a pet-worthy birthday." },
  { path: "birthday/pet-birthday-hats-outfits", title: "Pet Birthday Hats & Outfits", description: "Party-ready looks for the guest of honor." },
  { path: "birthday/pet-birthday-party-supplies-gifts", title: "Pet Birthday Party Supplies & Gifts", description: "Decor, gifts, and festive essentials for the celebration." },
  { path: "birthday/pet-birthday-toys", title: "Pet Birthday Toys", description: "Playful birthday surprises for every kind of pet." },
  { path: "easter", title: "Easter", description: "Springtime treats, toys, and themed pet essentials." },
  { path: "easter/cat-easter", title: "Cat Easter", description: "A spring collection made especially for cats." },
  { path: "easter/dog-easter", title: "Dog Easter", description: "A spring collection made especially for dogs." },
  { path: "exclusively-by-all-about-pawz", title: "Exclusively by All About Pawz", description: "Signature finds selected for the All About Pawz community." },
  { path: "fall", title: "Fall", description: "Cozy care, seasonal flavors, and autumn-ready essentials." },
  { path: "fall/cozy-beds-furniture-more", title: "Cozy Beds, Furniture & More", description: "Comfort-forward finds for cool-weather lounging." },
  { path: "fall/fall-flavors", title: "Fall Flavors", description: "Seasonal tastes and treats for autumn." },
  { path: "fall/fall-pet-apparel", title: "Fall Pet Apparel", description: "Layered looks and weather-ready pet apparel." },
  { path: "fall/travel-essentials", title: "Fall Travel Essentials", description: "Packable comfort and care for seasonal adventures." },
  { path: "family-game-night", title: "Family Game Night", description: "Enrichment and play picks for time together at home." },
  { path: "fathers-day", title: "Father's Day", description: "Thoughtful gifts for pet dads and their best friends." },
  { path: "fourth-of-july", title: "Fourth of July", description: "Comfort, calming care, and festive essentials for the holiday." },
  { path: "fresh-finds-under-20", title: "Fresh Finds Under $20", description: "New pet finds at an easy everyday price." },
  { path: "get-outside", title: "Get Outside", description: "Gear and care for fresh-air adventures together." },
  { path: "low-prices-everyday-essentials", title: "Low Prices, Everyday Essentials", description: "Reliable daily care at accessible prices." },
  { path: "mothers-day", title: "Mother's Day", description: "Gifts for pet moms and the companions they love." },
  { path: "my-human-favorites", title: "My Human Favorites", description: "Pet-parent-approved picks for life together." },
  { path: "new", title: "New", description: "Fresh arrivals and new discoveries for pets and their people." },
  { path: "new/new-for-cats", title: "New for Cats", description: "New cat essentials, enrichment, and care finds." },
  { path: "new/new-for-dogs", title: "New for Dogs", description: "New dog essentials, enrichment, and care finds." },
  { path: "new/new-for-pet-parents", title: "New for Pet Parents", description: "Fresh finds designed to make pet care easier." },
  { path: "new/new-pet-essentials", title: "New Pet Essentials", description: "A practical starting point for welcoming a new pet." },
  { path: "pride-for-pets", title: "Pride for Pets", description: "Colorful, joyful picks for every pet and family." },
  { path: "spring", title: "Spring", description: "Fresh-season care, play, and outdoor essentials." },
  { path: "st-patricks-day", title: "St. Patrick's Day", description: "A playful themed collection for the holiday." },
  { path: "summer-adventures", title: "Summer Adventures", description: "Warm-weather essentials for every outing." },
  { path: "summer-bbq", title: "Summer BBQ", description: "Backyard-ready comfort, treats, and play." },
  { path: "trending-now", title: "Trending Now", description: "The pet essentials families are loving right now." },
  { path: "valentines-day", title: "Valentine's Day", description: "Sweet gifts, treats, and playful ways to share the love." },
  { path: "winter", title: "Winter", description: "Cold-weather comfort and seasonal care essentials." },
]

export function collectionTheme(path: string): CollectionTheme | undefined {
  return COLLECTION_THEMES.find((theme) => theme.path === path)
}
