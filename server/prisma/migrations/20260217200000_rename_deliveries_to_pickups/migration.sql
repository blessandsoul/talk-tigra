-- Rename deliveries table to pickups
RENAME TABLE `deliveries` TO `pickups`;

-- Rename delivery_day column to pickup_day
ALTER TABLE `pickups` CHANGE COLUMN `delivery_day` `pickup_day` INT NOT NULL;
