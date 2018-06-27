import {IObjectStore, IReferenceResolver} from "../mapping/orm-mapper-type";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {IObjectCache} from "../mapping/cache";
import {OrmUtils} from "./orm-utils";
import {OrmConverterWriter} from "./orm-converter-writer";
import {OrmConverterReader} from "./orm-converter-reader";

class OrmConverter {
    private logger: Logger;

    private utils: OrmUtils;
    private _writer: OrmConverterWriter;
    private _reader: OrmConverterReader;

    constructor(private _mapper: OrmMapper,
                private _loader: IObjectStore,
                private _cache: IObjectCache = null,
                private _resolver: IReferenceResolver) {
        this.logger = LoggingWrapper.getLogger('orm');
        this.utils = new OrmUtils(this.logger);

        this._writer = new OrmConverterWriter(this._mapper, this._loader);
        this._reader = new OrmConverterReader(this._mapper, this._resolver, this._cache);
    }

    get writer(): OrmConverterWriter {
        return this._writer;
    }

    get reader(): OrmConverterReader {
        return this._reader;
    }

    get mapper(): OrmMapper {
        return this._mapper;
    }

    get cache(): IObjectCache {
        return this._cache;
    }

    set cache(value: IObjectCache) {
        this._cache = value;
        this._reader.setCache(value);
    }
}

export {
    OrmConverter
}