import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { supabase } from '../lib/supabase';
import { openai } from '../lib/openai';
import { qdrant } from '../lib/qdrant';

@Controller('whatsapp')
export class WhatsappController {

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {

    const VERIFY_TOKEN = 'whatsappsaas123';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return challenge;
    }

    return 'Verification failed';
  }

  @Post('webhook')
  async receiveMessage(@Body() body: any) {

    const phoneNumberId =
      body.entry[0].changes[0].value.metadata.phone_number_id;

    const question =
      body.entry[0].changes[0].value.messages[0].text.body;

    console.log('Phone Number ID:', phoneNumberId);

    console.log('Question:', question);

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .single();

    console.log(client);

    console.log(client?.qdrant_collection);

    try {
      console.log(process.env.OPENAI_API_KEY);

      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: question,
      });
console.log('Embedding created');
      const searchResult = await qdrant.search(
        client.qdrant_collection,
        {
          vector: embedding.data[0].embedding,
          limit: 3,
        },
      );

      console.log(JSON.stringify(searchResult, null, 2));

    } catch (error) {

      console.log(error);

    }

    return 'EVENT_RECEIVED';
  }
}