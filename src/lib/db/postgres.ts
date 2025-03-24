import { Pool, PoolConfig } from 'pg';

export class PostgresClient {
  private pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ...config,
    });
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query(text: string, params: unknown[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(text, params);
    } finally {
      client.release();
    }
  }
} 