
import { Db, Collection, FindOneOptions } from 'mongodb';
import { MongoUpdateData, MongoFindParams, MongoWhereParams, MongoAccessOptions, BaseEntity, createMongoSortObject, createMongoUnsetObject, createMongoProjectionObject, MongoFindOneParams } from './utils';



export class MongoItem<T extends BaseEntity>{
    protected collection: Collection<T>;

    constructor(private db: Db, private tableName: string) {
        this.collection = db.collection(tableName);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({ _id: id });
        return result.deletedCount === 1;
    }

    async create(data: T): Promise<T> {
        data = this.beforeCreate(data);
        const mongoData = this.convertToMongoDoc(data);
        const result = await this.collection.insertOne(mongoData);
        if (result.insertedCount === 1) {
            return this.convertFromMongoDoc(mongoData);
        }
        throw new Error(`Data not inserted!`);
    }

    async update(data: MongoUpdateData, options?: MongoAccessOptions): Promise<T> {
        data = this.beforeUpdate(data);
        const updateObj: any = {};
        if (data.set && Object.keys(data.set).length) {
            updateObj.$set = data.set;
        }

        if (data.delete && data.delete.length) {
            updateObj.$unset = createMongoUnsetObject(data.delete);
        }

        await this.collection.updateOne({ _id: data.id }, updateObj, { upsert: false });

        const entity = await this.getById(data.id, options);

        if (entity) {
            return entity;
        }
        throw new Error(`Not found entity with id=${data.id}`);
    }

    async getById(id: string, options?: MongoAccessOptions): Promise<T | null> {
        const mongoOptions: FindOneOptions = {};
        if (options && options.fields && options.fields.length) {
            mongoOptions.projection = createMongoProjectionObject(options.fields);
        }
        const result = await this.collection.findOne({ _id: id }, mongoOptions);
        if (result) {
            return this.convertFromMongoDoc(result);
        }
        return null;
    }

    async getByIds(ids: string[], options?: MongoAccessOptions): Promise<T[]> {
        const mongoOptions: FindOneOptions = {
            limit: ids.length,
        };
        if (options && options.fields && options.fields.length) {
            mongoOptions.projection = createMongoProjectionObject(options.fields);
        }
        const result = await this.collection.find({ _id: { $in: ids } }, mongoOptions).toArray();

        return result.map(doc => this.convertFromMongoDoc(doc));
    }

    async exists(id: string): Promise<boolean> {
        const result = await this.collection.findOne({ _id: id }, { limit: 1, projection: { _id: 1 } });

        return !!result;
    }

    async count(params: MongoWhereParams): Promise<number> {
        return await this.collection.count(params);
    }

    async find(params: MongoFindParams): Promise<T[]> {
        const mongoOptions: FindOneOptions = {};

        if (params.fields && params.fields.length) {
            mongoOptions.projection = createMongoProjectionObject(params.fields);
        }
        if (params.limit) {
            mongoOptions.limit = params.limit;
        }

        let cursor = this.collection.find(params.where, mongoOptions)
        if (params.offset) {
            cursor = cursor.skip(params.offset);
        }
        if (params.sort) {
            cursor = cursor.sort(createMongoSortObject(params.sort));
        }

        const result = cursor.toArray()
            .then(items => items && items.map(item => this.convertFromMongoDoc(item)) || []);

        return result;
    }

    async findOne(params: MongoFindOneParams): Promise<T | null> {
        const mongoOptions: FindOneOptions = {};

        if (params.fields && params.fields.length) {
            mongoOptions.projection = createMongoProjectionObject(params.fields);
        }

        const item = this.collection.findOne(params.where, mongoOptions);

        if (item) {
            return this.convertFromMongoDoc(item);
        }
        return null;
    }

    async deleteStorage() {
        await this.collection.drop();
    }

    async createStorage() {
        this.collection = await this.db.collection(this.tableName);
    }

    protected beforeCreate(data: T) {
        return data;
    }

    protected beforeUpdate(data: MongoUpdateData) {
        return data;
    }

    protected convertToMongoDoc(data: T): any {
        const doc = { ...<any>data };
        doc._id = data.id;
        delete doc.id;

        return doc;
    }

    protected convertFromMongoDoc(doc: any): T {
        const data = doc as T;
        data.id = doc._id;
        delete doc._id;

        return data;
    }
}
