import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import * as mammoth from 'mammoth';

import { openai } from '../lib/openai';

@Controller('knowledge')
export class KnowledgeController {

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {

    // Extract text from DOCX
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    const text = result.value;

    // Chunk text
    const chunks = text.match(/[\s\S]{1,500}/g) || [];

    // Create embedding for first chunk
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
input: chunks[0] || '',
    });

    console.log(embedding.data[0].embedding.length);

    return {
      message: 'Embedding created successfully',
      totalChunks: chunks.length,
      embeddingDimensions: embedding.data[0].embedding.length,
    };
  }
}