import { MigrationInterface, QueryRunner } from "typeorm";

export class InitUserAndStorage1701619200000 implements MigrationInterface {
  name = 'InitUserAndStorage1701619200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure "user" table exists (quoted because user is a reserved word)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL PRIMARY KEY,
        "email" varchar(255) NOT NULL UNIQUE,
        "passwordHash" varchar(255),
        "name" varchar(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Drop legacy storage table to avoid FK issues, then recreate with proper constraints
    await queryRunner.query(`DROP TABLE IF EXISTS "storage" CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE "storage" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "payload" jsonb NOT NULL,
        CONSTRAINT "UQ_storage_user_year_month" UNIQUE ("userId", "year", "month"),
        CONSTRAINT "FK_1b6226fd0003dbe26f809118849" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "storage";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user";`);
  }
}
