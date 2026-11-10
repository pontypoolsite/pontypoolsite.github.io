ALTER TABLE storefront_orders
  DROP CONSTRAINT IF EXISTS storefront_orders_preferred_delivery_time_check;

ALTER TABLE storefront_orders
  ADD CONSTRAINT storefront_orders_preferred_delivery_time_check
  CHECK (
    preferred_delivery_time IN ('09:00-12:00', '12:00-15:00', '15:00-18:00')
    OR preferred_delivery_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );
