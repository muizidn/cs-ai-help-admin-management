import { MongoClient, Db, Collection } from "mongodb"
import { getServerEnv, logEnvVars } from "./env"

// Get environment configuration lazily
function getEnvConfig() {
  const env = getServerEnv()
  logEnvVars()
  return {
    MONGODB_URI: env.MONGODB_URI,
    DATABASE_NAME: env.MONGODB_DATABASE
  }
}

class MongoDB {
  private client: MongoClient | null = null
  private _db: Db | null = null
  get db() {
    return this._db
  }


  async connect(): Promise<void> {
    if (this.client && this._db) {
      return // Already connected
    }

    const { MONGODB_URI, DATABASE_NAME } = getEnvConfig()

    try {
      this.client = new MongoClient(MONGODB_URI)
      await this.client.connect()
      this._db = this.client.db(DATABASE_NAME)

      console.log(`Connected to MongoDB: ${DATABASE_NAME}`)

      // Create indexes for better performance
      await this.createIndexes()
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this._db = null
      console.log("Disconnected from MongoDB")
    }
  }

  private async createIndexes(): Promise<void> { }

  async ensureConnection(): Promise<void> {
    if (!this.client || !this._db) {
      await this.connect()
    }
  }

  isConnected(): boolean {
    return this.client !== null && this._db !== null
  }
}

// Debug logging
const { MONGODB_URI, DATABASE_NAME } = getEnvConfig()
console.log("MONGODBURI", MONGODB_URI)
console.log("DATABASENAME", DATABASE_NAME)

// Singleton instance
export const mongodb = new MongoDB()

export async function getDatabase() {
  await mongodb.ensureConnection()
  return mongodb.db!
}
