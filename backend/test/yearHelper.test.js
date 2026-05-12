const { expect } = require('chai');
const { currentYear, nextYear, parseYearParam } = require('../src/utils/yearHelper');

describe('yearHelper', () => {
  it('currentYear returns the current year', () => {
    expect(currentYear()).to.equal(new Date().getFullYear());
  });

  it('nextYear returns current year + 1', () => {
    expect(nextYear()).to.equal(new Date().getFullYear() + 1);
  });

  it('parseYearParam parses valid and invalid inputs', () => {
    expect(parseYearParam('2023')).to.equal(2023);
    expect(parseYearParam('abc')).to.equal(null);
    expect(parseYearParam(null)).to.equal(null);
  });
});