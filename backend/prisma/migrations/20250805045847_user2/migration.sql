/*
  Warnings:

  - A unique constraint covering the columns `[code,delete]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Role_name_key";

-- DropIndex
DROP INDEX "User_phone_delete_key";

-- DropIndex
DROP INDEX "User_email_delete_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_code_delete_key" ON "User"("code", "delete");
