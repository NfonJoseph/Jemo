/**
 * Status Transition Helper
 * 
 * Centralized logic for validating status transitions across the application.
 * This ensures consistent validation for orders and delivery jobs.
 */

import { OrderStatus, DeliveryJobStatus, DeliveryType } from "@prisma/client";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

// ============================================================================
// ORDER STATUS TRANSITIONS
// ============================================================================

/**
 * Valid order status transitions by actor role
 */
export const ORDER_TRANSITIONS = {
  /**
   * Transitions that vendors can perform
   */
  vendor: {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
    [OrderStatus.IN_TRANSIT]: [], // Cannot transition - delivery handles this
    [OrderStatus.DELIVERED]: [],  // Cannot transition - customer confirms
    [OrderStatus.COMPLETED]: [],  // Terminal state
    [OrderStatus.CANCELLED]: [],  // Terminal state
  } as Record<OrderStatus, OrderStatus[]>,

  /**
   * Transitions that customers can perform
   * Flow: PENDING → CONFIRMED → IN_TRANSIT → DELIVERED → COMPLETED
   */
  customer: {
    [OrderStatus.PENDING]: [OrderStatus.CANCELLED], // Can cancel pending orders
    [OrderStatus.CONFIRMED]: [OrderStatus.CANCELLED], // Can cancel confirmed orders
    [OrderStatus.IN_TRANSIT]: [], // Cannot transition - wait for delivery
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED], // Can mark received (both delivery methods)
    [OrderStatus.COMPLETED]: [], // Terminal state
    [OrderStatus.CANCELLED]: [], // Terminal state
  } as Record<OrderStatus, OrderStatus[]>,

  /**
   * Transitions that delivery agencies can trigger on orders
   */
  agency: {
    [OrderStatus.PENDING]: [],
    [OrderStatus.CONFIRMED]: [OrderStatus.IN_TRANSIT], // When agency accepts job
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED], // When agency delivers
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  } as Record<OrderStatus, OrderStatus[]>,

  /**
   * Transitions that admin can perform
   */
  admin: {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [], // Cannot undo completion
    [OrderStatus.CANCELLED]: [], // Cannot undo cancellation
  } as Record<OrderStatus, OrderStatus[]>,
};

/**
 * Error messages for invalid order transitions (keys for frontend translation)
 */
export const ORDER_TRANSITION_ERRORS = {
  [OrderStatus.PENDING]: {
    default: "ORDER_MUST_BE_PENDING",
    hint: "This action requires the order to be in PENDING status.",
  },
  [OrderStatus.CONFIRMED]: {
    default: "ORDER_MUST_BE_CONFIRMED",
    hint: "This action requires the order to be in CONFIRMED status.",
  },
  [OrderStatus.IN_TRANSIT]: {
    default: "ORDER_MUST_BE_IN_TRANSIT",
    hint: "This action requires the order to be in IN_TRANSIT status.",
  },
  [OrderStatus.DELIVERED]: {
    default: "ORDER_MUST_BE_DELIVERED",
    hint: "This action requires the order to be in DELIVERED status.",
  },
  [OrderStatus.COMPLETED]: {
    default: "ORDER_ALREADY_COMPLETED",
    hint: "This order has already been completed.",
  },
  [OrderStatus.CANCELLED]: {
    default: "ORDER_ALREADY_CANCELLED",
    hint: "This order has already been cancelled.",
  },
};

/**
 * Validate an order status transition
 * @throws BadRequestException if transition is not allowed
 */
export function validateOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  actor: "vendor" | "customer" | "agency" | "admin",
  context?: { deliveryMethod?: DeliveryType }
): void {
  const allowedTransitions = ORDER_TRANSITIONS[actor][currentStatus];

  if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
    throw new BadRequestException({
      code: "INVALID_ORDER_TRANSITION",
      message: `Cannot transition order from ${currentStatus} to ${targetStatus}.`,
      currentStatus,
      targetStatus,
      actor,
      allowedTransitions: allowedTransitions || [],
    });
  }

  // Special case: Customer marking as received - requires DELIVERED status for all delivery methods
  // Updated flow: PENDING → CONFIRMED → IN_TRANSIT → DELIVERED → (customer marks received) → COMPLETED
  if (actor === "customer" && targetStatus === OrderStatus.COMPLETED) {
    if (currentStatus !== OrderStatus.DELIVERED) {
      const deliveryMethod = context?.deliveryMethod || DeliveryType.VENDOR_DELIVERY;
      const message = deliveryMethod === DeliveryType.JEMO_RIDER
        ? "For Jemo Delivery orders, you can only mark as received after the delivery agency confirms delivery."
        : "For vendor delivery orders, you can only mark as received after the vendor marks the order as delivered.";
      
      throw new BadRequestException({
        code: "INVALID_RECEIVED_TRANSITION",
        message,
        currentStatus,
        requiredStatus: OrderStatus.DELIVERED,
      });
    }
  }
}

/**
 * Check if an order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING || status === OrderStatus.CONFIRMED;
}

/**
 * Validate order cancellation
 * @throws BadRequestException if cancellation is not allowed
 */
export function validateOrderCancellation(
  currentStatus: OrderStatus,
  actor: "vendor" | "customer" | "admin"
): void {
  if (!canCancelOrder(currentStatus)) {
    throw new BadRequestException({
      code: "CANNOT_CANCEL_ORDER",
      message: `Cannot cancel order with status ${currentStatus}. Only PENDING or CONFIRMED orders can be cancelled.`,
      currentStatus,
      allowedStatuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
    });
  }
}

// ============================================================================
// DELIVERY JOB STATUS TRANSITIONS
// ============================================================================

/**
 * Valid delivery job status transitions
 */
export const JOB_TRANSITIONS = {
  /**
   * Transitions that agencies can perform
   */
  agency: {
    [DeliveryJobStatus.OPEN]: [DeliveryJobStatus.ACCEPTED],
    [DeliveryJobStatus.ACCEPTED]: [DeliveryJobStatus.DELIVERED],
    [DeliveryJobStatus.DELIVERED]: [], // Terminal state
    [DeliveryJobStatus.CANCELLED]: [], // Terminal state
  } as Record<DeliveryJobStatus, DeliveryJobStatus[]>,

  /**
   * Transitions that vendors/system can perform
   */
  system: {
    [DeliveryJobStatus.OPEN]: [DeliveryJobStatus.CANCELLED],
    [DeliveryJobStatus.ACCEPTED]: [DeliveryJobStatus.CANCELLED],
    [DeliveryJobStatus.DELIVERED]: [],
    [DeliveryJobStatus.CANCELLED]: [],
  } as Record<DeliveryJobStatus, DeliveryJobStatus[]>,

  /**
   * Transitions that admin can perform
   */
  admin: {
    [DeliveryJobStatus.OPEN]: [DeliveryJobStatus.ACCEPTED, DeliveryJobStatus.CANCELLED],
    [DeliveryJobStatus.ACCEPTED]: [DeliveryJobStatus.DELIVERED, DeliveryJobStatus.CANCELLED],
    [DeliveryJobStatus.DELIVERED]: [],
    [DeliveryJobStatus.CANCELLED]: [],
  } as Record<DeliveryJobStatus, DeliveryJobStatus[]>,
};

/**
 * Validate a delivery job status transition
 * @throws BadRequestException if transition is not allowed
 */
export function validateJobTransition(
  currentStatus: DeliveryJobStatus,
  targetStatus: DeliveryJobStatus,
  actor: "agency" | "system" | "admin"
): void {
  const allowedTransitions = JOB_TRANSITIONS[actor][currentStatus];

  if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
    throw new BadRequestException({
      code: "INVALID_JOB_TRANSITION",
      message: `Cannot transition job from ${currentStatus} to ${targetStatus}.`,
      currentStatus,
      targetStatus,
      actor,
      allowedTransitions: allowedTransitions || [],
    });
  }
}

/**
 * Check if a job can be accepted
 */
export function canAcceptJob(status: DeliveryJobStatus, agencyId: string | null): { 
  canAccept: boolean; 
  reason?: string;
  code?: string;
} {
  if (status !== DeliveryJobStatus.OPEN) {
    return {
      canAccept: false,
      reason: `Job is not available for acceptance. Current status: ${status}.`,
      code: "JOB_NOT_OPEN",
    };
  }

  if (agencyId !== null) {
    return {
      canAccept: false,
      reason: "Job has already been assigned to another agency.",
      code: "JOB_ALREADY_ASSIGNED",
    };
  }

  return { canAccept: true };
}

/**
 * Validate job acceptance
 * @throws BadRequestException or ConflictException if acceptance is not allowed
 */
export function validateJobAcceptance(
  status: DeliveryJobStatus,
  agencyId: string | null
): void {
  const result = canAcceptJob(status, agencyId);
  
  if (!result.canAccept) {
    // Use 409 Conflict for "already taken" scenario
    if (result.code === "JOB_ALREADY_ASSIGNED") {
      const ConflictException = require("@nestjs/common").ConflictException;
      throw new ConflictException({
        code: result.code,
        message: result.reason,
      });
    }
    
    throw new BadRequestException({
      code: result.code,
      message: result.reason,
    });
  }
}

/**
 * Check if agency can update job status
 */
export function validateAgencyCanUpdateJob(
  jobAgencyId: string | null,
  requestingAgencyId: string
): void {
  if (jobAgencyId !== requestingAgencyId) {
    throw new ForbiddenException({
      code: "NOT_ASSIGNED_AGENCY",
      message: "You can only update jobs assigned to your agency.",
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get human-readable status label (for logging, not UI)
 */
export function getStatusLabel(status: OrderStatus | DeliveryJobStatus): string {
  const labels: Record<string, string> = {
    // Order statuses
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    IN_TRANSIT: "In Transit",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    // Job statuses
    OPEN: "Open",
    ACCEPTED: "Accepted",
  };

  return labels[status] || status;
}

/**
 * Check if an order is in a terminal state
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED;
}

/**
 * Check if a job is in a terminal state
 */
export function isTerminalJobStatus(status: DeliveryJobStatus): boolean {
  return status === DeliveryJobStatus.DELIVERED || status === DeliveryJobStatus.CANCELLED;
}
