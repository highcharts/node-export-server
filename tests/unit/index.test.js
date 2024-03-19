'use strict';
import assert from 'assert';
import { expect } from 'chai';

describe('Array', function () {
  it('Empty array should be empty', function () {
    const arr = [];
    expect(arr).to.be.empty;
  });
});
