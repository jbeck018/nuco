import { db } from '@/lib/db';
import { AIServiceError } from '../../error';
import { sql, type SQL } from 'drizzle-orm';

/**
 * Postgres configuration interface
 */
export interface PostgresConfig {
  table: string;
  columns?: string[];
  where?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  joins?: {
    table: string;
    condition: string;
    type?: 'inner' | 'left' | 'right' | 'full';
  }[];
}

/**
 * Postgres data source implementation
 */
export class PostgresDataSource {
  private config: PostgresConfig;

  constructor(config: PostgresConfig) {
    this.config = {
      columns: ['*'],
      ...config,
    };
  }

  /**
   * Execute a query
   */
  async execute(): Promise<Record<string, unknown>[]> {
    try {
      // Build the query
      const query = this.buildQuery();

      // Execute the query
      const result = await db.execute(query);
      return result.rows;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to execute Postgres query',
        'custom',
        'postgres_query_error'
      );
    }
  }

  /**
   * Build the SQL query
   */
  private buildQuery(): SQL {
    const { table, columns, where, orderBy, limit, offset, joins } = this.config;

    // Start with SELECT
    let query = sql`SELECT ${sql.join(columns!.map(col => sql.raw(col)), sql`, `)} FROM ${sql.raw(table)}`;

    // Add joins if specified
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinType = join.type || 'inner';
        query = sql`${query} ${sql.raw(joinType.toUpperCase())} JOIN ${sql.raw(join.table)} ON ${sql.raw(join.condition)}`;
      }
    }

    // Add WHERE clause if specified
    if (where) {
      query = sql`${query} WHERE ${sql.raw(where)}`;
    }

    // Add ORDER BY if specified
    if (orderBy) {
      query = sql`${query} ORDER BY ${sql.raw(orderBy)}`;
    }

    // Add LIMIT if specified
    if (limit) {
      query = sql`${query} LIMIT ${limit}`;
    }

    // Add OFFSET if specified
    if (offset) {
      query = sql`${query} OFFSET ${offset}`;
    }

    return query;
  }

  /**
   * Get count of records
   */
  async getCount(): Promise<number> {
    try {
      const { table, where, joins } = this.config;

      // Start with SELECT COUNT
      let query = sql`SELECT COUNT(*) as count FROM ${sql.raw(table)}`;

      // Add joins if specified
      if (joins && joins.length > 0) {
        for (const join of joins) {
          const joinType = join.type || 'inner';
          query = sql`${query} ${sql.raw(joinType.toUpperCase())} JOIN ${sql.raw(join.table)} ON ${sql.raw(join.condition)}`;
        }
      }

      // Add WHERE clause if specified
      if (where) {
        query = sql`${query} WHERE ${sql.raw(where)}`;
      }

      // Execute the query
      const result = await db.execute(query);
      return Number(result.rows[0]?.count ?? 0);
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to get Postgres count',
        'custom',
        'postgres_count_error'
      );
    }
  }

  /**
   * Get distinct values for a column
   */
  async getDistinct(column: string): Promise<unknown[]> {
    try {
      const { table, where } = this.config;

      // Build the query
      let query = sql`SELECT DISTINCT ${sql.raw(column)} FROM ${sql.raw(table)}`;

      // Add WHERE clause if specified
      if (where) {
        query = sql`${query} WHERE ${sql.raw(where)}`;
      }

      // Execute the query
      const result = await db.execute(query);
      return result.rows.map((row: Record<string, unknown>) => row[column]);
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to get distinct values',
        'custom',
        'postgres_distinct_error'
      );
    }
  }
} 