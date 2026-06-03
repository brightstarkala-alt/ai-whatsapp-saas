import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import * as mammoth from 'mammoth';

import { openai } from '../lib/openai';
import { qdrant } from '../lib/qdrant';
import { supabase } from '../lib/supabase';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

@Controller('knowledge')
export class KnowledgeController {

  // Upload + Store Embeddings
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {

    const clientId = body.clientId;

    // Fetch client from Supabase
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client) {
      return {
        message: 'Client not found',
      };
    }

    const collectionName = client.qdrant_collection;

    // Extract text from DOCX
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    const text = result.value;

    // LangChain smart chunking

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(text);

    console.log('TOTAL CHUNKS:', chunks.length);

    console.log(chunks);

    // Store embeddings
    for (let i = 0; i < chunks.length; i++) {

      const chunk = chunks[i];

      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk || '',
      });

      await qdrant.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: Date.now() + i,
            vector: embedding.data[0].embedding,
            payload: {
              text: chunk,
            },
          },
        ],
      });
    }

    return {
      message: 'Embeddings stored successfully',
      client: client.business_name,
      collection: collectionName,
      totalChunks: chunks.length,
    };
  }

  // Semantic Search + AI Response
  @Post('search')
  async search(@Body() body: any) {

    const question = body.question;
    const clientId = body.clientId;

    // Fetch client
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client) {
      return {
        message: 'Client not found',
      };
    }

    const collectionName = client.qdrant_collection;

    // Create question embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });

    // Search Qdrant
    const searchResult = await qdrant.search(collectionName, {
      vector: embedding.data[0].embedding,
      limit: 3,
    });

    console.log('SEARCH RESULT:');

    console.log(JSON.stringify(searchResult, null, 2));

    // Build context
    const context = searchResult
      .map((item: any) => item.payload?.text)
      .join('\n');

    console.log('CONTEXT:');

    console.log(context);

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            client.system_prompt ||
            'You are a helpful AI assistant.',
        },
        {
          role: 'user',
          content: `
Answer ONLY using the provided context.

Context:
${context}

Question:
${question}
          `,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    console.log('AI ANSWER:');

    console.log(answer);

    return {
      client: client.business_name,
      question,
      answer,
    };
  }
}