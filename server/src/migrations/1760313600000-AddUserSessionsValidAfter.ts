import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionsValidAfter1760313600000 implements MigrationInterface {
  name = 'AddUserSessionsValidAfter1760313600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "sessionsValidAfter" TIMESTAMPTZ;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "sessionsValidAfter";`,
    );
  }
}
