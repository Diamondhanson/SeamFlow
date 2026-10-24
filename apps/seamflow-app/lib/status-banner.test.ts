describe('status banner', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  function loadFor(os: 'ios' | 'android') {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./status-banner') as typeof import('./status-banner');
  }

  it('owns the top inset on iOS', () => {
    expect(loadFor('ios').BANNER_OWNS_TOP_INSET).toBe(true);
  });

  it('does nothing on Android — its banner layout is left exactly as it was', () => {
    // The whole point of gating: Android already looked right, so neither the
    // banner nor any <Screen> may change there.
    expect(loadFor('android').BANNER_OWNS_TOP_INSET).toBe(false);
  });

  it('notifies subscribers only when visibility actually changes', () => {
    const m = loadFor('ios');
    const heard: boolean[] = [];
    const off = m.subscribeStatusBanner(() => heard.push(m.getStatusBannerVisible()));

    m.setStatusBannerVisible(true);
    m.setStatusBannerVisible(true); // same value: no notification
    m.setStatusBannerVisible(false);
    expect(heard).toEqual([true, false]);

    off();
    m.setStatusBannerVisible(true);
    expect(heard).toEqual([true, false]); // unsubscribed: silent
  });
});
