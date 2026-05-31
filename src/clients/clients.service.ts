import { Injectable } from '@nestjs/common';
import { supabase } from '../lib/supabase';
import { qdrant } from '../lib/qdrant';

@Injectable()
export class ClientsService {
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  }
  async create(data: any) {
    await qdrant.createCollection(data.qdrant_collection, {
  vectors: {
    size: 1536,
    distance: 'Cosine',
  },
});
  const { data: client, error } = await supabase
    .from('clients')
    .insert([data])
    .select();

  if (error) throw error;

  return client;
}
}
