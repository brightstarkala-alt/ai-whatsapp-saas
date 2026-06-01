import { Controller, Get, Post, Query, Body } from '@nestjs/common';

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
  receiveMessage(@Body() body: any) {

    console.log(JSON.stringify(body, null, 2));

    return 'EVENT_RECEIVED';
  }
}