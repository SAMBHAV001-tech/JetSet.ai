import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { TripsModule } from '../trips/trips.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [HttpModule, TripsModule, AiModule],
    controllers: [FlightsController],
    providers: [FlightsService],
    exports: [FlightsService],
})
export class FlightsModule { }
