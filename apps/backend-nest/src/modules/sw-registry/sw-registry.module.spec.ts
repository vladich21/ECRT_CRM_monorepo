import assert from 'node:assert/strict';
import test from 'node:test';

import { CommentsService } from '../comments/services/comments.service';
import { DatabaseService } from '../../database/database.service';
import { FilesRemoteClient } from '../files/services/files-remote.client';
import { SvnAttachService } from '../svn/svn-attach.service';
import { SwRegistryModule } from './sw-registry.module';

/**
 * Сборку модуля TypeScript не проверяет: разъехавшиеся провайдеры Nest находит только
 * при старте приложения. Тест смотрит на метаданные модуля — каждая зависимость
 * контроллеров и сервисов реестра либо объявлена провайдером, либо приходит из
 * импортированного модуля.
 */
const providers = Reflect.getMetadata('providers', SwRegistryModule) as (new (...args: never[]) => unknown)[];
const controllers = Reflect.getMetadata('controllers', SwRegistryModule) as (new (...args: never[]) => unknown)[];

/** Приходит из CommentsModule, FilesModule, SvnModule и глобального DatabaseModule. */
const FROM_IMPORTS = new Set<unknown>([DatabaseService, CommentsService, FilesRemoteClient, SvnAttachService]);

function depsOf(target: unknown): unknown[] {
  return (Reflect.getMetadata('design:paramtypes', target as object) as unknown[]) ?? [];
}

test('каждая зависимость контроллеров реестра объявлена провайдером', () => {
  const known = new Set<unknown>([...providers, ...FROM_IMPORTS]);
  for (const controller of controllers) {
    for (const dep of depsOf(controller)) {
      assert.ok(known.has(dep), `${controller.name} требует ${(dep as { name?: string })?.name ?? dep}, которого нет в модуле`);
    }
  }
});

test('каждая зависимость сервисов реестра разрешима внутри модуля', () => {
  const known = new Set<unknown>([...providers, ...FROM_IMPORTS]);
  for (const provider of providers) {
    for (const dep of depsOf(provider)) {
      assert.ok(known.has(dep), `${provider.name} требует ${(dep as { name?: string })?.name ?? dep}, которого нет в модуле`);
    }
  }
});

console.log('sw-registry module wiring tests passed.');
