// Every setting the server reads from the environment, with local defaults.
module.exports = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews',
  port: Number(process.env.PORT ?? 3001),
};
