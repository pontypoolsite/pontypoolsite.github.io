export type Product = { id: string; name: string; slug: string; category: string; subcategory: string; price: number; salePrice?: number; finishes: string[]; description: string; specs: { dimensions: string; wattage: string; bulbBase: string; voltage: string; material: string }; images: string[]; isNew: boolean; isBestSeller: boolean };

const seeds: [string, string, number, string, string][] = [
  ["Aurelia Five-Light Chandelier", "Chandeliers", 689, "Sculptural arms in warm brushed brass with opal glass shades.", "Brushed brass"],
  ["Luna Opal Pendant", "Pendants", 189, "A softly luminous globe for quiet, considered interiors.", "Brass"],
  ["Sonder Linear Pendant", "Pendants", 429, "A slender silhouette made for long dining tables.", "Black"],
  ["Marlow Mini Pendant", "Pendants", 129, "Small in scale, generous in atmosphere.", "Chrome"],
  ["Hollis Wall Bracket", "Wall Brackets", 149, "A refined reading light with a tailored linen shade.", "Brass"],
  ["Forma Picture Light", "Wall Brackets", 119, "Bring a gallery-like glow to favourite artwork.", "Gold"],
  ["Arc Semi-Flush Ceiling Light", "Ceiling Lights", 249, "A graceful low-profile centrepiece for intimate rooms.", "White"],
  ["Halo Flush Mount", "Ceiling Lights", 179, "A timeless opal shade for hallways and bedrooms.", "Chrome"],
  ["Cove Table Lamp", "Lamps", 219, "A calm, tactile accent for a bedside or console.", "Black"],
  ["Rowan Floor Lamp", "Lamps", 359, "Directed light meets sculptural simplicity.", "Brass"],
  ["Studio Task Desk Lamp", "Lamps", 159, "Thoughtful task lighting for focused work.", "White"],
  ["Edison Amber LED Bulb", "Light Bulbs", 18, "Vintage character with efficient warm LED light.", "Gold"],
  ["Squirrel Cage Filament Bulb", "Light Bulbs", 22, "An exposed filament made to be admired.", "Gold"],
  ["Warm Glow Smart Bulb", "Light Bulbs", 29, "Dial in the perfect mood from your phone.", "White"],
  ["Noma Outdoor Wall Light", "Outdoor", 199, "Weather-ready architectural light for the entrance.", "Black"],
  ["Harbour Lantern", "Outdoor", 239, "A welcoming pool of light for evenings outside.", "Black"],
  ["Etta Three-Light Pendant", "Pendants", 379, "A trio of gentle opal globes with brass detailing.", "Brass"],
  ["Clara Glass Chandelier", "Chandeliers", 849, "Airy hand-finished glass in a modern heirloom form.", "Gold"],
  ["Piper Ceramic Table Lamp", "Lamps", 189, "Hand-finished ceramic lends a grounded warmth.", "White"],
  ["Vale Double Wall Light", "Wall Brackets", 229, "Twin opal shades cast an even, welcoming glow.", "Black"],
  ["Aster Recessed Downlight", "Ceiling Lights", 49, "Discreet architectural lighting with a warm beam.", "White"],
  ["Foundry Track Spotlight", "Ceiling Lights", 89, "Flexible accent lighting in a quietly industrial finish.", "Black"],
  ["Mila Outdoor Bollard", "Outdoor", 179, "A considered path light with a soft downward glow.", "Black"],
  ["Globe Decorative LED", "Light Bulbs", 24, "A generous globe bulb that makes a feature of the fitting.", "Gold"],
];

export const products: Product[] = seeds.map(([name, category, price, description, finish], index) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { id: `ponty-${index + 1}`, name, slug, category, subcategory: category === "Pendants" ? "Pendants" : category, price, ...(index % 7 === 3 ? { salePrice: Math.round(price * 0.85) } : {}), finishes: [finish, "Black", "White"].filter((value, i, all) => all.indexOf(value) === i), description, specs: { dimensions: index % 2 ? "Ø 28 × H 32 cm" : "W 42 × H 38 cm", wattage: index % 3 ? "1 × 8W LED" : "3 × 6W LED", bulbBase: index % 2 ? "E27" : "G9", voltage: "220–240V", material: index % 2 ? "Opal glass & brass" : "Powder-coated steel" }, images: [`/images/products/${slug}.jpg`, `/images/products/${slug}-detail.jpg`], isNew: index < 6, isBestSeller: index % 3 === 0 };
});

export const categories = ["Chandeliers", "Pendants", "Wall Brackets", "Light Bulbs", "Lamps", "Outdoor"];
export const categoryImages: Record<string, string> = { Chandeliers: "photo-1543198126-a8ad8e47fb22", Pendants: "photo-1513506003901-1e6a229e2d15", "Wall Brackets": "photo-1507473885765-e6ed057f782c", "Light Bulbs": "photo-1507473885765-e6ed057f782c", Lamps: "photo-1507473885765-e6ed057f782c", Outdoor: "photo-1518005020951-eccb494ad742" };
