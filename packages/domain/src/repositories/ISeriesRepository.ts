import { SermonSeriesEntity } from '../entities/SermonSeries';

export interface ISeriesRepository {
    create(series: SermonSeriesEntity): Promise<SermonSeriesEntity>;
    update(series: SermonSeriesEntity): Promise<SermonSeriesEntity>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<SermonSeriesEntity | null>;
    findByUserId(userId: string): Promise<SermonSeriesEntity[]>;
}
