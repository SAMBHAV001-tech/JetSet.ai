import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';

export interface TripData {
  id: string;
  origin: string;
  destination: string;
  fromDate: string;
  toDate: string;
  budget: string;
  companions: string;
  interests: string[];
  currency: string;
  createdAt: string;
  combinedPlan?: string;
  seasonGuide?: string;
}

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: any) {
    this.ensureDbExists();
  }

  private async ensureDbExists() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS trips (
          id VARCHAR(255) PRIMARY KEY,
          origin TEXT,
          destination TEXT,
          from_date VARCHAR(255),
          to_date VARCHAR(255),
          budget VARCHAR(255),
          companions VARCHAR(255),
          interests TEXT[],
          currency VARCHAR(255) DEFAULT 'USD',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          combined_plan TEXT,
          season_guide TEXT
        );
      `);
      this.logger.log('Successfully initialized Supabase trips table: trips');
    } catch (err: any) {
      this.logger.error(`Failed to initialize Supabase trips table: ${err.message}`);
    }
  }

  async createTrip(tripData: Partial<TripData>): Promise<TripData> {
    // Generate UUID-like unique identifier
    const rand = Math.random().toString(36).substring(2, 9);
    const time = Date.now().toString(36);
    const tripId = `${rand}-${time}`;

    const newTrip: TripData = {
      id: tripId,
      origin: tripData.origin || '',
      destination: tripData.destination || '',
      fromDate: tripData.fromDate || '',
      toDate: tripData.toDate || '',
      budget: tripData.budget || '',
      companions: tripData.companions || '',
      interests: tripData.interests || [],
      currency: tripData.currency || 'USD',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.pool.query(
        `INSERT INTO trips (id, origin, destination, from_date, to_date, budget, companions, interests, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newTrip.id,
          newTrip.origin,
          newTrip.destination,
          newTrip.fromDate,
          newTrip.toDate,
          newTrip.budget,
          newTrip.companions,
          newTrip.interests,
          newTrip.currency,
          newTrip.createdAt,
        ],
      );
      return newTrip;
    } catch (err: any) {
      this.logger.error(`Failed to insert trip ${tripId} in database: ${err.message}`);
      throw err;
    }
  }

  async getTrip(id: string): Promise<TripData> {
    try {
      const res = await this.pool.query('SELECT * FROM trips WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        throw new NotFoundException(`Trip plan with ID ${id} not found`);
      }
      const row = res.rows[0];
      return {
        id: row.id,
        origin: row.origin,
        destination: row.destination,
        fromDate: row.from_date,
        toDate: row.to_date,
        budget: row.budget,
        companions: row.companions,
        interests: row.interests || [],
        currency: row.currency,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        combinedPlan: row.combined_plan || undefined,
        seasonGuide: row.season_guide || undefined,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to fetch trip ${id} from database: ${err.message}`);
      throw err;
    }
  }

  async updateTrip(id: string, updates: Partial<TripData>): Promise<TripData> {
    const current = await this.getTrip(id);
    const merged = { ...current, ...updates };

    try {
      await this.pool.query(
        `UPDATE trips
         SET origin = $1, destination = $2, from_date = $3, to_date = $4, budget = $5,
             companions = $6, interests = $7, currency = $8, combined_plan = $9, season_guide = $10
         WHERE id = $11`,
        [
          merged.origin,
          merged.destination,
          merged.fromDate,
          merged.toDate,
          merged.budget,
          merged.companions,
          merged.interests,
          merged.currency,
          merged.combinedPlan || null,
          merged.seasonGuide || null,
          id,
        ],
      );
      return merged;
    } catch (err: any) {
      this.logger.error(`Failed to update trip ${id} in database: ${err.message}`);
      throw err;
    }
  }
}
