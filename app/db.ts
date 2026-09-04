import { neon } from "@neondatabase/serverless"

export const sql = neon(process.env.POSTGRES_URL!)

export async function checkDatabase() {
  const result = await sql`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'payment_methods'
      ) AS payment_methods_exists
  `

  return result[0]
}
