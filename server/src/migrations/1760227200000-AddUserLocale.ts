import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocale1760227200000 implements MigrationInterface {
  name = 'AddUserLocale1760227200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locale" varchar(8);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "locale";`,
    );
  }
}
