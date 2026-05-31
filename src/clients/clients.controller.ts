import { Controller, Get, Post, Body } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async getClients() {
    return this.clientsService.getClients();
  }
  @Post()
create(@Body() body: any) {
  return this.clientsService.create(body);
}
}