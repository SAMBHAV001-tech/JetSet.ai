import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { TripsModule } from '../trips/trips.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        TripsModule,
        AiModule,
    ],
    providers: [HotelsService],
    controllers: [HotelsController],
    exports: [HotelsService],
})
export class HotelsModule { }
