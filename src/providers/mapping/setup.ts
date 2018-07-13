import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "./orm-mapper";

export function setupOrmMapper(): OrmMapper {
    let mapper = new OrmMapper();
    mapper.addConfiguration(scheduler_db_map);
    return mapper;
}

