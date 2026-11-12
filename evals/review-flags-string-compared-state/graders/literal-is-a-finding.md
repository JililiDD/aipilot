---
type: llm
---

PASS only if both of these are true. First, the review reports as a finding that `exportOrders` compares the order status with a string literal instead of the existing `OrderStatus` enum. Second, the verdict of the review is fail. A review that passes the change is a FAIL.
