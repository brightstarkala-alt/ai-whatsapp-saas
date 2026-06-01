import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KnowledgeController } from './knowledge/knowledge.controller';
import { WhatsappController } from './whatsapp/whatsapp.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    KnowledgeController,
    WhatsappController,
  ],
  providers: [AppService],
})
export class AppModule {}