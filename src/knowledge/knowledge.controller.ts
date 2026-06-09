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

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';

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
    const fileName = `${uuidv4()}-${file.originalname}`;

const { error: uploadError } = await supabase.storage
  .from('knowledge-files')
  .upload(fileName, file.buffer, {
    contentType: file.mimetype,
  });

if (uploadError) {
  throw uploadError;
}

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
  file_name: file.originalname,
  client_id: clientId,
}
          },
        ],
      });
    }

    // Save file metadata in Supabase
   const { data: knowledgeFile, error: knowledgeFileError } =
  await supabase
    .from('knowledge_files')
    .insert([
      {
        client_id: clientId,
        file_name: file.originalname,
        file_url: '',
        qdrant_collection: collectionName,
        storage_path: fileName,
        summary: text.substring(0, 500),
      },
    ])
    .select()
    .single();

if (knowledgeFileError) {
  throw knowledgeFileError;
}

const { error: textError } = await supabase
  .from('knowledge_file_text')
  .insert([
    {
      file_id: knowledgeFile.id,
      extracted_text: text,
    },
  ]);

if (textError) {
  throw textError;
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
      limit: 50,
    });

    // Build context
   const chunkTexts = searchResult.map(
  (item: any, index: number) =>
    `Chunk ${index + 1}:\n${item.payload?.text}`,
);

const rerankResponse = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  messages: [
    {
      role: 'system',
      content: `
You are a retrieval reranker.

Return only the numbers of the 10 most relevant chunks.

Example:
1,4,7,10
      `,
    },
    {
      role: 'user',
      content: `
Question:
${question}

Chunks:
${chunkTexts.join('\n\n')}
      `,
    },
  ],
});

const selectedIndexes =
  (rerankResponse.choices[0].message.content || '')
    .split(',')
    .map((x) => parseInt(x.trim(), 10) - 1)
    .filter((x) => !isNaN(x));

console.log('RERANK RESULT:', selectedIndexes);
const context = selectedIndexes
  .map((i) => searchResult[i]?.payload?.text)
  .filter(Boolean)
  .join('\n');

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

    return {
      client: client.business_name,
      question,
      answer,
    };
  }
}