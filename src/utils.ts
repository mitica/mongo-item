
export interface BaseEntity {
    id: string
}

export interface MongoAccessOptions {
    /**
     * Entity fields to return
     */
    fields?: string[]
}

export interface MongoUpdateData {
    /**
     * Entity id to updated
     */
    id: string
    /**
     * Entity fields to updated
     */
    set?: { [key: string]: any }
    /**
     * Entity fields to delete
     */
    delete?: string[]
}

export type MongoWhereParams = { [index: string]: any }

export type MongoFindOneParams = {
    where: MongoWhereParams
    fields?: string[]
}

export type MongoFindParams = {
    where: MongoWhereParams
    fields?: string[]
    offset?: number
    limit?: number
    sort?: string[]
}

export function createMongoSortObject(fields: string[]) {
    const obj: { [index: string]: any } = {};
    fields.forEach(field => {
        field = field === 'id' ? '_id' : field;
        if (field[0] === '-') {
            obj[field.substr(1)] = -1;
        } else {
            obj[field[0] === '+' ? field.substr(1) : field] = 1;
        }
    })

    return obj;
}

export function createMongoProjectionObject(fields: string[]) {
    return createMongoObject(fields, 1, true);
}

export function createMongoUnsetObject(fields: string[]) {
    return createMongoObject(fields, "");
}

function createMongoObject(fields: string[], value: number | boolean | "", setMongoId?: boolean) {
    const obj: { [index: string]: any } = {};
    fields.forEach(field => {
        const prop = field === 'id' ? '_id' : field;
        obj[prop] = value;
    })

    if (setMongoId) {
        obj['_id'] = value;
    }

    return obj;
}
