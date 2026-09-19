/**
 * JSON-LD.
 *
 * One <script type="application/ld+json"> per page holding an @graph, so
 * nodes can reference each other by @id instead of every page repeating the
 * whole organisation. Organization and WebSite are defined once on the home
 * page; everywhere else refers to them.
 *
 * WHAT IS NOT HERE, AND WHY
 *
 * · No aggregateRating, no review, no ratingValue, no reviewCount. Sambramo
 *   is pre-launch and has no customers. EventFooter.jsx:27-33 says it in the
 *   product's own words: "An invented review is the fastest possible way to
 *   lose the trust this whole block is trying to earn." Fabricated review
 *   markup is also a Google structured-data manual action and, under the
 *   ASCI code and the Consumer Protection Act 2019, a misleading claim.
 *   check-jsonld.mjs fails the build if any of those keys ever appears.
 *
 * · No PostalAddress. src/config/legal.js has registeredAddress: null. A
 *   business address invented to satisfy a schema validator is the fastest
 *   route to a suspended Google Business Profile. address() below returns
 *   undefined until legal.json carries a real one, and then starts emitting
 *   it with no other change.
 *
 * · No WebSite.potentialAction / SearchAction. There is no /search endpoint.
 *   Declaring an action the site cannot perform is a false statement in
 *   structured data, and Google retired the sitelinks searchbox in 2024, so
 *   the upside is zero anyway.
 *
 * · No Offer or AggregateOffer on service pages. eventServicesData.js calls
 *   its own priceMin/priceMax "researched India market-rate ESTIMATES —
 *   review and adjust before treating them as final customer-facing prices".
 *   They are shown on the page, captioned as indicative. Putting them in
 *   schema would turn an internal estimate into a machine-readable price
 *   claim. The tier coordinationFee figures are structural product facts,
 *   not estimates, so those DO get a PriceSpecification.
 */
import { ORIGIN, abs, U } from './urls.mjs'

const ID = {
  org:  `${ORIGIN}/#organization`,
  site: `${ORIGIN}/#website`,
  logo: `${ORIGIN}/#logo`,
}

const AREA = { '@type': 'City', name: 'Bengaluru', containedInPlace: { '@type': 'State', name: 'Karnataka' } }

/** Emitted only once legal.json has a registered address. See the header. */
function address(legal) {
  const a = legal?.entity?.registeredAddress
  if (!a) return undefined
  return typeof a === 'string'
    ? { '@type': 'PostalAddress', streetAddress: a, addressLocality: 'Bengaluru', addressRegion: 'Karnataka', addressCountry: 'IN' }
    : { '@type': 'PostalAddress', addressCountry: 'IN', ...a }
}

export function organization(brand, legal) {
  return {
    '@type': 'Organization',
    '@id': ID.org,
    name: brand.name,
    alternateName: 'Sambramo Celebrations',
    url: abs(U.home),
    logo: { '@type': 'ImageObject', '@id': ID.logo, url: abs('/og/logo-512.png'), width: 512, height: 512, caption: brand.name },
    image: { '@id': ID.logo },
    slogan: brand.tagline,
    description: brand.descriptor,
    email: brand.email,
    telephone: brand.supportPhone,
    areaServed: AREA,
    knowsLanguage: ['en-IN', 'kn-IN', 'hi-IN'],
    foundingLocation: AREA,
    address: address(legal),
    legalName: legal?.entity?.legalName || undefined,
    vatID: legal?.entity?.gstin || undefined,
    // sameAs is omitted entirely rather than emitted empty. A profile is
    // added here the day it exists and not before — a dead link in sameAs
    // is worse for entity resolution than no link.
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer support', telephone: brand.supportPhone, email: brand.emailSupport, areaServed: 'IN', availableLanguage: ['English', 'Kannada', 'Hindi'] },
      { '@type': 'ContactPoint', contactType: 'sales', email: brand.email, areaServed: 'IN' },
    ],
  }
}

export const webSite = brand => ({
  '@type': 'WebSite',
  '@id': ID.site,
  url: abs(U.home),
  name: brand.name,
  description: brand.descriptor,
  publisher: { '@id': ID.org },
  inLanguage: 'en-IN',
})

export const webPage = ({ url, title, description, lastmod, type = 'WebPage', image }) => ({
  '@type': type,
  '@id': `${abs(url)}#webpage`,
  url: abs(url),
  name: title,
  description,
  isPartOf: { '@id': ID.site },
  about: { '@id': ID.org },
  breadcrumb: { '@id': `${abs(url)}#breadcrumb` },
  primaryImageOfPage: image ? { '@type': 'ImageObject', url: abs(image) } : undefined,
  dateModified: lastmod || undefined,
  inLanguage: 'en-IN',
})

export const breadcrumbList = (url, trail) => ({
  '@type': 'BreadcrumbList',
  '@id': `${abs(url)}#breadcrumb`,
  itemListElement: trail.map((t, i) => ({
    '@type': 'ListItem', position: i + 1, name: t.name,
    item: t.url ? abs(t.url) : undefined,
  })),
})

export const itemList = (url, items) => ({
  '@type': 'ItemList',
  '@id': `${abs(url)}#list`,
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, url: abs(it.url), name: it.name,
  })),
})

export const faqPage = (url, qs) => ({
  '@type': 'FAQPage',
  '@id': `${abs(url)}#faq`,
  mainEntity: qs.map(q => ({
    '@type': 'Question',
    name: q.q,
    acceptedAnswer: { '@type': 'Answer', text: q.a },
  })),
})

export const service = ({ url, name, description, serviceType, offers }) => ({
  '@type': 'Service',
  '@id': `${abs(url)}#service`,
  name,
  description,
  serviceType: serviceType || name,
  provider: { '@id': ID.org },
  areaServed: AREA,
  availableChannel: {
    '@type': 'ServiceChannel',
    serviceUrl: abs(url),
    servicePhone: undefined,
    availableLanguage: ['English', 'Kannada', 'Hindi'],
  },
  hasOfferCatalog: offers,
})

/**
 * The tier ladder as an OfferCatalog.
 *
 * coordinationFee is what Sambramo charges to run a celebration of that
 * size. It is a product fact, set in celebrationTiers.js, not a market
 * estimate — so unlike the service price bands it is safe to publish as a
 * machine-readable price.
 */
export const tierCatalog = (tiers, occasionName) => ({
  '@type': 'OfferCatalog',
  name: occasionName ? `${occasionName} — celebration sizes` : 'Celebration sizes',
  itemListElement: tiers.map(t => ({
    '@type': 'Offer',
    name: t.name,
    description: t.tagline,
    url: abs(U.size(t.slug)),
    priceSpecification: {
      '@type': 'PriceSpecification',
      price: t.coordinationFee,
      priceCurrency: 'INR',
      valueAddedTaxIncluded: false,
      description: 'Coordination fee. Vendor costs are quoted separately and itemised before you approve anything.',
    },
    eligibleQuantity: {
      '@type': 'QuantitativeValue', unitText: 'guests',
      minValue: t.guests?.min, maxValue: t.guests?.max,
    },
  })),
})

export const professionalService = (brand, city, legal) => ({
  '@type': 'ProfessionalService',
  '@id': `${abs(U.city(city.slug))}#business`,
  name: `${brand.name} — ${city.name}`,
  description: `${brand.name} arranges complete celebrations in ${city.name}: one coordinator sources every vendor, negotiates, and brings back one itemised price.`,
  url: abs(U.city(city.slug)),
  parentOrganization: { '@id': ID.org },
  telephone: brand.supportPhone,
  email: brand.email,
  image: { '@id': ID.logo },
  address: address(legal),
  areaServed: AREA,
  geo: city.coords ? { '@type': 'GeoCoordinates', latitude: city.coords.lat, longitude: city.coords.lon } : undefined,
  serviceArea: city.coords
    ? { '@type': 'GeoCircle', geoMidpoint: { '@type': 'GeoCoordinates', latitude: city.coords.lat, longitude: city.coords.lon }, geoRadius: 30000 }
    : undefined,
  priceRange: '₹₹',
  currenciesAccepted: 'INR',
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '09:00', closes: '20:00',
  }],
  knowsLanguage: ['en-IN', 'kn-IN', 'hi-IN'],
})

export const howTo = (url, name, description, steps) => ({
  '@type': 'HowTo',
  '@id': `${abs(url)}#howto`,
  name, description,
  totalTime: 'P14D',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: 0 },
  step: steps.map((s, i) => ({
    '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body,
  })),
})

export const article = ({ url, name, description, lastmod }) => ({
  '@type': 'Article',
  '@id': `${abs(url)}#article`,
  headline: name,
  description,
  author: { '@id': ID.org },
  publisher: { '@id': ID.org },
  dateModified: lastmod || undefined,
  mainEntityOfPage: { '@id': `${abs(url)}#webpage` },
  inLanguage: 'en-IN',
})

export const contactPage = (url, brand) => ({
  '@type': 'ContactPage',
  '@id': `${abs(url)}#contactpage`,
  url: abs(url),
  mainEntity: { '@id': ID.org },
  name: `Contact ${brand.name}`,
})

export const graph = nodes => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) })
export { ID as SCHEMA_ID }
