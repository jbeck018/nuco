/**
 * Base Generator
 * 
 * Provides core functionality for deterministic data generation based on organization ID.
 * All specific generators will extend this base class.
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GeneratorOptions {
  organizationId: string;
  baseDir?: string;
  seed?: string;
}

export class BaseGenerator {
  protected organizationId: string;
  protected baseDir: string;
  protected seed: string;
  protected random: () => number;

  constructor(options: GeneratorOptions) {
    this.organizationId = options.organizationId;
    this.baseDir = options.baseDir || path.join(__dirname, 'data');
    
    // Use organization ID as seed if not provided
    this.seed = options.seed || this.organizationId;
    
    // Initialize deterministic random function
    this.random = this.createRandomGenerator(this.seed);
    
    // Ensure data directories exist
    this.initializeDataDirectories();
  }

  /**
   * Create a deterministic random number generator based on seed
   */
  protected createRandomGenerator(seed: string): () => number {
    // Simple implementation of seeded random number generator
    // For production, consider using a more robust library like seedrandom
    let s = Array.from(seed).reduce((a, b) => {
      return a + b.charCodeAt(0);
    }, 0);
    
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * Generate a deterministic UUID based on input string and seed
   */
  protected generateDeterministicId(input: string): string {
    const combinedSeed = `${this.seed}-${input}`;
    // In a real implementation, use a proper deterministic UUID generator
    // This is a simplified version for demonstration
    const hash = Array.from(combinedSeed).reduce((a, b, i) => {
      return (a + b.charCodeAt(0) * (i + 1)) % 2147483647;
    }, 0);
    
    this.random = this.createRandomGenerator(hash.toString());
    
    // Generate 16 random bytes based on the hash
    const bytes = Array.from({ length: 16 }, () => Math.floor(this.random() * 256));
    
    // Format as UUID
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant
    
    const hexBytes = bytes.map(b => b.toString(16).padStart(2, '0'));
    
    return [
      hexBytes.slice(0, 4).join(''),
      hexBytes.slice(4, 6).join(''),
      hexBytes.slice(6, 8).join(''),
      hexBytes.slice(8, 10).join(''),
      hexBytes.slice(10, 16).join('')
    ].join('-');
  }

  /**
   * Initialize the directory structure for data storage
   */
  protected initializeDataDirectories(): void {
    const orgDir = path.join(this.baseDir, this.organizationId);
    const baseDir = path.join(orgDir, 'base');
    const changesDir = path.join(orgDir, 'changes');
    const snapshotsDir = path.join(orgDir, 'snapshots');
    
    fs.ensureDirSync(orgDir);
    fs.ensureDirSync(baseDir);
    fs.ensureDirSync(changesDir);
    fs.ensureDirSync(snapshotsDir);
  }

  /**
   * Save data to JSON file
   */
  protected saveToJson(data: any, filename: string): void {
    const orgDir = path.join(this.baseDir, this.organizationId);
    const filePath = path.join(orgDir, filename);
    
    fs.writeJsonSync(filePath, data, { spaces: 2 });
  }

  /**
   * Load data from JSON file
   */
  protected loadFromJson(filename: string): any {
    const orgDir = path.join(this.baseDir, this.organizationId);
    const filePath = path.join(orgDir, filename);
    
    if (fs.existsSync(filePath)) {
      return fs.readJsonSync(filePath);
    }
    
    return null;
  }

  /**
   * Pick a random item from an array
   */
  protected pickRandom<T>(items: T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }

  /**
   * Get a random integer between min and max (inclusive)
   */
  protected getRandomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Get a random date between start and end
   */
  protected getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + this.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Generate a random boolean with given probability
   */
  protected randomBoolean(probability = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Generate a random name
   */
  protected generateName(prefix: string): string {
    const adjectives = ['Global', 'Advanced', 'Innovative', 'Premium', 'Elite', 'Strategic', 'Dynamic', 'Modern'];
    const nouns = ['Solutions', 'Systems', 'Technologies', 'Services', 'Industries', 'Enterprises', 'Consulting'];
    
    return `${this.pickRandom(adjectives)} ${prefix} ${this.pickRandom(nouns)}`;
  }
}