import { getPinGateShown, setPinGateShown, subscribePinGate } from './pin-gate';

describe('pin gate flag', () => {
  afterEach(() => setPinGateShown(false));

  it('starts hidden', () => {
    expect(getPinGateShown()).toBe(false);
  });

  it('notifies subscribers only when the value really changes', () => {
    const heard: boolean[] = [];
    const off = subscribePinGate(() => heard.push(getPinGateShown()));
    setPinGateShown(true);
    setPinGateShown(true); // same value: silent
    setPinGateShown(false);
    expect(heard).toEqual([true, false]);
    off();
    setPinGateShown(true);
    expect(heard).toEqual([true, false]); // unsubscribed
  });
});
