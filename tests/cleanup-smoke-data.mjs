import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('server/rifas.sqlite');

db.exec('PRAGMA foreign_keys=OFF');
db.exec("DELETE FROM ledger WHERE reservation_id IN (SELECT id FROM reservations WHERE raffle_id IN (SELECT id FROM raffles WHERE title LIKE 'Smoke Rifa%'))");
db.exec("DELETE FROM email_outbox WHERE email LIKE 'smoke-%@businessrifa.local' OR subject LIKE '%Smoke%'");
db.exec("DELETE FROM reservations WHERE raffle_id IN (SELECT id FROM raffles WHERE title LIKE 'Smoke Rifa%')");
db.exec("DELETE FROM raffles WHERE title LIKE 'Smoke Rifa%'");
db.exec("DELETE FROM users WHERE email LIKE 'smoke-%@businessrifa.local'");
db.exec('PRAGMA foreign_keys=ON');
db.close();

console.log('Smoke test data cleaned.');

