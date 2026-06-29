import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TripsModule } from '../trips/trips.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [forwardRef(() => TripsModule), RagModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
