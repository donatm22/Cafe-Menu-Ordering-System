import postgres from 'postgres'

let sqlClient

export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add your Supabase PostgreSQL connection string to server/.env.')
  }

  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, {
      prepare: false,
      ssl: 'require',
    })
  }

  return sqlClient
}

export const checkDbConnection = async () => {
  const sql = getDb()
  await sql`select 1`
}

export const closeDb = async () => {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 })
    sqlClient = undefined
  }
}
