
import { Db, Collection, FindOneOptions } from 'mongodb';

export interface BaseEntity {
    id: string
}

export interface RepositoryAccessOptions<T extends BaseEntity> {
    /**
     * Entity fields to return
     */
    fields?: (keyof T)[]
}

export interface RepositoryUpdateData<T extends BaseEntity> {
    /**
     * Entity id to updated
     */
    id: string
    /**
     * Entity fields to updated
     */
    set?: Partial<T>
    /**
     * Entity fields to delete
     */
    delete?: (keyof T)[]
}

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

    async update(data: RepositoryUpdateData<T>): Promise<T> {
        data = this.beforeUpdate(data);
        const updateObj: any = {};
        if (data.set) {
            updateObj.$set = data.set;
        }
        if (data.delete) {
            updateObj.$unset = this.fillObjectFields(data.delete as string[], "");
        }

        if (updateObj.$set && Object.keys(updateObj.$set).length === 0) {
            delete updateObj.$set;
        }

        if (updateObj.$unset && Object.keys(updateObj.$unset).length === 0) {
            delete updateObj.$unset;
        }

        await this.collection.updateOne({ _id: data.id }, updateObj, { upsert: false });

        const entity = await this.getById(data.id);

        if (entity) {
            return entity;
        }
        throw new Error(`Not found entity with id=${data.id}`);
    }

    async getById(id: string, options?: RepositoryAccessOptions<T>): Promise<T | null> {
        const mongoOptions: FindOneOptions = {};
        if (options && options.fields && options.fields.length) {
            mongoOptions.projection = this.fillObjectFields(options.fields as string[], 1, true);
        }
        const result = await this.collection.findOne({ _id: id }, mongoOptions);
        if (result) {
            return this.convertFromMongoDoc(result);
        }
        return null;
    }

    async getByIds(ids: string[], options?: RepositoryAccessOptions<T>): Promise<T[]> {
        const mongoOptions: FindOneOptions = {
            limit: ids.length,
        };
        if (options && options.fields && options.fields.length) {
            mongoOptions.projection = this.fillObjectFields(options.fields as string[], 1, true);
        }
        const result = await this.collection.find({ _id: { $in: ids } }, mongoOptions).toArray();

        return result.map(doc => this.convertFromMongoDoc(doc));
    }

    async exists(id: string): Promise<boolean> {
        const result = await this.collection.findOne({ _id: id }, { limit: 1, projection: { _id: 1 } });

        return !!result;
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

    protected beforeUpdate(data: RepositoryUpdateData<T>) {
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

    protected fillObjectFields(fields: string[], value: number | boolean | "", ensureId?: boolean): Object {
        const obj: any = {};
        fields.forEach(field => {
            const prop = field === 'id' ? '_id' : field;
            obj[prop] = value;
        })

        if (ensureId) {
            obj['_id'] = value;
        }

        return obj;
    }
}
