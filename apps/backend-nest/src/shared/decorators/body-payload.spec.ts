import assert from 'node:assert/strict';
import test from 'node:test';

import { Body, Controller, Post } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { BodyPayload } from './body-payload.decorator';

/**
 * Декоратор — обёртка над `@Body('body')`, и это должно оставаться правдой:
 * от неё зависит, что до контроллера доедет тело, завёрнутое фронтом в `{ body: ... }`.
 */
@Controller()
class WithBody {
  @Post()
  handle(@Body('body') dto: unknown) {
    return dto;
  }
}

@Controller()
class WithPayload {
  @Post()
  handle(@BodyPayload() dto: unknown) {
    return dto;
  }
}

test('BodyPayload описывает параметр так же, как Body(\'body\')', () => {
  const expected = Reflect.getMetadata(ROUTE_ARGS_METADATA, WithBody, 'handle');
  const actual = Reflect.getMetadata(ROUTE_ARGS_METADATA, WithPayload, 'handle');
  assert.deepEqual(Object.keys(actual), Object.keys(expected));
  const [key] = Object.keys(expected);
  assert.equal(actual[key].index, expected[key].index);
  assert.equal(actual[key].data, expected[key].data);
});

console.log('body-payload tests passed.');
