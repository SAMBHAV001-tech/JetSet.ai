import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeAndHash } from '../common/normalize';

interface DocumentChunk {
  filePath: string;
  content: string;
  embedding?: number[];
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private chunks: DocumentChunk[] = [];
  private hasApiKey = false;
  private hasChroma = false;
  private chromaUrl = 'http://localhost:8000/api/v1';
  private collectionId = '';
  private readonly inFlightRequests = new Map<string, Promise<string[]>>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim() !== '') {
      this.hasApiKey = true;
      this.logger.log('Google Gemini API initialized for RAG');
    } else {
      this.logger.warn('GEMINI_API_KEY not found in environment or is empty. RAG will fallback to keyword search.');
    }

    // Try ChromaDB heartbeat
    try {
      const res = await fetch(`${this.chromaUrl}/heartbeat`);
      if (res.ok) {
        this.hasChroma = true;
        this.logger.log('ChromaDB active heartbeat detected.');
        await this.initChromaCollection();
      }
    } catch (e: any) {
      this.logger.warn(`ChromaDB heartbeat failed: ${e.message}. RAG will fallback to local memory vector store.`);
    }

    await this.loadAndIndexDocuments();
  }

  private async initChromaCollection() {
    try {
      const res = await fetch(`${this.chromaUrl}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'travel_guides',
          metadata: { 'hnsw:space': 'cosine' },
          get_or_create: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        this.collectionId = data.id;
        this.logger.log(`ChromaDB Collection 'travel_guides' initialized with ID: ${this.collectionId}`);
      } else {
        this.hasChroma = false;
        this.logger.warn(`Failed to initialize ChromaDB collection: ${res.statusText}`);
      }
    } catch (e: any) {
      this.hasChroma = false;
      this.logger.warn(`ChromaDB collection setup error: ${e.message}`);
    }
  }

  async loadAndIndexDocuments() {
    const pathsToTry = [
      path.join(process.cwd(), 'src', 'rag', 'documents'),
      path.join(__dirname, 'documents'),
    ];

    let docsDir = '';
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        docsDir = p;
        break;
      }
    }

    if (!docsDir) {
      docsDir = pathsToTry[1]; // default to build folder
      fs.mkdirSync(docsDir, { recursive: true });
    }

    this.logger.log(`Loading documents from: ${docsDir}`);

    let files: string[] = [];
    try {
      files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
    } catch (err) {
      this.logger.error(`Failed to read documents directory: ${docsDir}`);
    }

    this.logger.log(`Found ${files.length} documents for RAG indexing.`);

    const loadedChunks: DocumentChunk[] = [];

    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const text = fs.readFileSync(filePath, 'utf-8');
      
      const sections = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
      
      for (const section of sections) {
        loadedChunks.push({
          filePath: file,
          content: section
        });
      }
    }

    this.chunks = loadedChunks;

    if (this.hasChroma && this.collectionId && this.chunks.length > 0) {
      try {
        this.logger.log(`Indexing ${this.chunks.length} chunks into ChromaDB...`);
        const ids: string[] = [];
        const embeddings: number[][] = [];
        const documents: string[] = [];
        const metadatas: any[] = [];

        for (let i = 0; i < this.chunks.length; i++) {
          const chunk = this.chunks[i];
          const emb = await this.generateEmbedding(chunk.content);
          chunk.embedding = emb;

          ids.push(`chunk-${i}`);
          embeddings.push(emb);
          documents.push(chunk.content);
          metadatas.push({ filePath: chunk.filePath });
        }

        const upsertRes = await fetch(`${this.chromaUrl}/collections/${this.collectionId}/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, embeddings, documents, metadatas })
        });
        if (upsertRes.ok) {
          this.logger.log('ChromaDB document indexing complete.');
        } else {
          this.logger.error(`Failed to index documents into ChromaDB: ${upsertRes.statusText}`);
        }
      } catch (error: any) {
        this.logger.error(`Error indexing into ChromaDB: ${error.message}. Falling back to memory RAG.`);
      }
    } else if (this.hasApiKey && this.chunks.length > 0) {
      try {
        this.logger.log(`Generating embeddings for ${this.chunks.length} chunks using Google Gemini...`);
        for (const chunk of this.chunks) {
          chunk.embedding = await this.generateEmbedding(chunk.content);
        }
        this.logger.log('Embedding generation complete.');
      } catch (error: any) {
        this.logger.error(`Error generating embeddings during initialization: ${error.message}`);
        this.hasApiKey = false; // Fallback to keyword search on query
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => 'unknown error');
          // If it's a transient rate limit (429) or server error (5xx), we retry. Otherwise fail.
          if (res.status === 429 || res.status >= 500) {
            this.logger.warn(`Google Gemini Embeddings API returned status ${res.status}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
          throw new Error(`Google Gemini Embeddings API error: ${res.statusText} (${errText})`);
        }

        const data = await res.json();
        if (!data.embedding || !data.embedding.values) {
          throw new Error('Malformed response from Google Gemini embeddings API');
        }

        return data.embedding.values;
      } catch (error: any) {
        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        this.logger.warn(`Failed to fetch embedding: ${error.message}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
    throw new Error('Failed to generate embedding after maximum retries');
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async retrieveContext(query: string, limit: number = 3): Promise<string[]> {
    if (this.chunks.length === 0) {
      await this.loadAndIndexDocuments();
    }

    if (this.chunks.length === 0) {
      return [];
    }

    const cacheKey = normalizeAndHash('rag_retrieval', { query, limit });
    const cachedData = await this.cacheManager.get(cacheKey) as string[];
    if (cachedData) {
      this.logger.debug('Returning cached RAG context retrieval results');
      return cachedData;
    }

    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      this.logger.debug('Reusing in-flight request for identical RAG query');
      return inFlight;
    }

    const promise = (async () => {
      const results = await this.performRetrieval(query, limit);
      await this.cacheManager.set(cacheKey, results, 86400000); // 24 hours TTL
      return results;
    })();

    this.inFlightRequests.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  private async performRetrieval(query: string, limit: number): Promise<string[]> {
    if (this.hasChroma && this.collectionId) {
      try {
        const queryEmbedding = await this.generateEmbedding(query);
        const queryRes = await fetch(`${this.chromaUrl}/collections/${this.collectionId}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_embeddings: [queryEmbedding],
            n_results: limit
          })
        });

        if (queryRes.ok) {
          const result = await queryRes.json();
          if (result.documents && result.documents[0]) {
            return result.documents[0];
          }
        }
      } catch (error: any) {
        this.logger.error(`ChromaDB query failed: ${error.message}. Falling back to memory vector search.`);
      }
    }

    if (this.hasApiKey) {
      try {
        const queryEmbedding = await this.generateEmbedding(query);
        const scoredChunks = this.chunks
          .filter(chunk => chunk.embedding)
          .map(chunk => ({
            content: chunk.content,
            similarity: this.cosineSimilarity(chunk.embedding!, queryEmbedding)
          }));

        scoredChunks.sort((a, b) => b.similarity - a.similarity);
        return scoredChunks.slice(0, limit).map(c => c.content);
      } catch (error: any) {
        this.logger.error(`Embedding query search failed: ${error.message}. Falling back to keyword search.`);
      }
    }

    // Keyword Fallback
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    const scoredChunks = this.chunks.map(chunk => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      
      if (contentLower.includes(query.toLowerCase())) {
        score += 10;
      }
      
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          score += 2;
        }
      }

      return {
        content: chunk.content,
        score
      };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks
      .filter(c => c.score > 0)
      .slice(0, limit)
      .map(c => c.content);
  }
}
