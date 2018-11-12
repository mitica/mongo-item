
import test from 'ava';

import {
    createMongoProjectionObject,
    createMongoSortObject,
    createMongoUnsetObject,
} from './utils';




test('createMongoProjectionObject', t => {
    t.deepEqual(createMongoProjectionObject([]), { _id: 1 })
    t.deepEqual(createMongoProjectionObject(['id', 'createdAt']), { _id: 1, createdAt: 1 })
})

test('createMongoSortObject', t => {
    t.deepEqual(createMongoSortObject([]), {})
    t.deepEqual(createMongoSortObject(['id', '_id']), { _id: 1 })
    t.deepEqual(createMongoSortObject(['_id', '-name', '+createdAt']), { _id: 1, name: -1, createdAt: 1 })
})

test('createMongoUnsetObject', t => {
    t.deepEqual(createMongoUnsetObject([]), {})
    t.deepEqual(createMongoUnsetObject(['title']), { title: "" })
})
