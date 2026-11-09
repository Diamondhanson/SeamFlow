import {
  hasShopBasics,
  missingShopVitals,
  nextShopStepHref,
  shopSetup,
  type ShopLike,
} from './shop-setup';

const full: ShopLike = {
  specialties: ['Kaftan'],
  city: 'Douala',
  photoUrl: 'https://x/y.png',
};

describe('shopSetup', () => {
  it('is unknown while the profile is still loading, not "none"', () => {
    expect(shopSetup(undefined)).toBe('unknown');
  });

  it('is none for a loaded profile with no shop', () => {
    expect(shopSetup(null)).toBe('none');
    expect(shopSetup({ tailor: null })).toBe('none');
    expect(shopSetup({})).toBe('none');
  });

  it('is incomplete for a bare shop — a name and a country is not a set-up shop', () => {
    expect(shopSetup({ tailor: {} })).toBe('incomplete');
    expect(shopSetup({ tailor: { specialties: [], city: null, photoUrl: null } })).toBe('incomplete');
  });

  it('is complete once specialties, city and photo are all present', () => {
    expect(shopSetup({ tailor: full })).toBe('complete');
  });

  it('does not depend on having any clients, orders or templates', () => {
    // The checklist is about running the business; it is not in this function's inputs.
    expect(shopSetup({ tailor: full })).toBe('complete');
  });
});

describe('missingShopVitals', () => {
  it('lists each gap, in the order they are asked for', () => {
    expect(missingShopVitals({})).toEqual(['specialties', 'city', 'photo']);
    expect(missingShopVitals({ specialties: ['x'] })).toEqual(['city', 'photo']);
    expect(missingShopVitals({ specialties: ['x'], city: 'Douala' })).toEqual(['photo']);
    expect(missingShopVitals(full)).toEqual([]);
  });

  it('treats whitespace-only text as missing', () => {
    expect(missingShopVitals({ ...full, city: '   ' })).toEqual(['city']);
  });

  it('accepts a free-text location as the city, and either photo field as the photo', () => {
    expect(missingShopVitals({ specialties: ['x'], location: 'Akwa, Douala', avatarPath: 'a/b.png' })).toEqual([]);
  });

  it('treats a missing shop as missing everything', () => {
    expect(missingShopVitals(null)).toEqual(['specialties', 'city', 'photo']);
  });
});

describe('nextShopStepHref', () => {
  it('opens the screen for the first missing vital', () => {
    expect(nextShopStepHref({})).toBe('/(app)/specialties');
    expect(nextShopStepHref({ specialties: ['x'] })).toBe('/(app)/feed/storefront'); // city
    expect(nextShopStepHref({ specialties: ['x'], city: 'Douala' })).toBe('/(app)/me'); // photo
  });
});

describe('hasShopBasics', () => {
  it('is false when there is no shop — they skipped the form', () => {
    expect(hasShopBasics(null)).toBe(false);
    expect(hasShopBasics(undefined)).toBe(false);
  });

  it('is false for a shop with a name but no location', () => {
    expect(hasShopBasics({})).toBe(false);
    expect(hasShopBasics({ location: '   ', city: '' })).toBe(false);
  });

  it('is true once a location or a city is filled in', () => {
    expect(hasShopBasics({ location: 'Akwa, Douala' })).toBe(true);
    expect(hasShopBasics({ city: 'Douala' })).toBe(true);
  });

  it('does not need specialties or a photo — those are other steps', () => {
    expect(hasShopBasics({ location: 'Douala', specialties: [], photoUrl: null })).toBe(true);
  });
});
