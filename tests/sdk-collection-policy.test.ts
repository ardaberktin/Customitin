import { expect, it } from 'vitest';
import {
  createCollectionDescriptor,
  createProfile,
  validateProfile,
} from '@customitin/core';
import { collectionGroups } from '@customitin/react/collection';
import {
  collectionCard,
  collectionSource,
  collectionData,
  collectionRegistry,
  collectionProfile,
  sdkCollection,
} from './helpers/sdk-collection';

it('derives control choices from approved source operations and refuses partial sources or incompatible cards', () => {
  expect(sdkCollection.props.groupBy?.values).toEqual(['', 'stage']);
  expect(sdkCollection.props.filterBy?.values).not.toContain('score');
  expect(sdkCollection.props.sortBy?.values).not.toContain('id');
  expect(
    createCollectionDescriptor(collectionCard, {
      ...collectionSource,
      supportsGrouping: false,
    }).props.groupBy?.values,
  ).toEqual(['']);
  expect(() =>
    createCollectionDescriptor(collectionCard, {
      ...collectionSource,
      supportsCount: false,
    }),
  ).toThrow('count permission');
  expect(() =>
    createCollectionDescriptor(
      { ...collectionCard, sourceIds: ['other'] },
      collectionSource,
    ),
  ).toThrow('does not allow');
  expect(() =>
    createCollectionDescriptor(collectionCard, {
      ...collectionSource,
      completeness: 'partial',
    }),
  ).toThrow('complete');
  expect(() =>
    createCollectionDescriptor(
      { ...collectionCard, dataInputs: {} },
      collectionSource,
    ),
  ).toThrow('one record');
  expect(() =>
    createCollectionDescriptor(collectionCard, {
      ...collectionSource,
      fields: {
        ...collectionSource.fields,
        score: { ...collectionSource.fields.score!, type: 'string' },
      },
    }),
  ).toThrow('incompatible');
  const invalid = structuredClone(collectionRegistry);
  invalid.components[1]!.props.sortBy!.values!.push('id');
  expect(() => createProfile(invalid, 'alice')).toThrow(
    'Invalid SDK collection contract',
  );
});
it('rejects unauthorized cards/fields and transformations that could bypass collection field permissions', () => {
  expect(() =>
    validateProfile(collectionProfile(), collectionRegistry),
  ).not.toThrow();
  const denied = structuredClone(collectionRegistry);
  denied.surfaces[0]!.allowedComponentIds = ['card.collection'];
  expect(() => validateProfile(collectionProfile(), denied)).toThrow(
    'card must also be approved',
  );
  const privateField = structuredClone(collectionRegistry);
  privateField.surfaces[0]!.policy.sourceFields.entries = [
    'id',
    'title',
    'stage',
  ];
  expect(() => validateProfile(collectionProfile(), privateField)).toThrow();
  const remapped = collectionProfile();
  remapped.surfaces.workspace![0]!.data!.items!.mapping.title = 'id';
  expect(() => validateProfile(remapped, collectionRegistry)).toThrow(
    'identity',
  );
  const remote = collectionProfile();
  remote.dataViews![0]!.plan.execution = 'remote';
  expect(() => validateProfile(remote, collectionRegistry)).toThrow(
    'flat complete',
  );
  const computed = collectionProfile();
  computed.dataViews![0]!.plan.computed.extra = { literal: 'Override' };
  expect(() => validateProfile(computed, collectionRegistry)).toThrow(
    'flat complete',
  );
  const disallowedSort = collectionProfile();
  disallowedSort.surfaces.workspace![0]!.props.sortBy = 'id';
  expect(() => validateProfile(disallowedSort, collectionRegistry)).toThrow();
});
it('groups dynamically in declared enum order, sorts numerically with null last, and preserves keys without mutating data', () => {
  const original = structuredClone(collectionData);
  const result = collectionGroups(collectionData, sdkCollection, {
    groupBy: 'stage',
    filterBy: 'stage',
    selected: '',
    sortBy: 'score',
    direction: 'desc',
  });
  expect(result.groups.map((g) => g.label)).toEqual(['Draft', 'Ready']);
  expect(result.groups[1]!.entries.map((e) => e.key)).toEqual(['c', 'b']);
  expect(result.totalCount).toBe(3);
  expect(collectionData).toEqual(original);
  expect(() =>
    collectionGroups({ ...collectionData, complete: false }, sdkCollection, {
      groupBy: '',
      filterBy: '',
      selected: '',
      sortBy: '',
      direction: 'asc',
    }),
  ).toThrow('complete');
});
