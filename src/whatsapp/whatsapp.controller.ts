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

@Post('webhook')
async receiveMessage(@Body() body: any) {

  const phoneNumberId =
    body.entry[0].changes[0].value.metadata.phone_number_id;

  const question =
    body.entry[0].changes[0].value.messages[0].text.body;

  console.log('Phone Number ID:', phoneNumberId);

  console.log('Question:', question);

  return 'EVENT_RECEIVED';
}
    return 'EVENT_RECEIVED';
  }
}