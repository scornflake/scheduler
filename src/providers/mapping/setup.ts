import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "./orm-mapper";
import {LoggingService} from "ionic-logging-service";

export function setupOrmMapper(logService: LoggingService): OrmMapper {
    if (logService == null) {
        throw new Error('No LoggingService provided?!');
    }
    let mapper = new OrmMapper(logService);
    mapper.addConfiguration(scheduler_db_map);
    return mapper;
}

