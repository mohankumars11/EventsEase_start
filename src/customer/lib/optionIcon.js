/**
 * An icon for any answer a customer can tap — "Dinner out", "Split
 * equally", "Veg", "2 hours", "A house gathering".
 *
 * Mohan, 2026-11-10: "I don't want any of the things to be present in the
 * radio button. I want icon." The options come from four places (the
 * occasion blueprints, the partner app's trade questions, the visual
 * catalogue and the event basics), so the icon is read off the words
 * rather than stored with each option: the first rule whose pattern
 * matches the label wins, and order matters — "non-veg" must be caught
 * before "veg", "no food" before "food".
 *
 *   optionIcon('Split equally')   → Split
 *   optionIcon('Something else')  → Tag (the fallback)
 */
import {
  AlarmClock, Armchair, Baby, Ban, BedDouble, Briefcase, Bus, Cake, Camera, Car, Check, ChefHat, Clapperboard, Clock3, Coffee, CookingPot,
  Crown, Dices, Drumstick, Dumbbell, Egg, Flame, Flower2, Gift, GlassWater, Globe2, GraduationCap, Hand, Heart, HelpCircle, Home, IndianRupee,
  Landmark, Leaf, Lightbulb, MapPin, MessageCircle, Mic2, Moon, Music2, Palette, PartyPopper, PenLine, Plane, Receipt, Salad, Search, ShieldAlert,
  Recycle, ShoppingBag, Split, Sprout, Star, Store, Sun, Sunrise, Sunset, Tag, Tent, Timer, Trees, Trophy, Truck, User, Users, UtensilsCrossed, Video,
  Wallet, Wheat, Wine, X,
} from 'lucide-react'

const RULES = [
  [/\bnon[- ]?veg|meat|chicken|mutton|fish|seafood/, Drumstick],
  [/\bjain|no onion|onion[- ]garlic/, Sprout],
  [/\bvegan\b/, Salad],
  [/\beggless|\begg\b/, Egg],
  [/\bveg(etarian)?\b/, Leaf],
  [/\bboth\b|mixed|veg & non|veg and non/, UtensilsCrossed],
  [/\bno food|not needed|none\b|nothing|no,? thanks|skip/, Ban],
  [/^yes\b/, Check],
  [/^no\b/, X],
  [/not sure|don.?t know|undecided|maybe/, HelpCircle],
  [/allerg|nut\b|nuts\b/, ShieldAlert],
  [/gluten|wheat/, Wheat],
  [/split/, Split],
  [/i.?m paying|i.?ll pay|host pays|on me/, Wallet],
  [/pays? their own|each pays|everyone pays/, Receipt],
  [/budget|₹|rupee|under |above |per person|per head|lakh|\bk\b/, IndianRupee],
  [/caterer|catering|buffet/, ChefHat],
  [/cook|chef|kitchen|homemade/, CookingPot],
  [/we.?ll order|order in|delivery|deliver/, ShoppingBag],
  [/restaurant|dine|dinner|lunch|table/, UtensilsCrossed],
  [/brunch|coffee|breakfast|tea\b|café|cafe/, Coffee],
  [/drink|bar\b|cocktail|mocktail|wine/, Wine],
  [/water|juice|beverage/, GlassWater],
  [/cake|dessert|sweet/, Cake],
  [/house|home|at my place|our place/, Home],
  [/banquet|hall|hotel|resort|palace/, Landmark],
  [/picnic|park|garden|lawn|outdoor|farm|nature/, Trees],
  [/camp|tent/, Tent],
  [/movie|cinema|film|screening|show\b/, Clapperboard],
  [/trip|weekend away|travel|getaway|destination/, Plane],
  [/stay|room|overnight|sleep/, BedDouble],
  [/bus|coach|transport|shuttle|pickup|pick-up/, Bus],
  [/car|cab|taxi|parking|drive/, Car],
  [/truck|move|shift/, Truck],
  [/find one|help me find|search|look for/, Search],
  [/i have a venue|have a venue|booked|already have|got one/, MapPin],
  [/office|corporate|colleague|team|work|business/, Briefcase],
  [/school|college|class|graduat|alumni/, GraduationCap],
  [/kid|child|children|baby|toddler|infant/, Baby],
  [/couple|partner|romantic|love|anniversary|propos/, Heart],
  [/family|relatives|friends|guests|people|everyone|group|community/, Users],
  [/just me|myself|solo|single|one person/, User],
  [/music|dj|band|song|sing|dance/, Music2],
  [/anchor|host\b|mc\b|speech|mic/, Mic2],
  [/game|board|cards|quiz|tambola/, Dices],
  [/sport|active|cricket|football|run|match/, Trophy],
  [/gym|fitness|yoga|workout/, Dumbbell],
  [/catching up|chat|talk|conversation/, MessageCircle],
  [/photo|picture|camera|candid|portrait/, Camera],
  [/video|film|reel|drone|cinematic/, Video],
  [/pooja|puja|priest|ritual|havan|homa|temple|prayer/, Flame],
  [/flower|floral|marigold|garland/, Flower2],
  [/decor|balloon|theme|backdrop|colour|color/, Palette],
  [/light|lamp|diya/, Lightbulb],
  [/gift|return|favour|hamper/, Gift],
  [/surprise|party|celebrat|fun/, PartyPopper],
  [/premium|luxury|grand|royal|vip/, Crown],
  [/simple|basic|small|intimate|minimal/, Star],
  [/sofa|seat|chair|furniture|stage/, Armchair],
  [/clean|tidy|housekeep/, Recycle],
  [/shop|store|stall|market/, Store],
  [/online|virtual|zoom|live ?stream|stream/, Globe2],
  [/morning|sunrise|dawn/, Sunrise],
  [/afternoon|noon|day\b/, Sun],
  [/evening|sunset/, Sunset],
  [/night|late/, Moon],
  [/early/, AlarmClock],
  [/\b\d+\s*(h|hr|hrs|hour|hours)\b|full day|half day|days?\b|duration|long/, Timer],
  [/\b\d{1,2}(:\d\d)?\s*(am|pm)\b|time|o.?clock/, Clock3],
  [/write|type|custom|other|something else|own words/, PenLine],
  [/hand|help|assist|staff|serv/, Hand],
]

export function optionIcon(label) {
  const l = String(label ?? '').toLowerCase()
  for (const [re, icon] of RULES) if (re.test(l)) return icon
  return Tag
}

/* The tile tints a set of options cycles through, so a grid of six reads
   as six things rather than one thing six times. [ground, ink]. */
export const TILE_TINTS = [
  ['#FFF1E2', '#C2410C'], ['#FDECF4', '#BE185D'], ['#E9F8EF', '#0B7A45'],
  ['#EAF1FF', '#1D4ED8'], ['#FFF7D6', '#A16207'], ['#F1EAFF', '#6D28D9'],
]
