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
    const qdrantCollection = `${data.business_name}_collection`
      .toLowerCase()
      .replace(/\s+/g, '_');

  try {
  console.log("Creating Qdrant collection:", qdrantCollection);

  await qdrant.createCollection(qdrantCollection, {
    vectors: {
      size: 1536,
      distance: 'Cosine',
    },
  });

  console.log("Qdrant collection created");
} catch (err) {
  console.error("QDRANT ERROR:", err);
  throw err;
}

    const payload = {
      ...data,
      qdrant_collection: qdrantCollection,
    };

    const { data: client, error } = await supabase
      .from('clients')
      .insert([payload])
      .select();

    if (error) {
      throw error;
    }

    return client;
  }
}