import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KnowledgeController } from './knowledge/knowledge.controller';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [ClientsModule],
  controllers: [
    AppController,
    KnowledgeController,
    WhatsappController,
  ],
  providers: [AppService],
})
export class AppModule {}